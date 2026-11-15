<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

// The type is a real <input> drawn into the canvas with drawElementImage() 
// instead of ctx.fillText(), then the glyphs are painted on the same 2D canvas.
const FONT_FAMILY = "serif";
const ROWS = 120;
const BIG_GLYPH = 0.15; // one cell in ten gets the oversized glyph
const TEXT_FILL = 0.69; // how much of the canvas width the text fills
const SS = 2; // mask supersampling, keeps features thinner than a cell
const GLYPHS = "_= /"; // one picked at random per inked cell
const FLOOR = .6; // height of the reflection, as a share of the type height
const FLOOR_ALPHA = 0.4; // reflection strength: frosted, not a second copy
const RIM_ALPHA = 0.22; // outline around the faint real letters

const canvasEl = ref<HTMLCanvasElement>();
const textEl = ref<HTMLInputElement>();
let rendered = false;
let observer: ResizeObserver | null = null;
let onPaint: (() => void) | null = null;

// HTML-in-Canvas is newer than the bundled TS DOM typings.
type DrawableContext = CanvasRenderingContext2D & {
  drawElementImage(
    element: Element,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
};

// Same guard as AsciiArtCanvas: paint on the first real size, not on mount,
// because the overview grid mounts slides at zero size.
onMounted(() => {
  const box = canvasEl.value!.parentElement!.parentElement!;
  observer = new ResizeObserver(() => {
    if (rendered || !box.clientWidth || !box.clientHeight) return;
    rendered = true;
    observer?.disconnect();
    render();
  });
  observer.observe(box);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (onPaint) canvasEl.value?.removeEventListener("paint", onPaint);
});

// Seeded per cell so a selection only changes the sampled cells, never the
// random glyphs and sizes of the rest of the art.
function random(i: number, salt: number) {
  let h = Math.imul(i ^ salt, 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}

function glyphFor(v: number, i: number) {
  if (v < 50) return "";
  if (v < 100) return ".";
  if (v < 150) return "-";
  if (v < 200) return "+";
  return "_= /"[(random(i, 0x9e3779b9) * GLYPHS.length) | 0];
}

async function render() {
  await document.fonts.load(`bold 100px ${FONT_FAMILY}`).catch(() => []);

  const box = canvasEl.value!.parentElement!.parentElement!;
  const cs = getComputedStyle(box);
  const maxW =
    box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const maxH =
    box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);

  // Square cells, as in the sketch: grid aspect follows the available box.
  const cell = maxH / ROWS;
  const cols = Math.round(maxW / cell);
  const width = cols * cell;

  const canvas = canvasEl.value!;
  const text = textEl.value!;

  // Fit once to the initial text, then keep that size: typing never resizes.
  const measure = document.createElement("canvas").getContext("2d")!;
  let fontSize = 0;
  const fit = () => {
    fontSize = width * 1.2;
    measure.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    const inkW = measure.measureText(text.value || " ").width;
    if (inkW > width * TEXT_FILL) fontSize *= (width * TEXT_FILL) / inkW;
    text.style.fontSize = `${fontSize}px`;
  };

  text.style.width = `${width}px`;
  fit();

  // The canvas keeps extra room below the type for the floor reflection.
  const height = fontSize;
  const floor = height * FLOOR;
  const rows = Math.max(1, Math.round(height / cell));

  text.style.height = `${height}px`;

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height + floor}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round((height + floor) * dpr);
  // Device-pixel split: the type owns the top, the floor the rest.
  const typePx = Math.round(height * dpr);
  const floorPx = canvas.height - typePx;
  // Optically centre the type, not the canvas: the floor is only a ghost below
  // it, so the figure is pushed down by a third of the floor height.
  canvas.parentElement!.style.transform = `translateY(${floor / 3}px)`;

  if (!("drawElementImage" in CanvasRenderingContext2D.prototype)) return;

  const ctx = canvas.getContext("2d") as DrawableContext;
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / (height + floor);

  // Offscreen buffer for the reflection: flipped type, blurred, then faded.
  const mirror = document.createElement("canvas");
  mirror.width = canvas.width;
  mirror.height = floorPx;
  const mirrorContext = mirror.getContext("2d")!;

  // Offscreen buffer for the outline of the real letters: it is built by
  // dilating the type, which needs a canvas of the type area only.
  const rim = document.createElement("canvas");
  rim.width = canvas.width;
  rim.height = typePx;
  const rimContext = rim.getContext("2d")!;
  const rimStep = Math.max(1, Math.round(dpr * 1.5));
  const rimOffsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([x, y]) => [x * rimStep, y * rimStep]);

  // The mask is sampled at SS× the cell grid and max-pooled back down: plain
  // averaging dilutes thin strokes (like the 1px caret) below the threshold.
  const mask = document.createElement("canvas");
  mask.width = cols * SS;
  mask.height = rows * SS;
  const maskContext = mask.getContext("2d", { willReadFrequently: true })!;
  const fill = getComputedStyle(document.documentElement)
    .getPropertyValue("--text")
    .trim();

  function cellValue(data: Uint8ClampedArray, i: number) {
    const left = (i % cols) * SS;
    const top = Math.floor(i / cols) * SS;
    let value = 0;
    for (let y = 0; y < SS; y++) {
      for (let x = 0; x < SS; x++) {
        value = Math.max(value, data[((top + y) * mask.width + left + x) * 4]);
      }
    }
    return value;
  }

  onPaint = () => {
    // Rasterize the live input at full size, then reduce it to the cell grid.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawElementImage(text, 0, 0, canvas.width, typePx);
    // Reset the mask: it must only reflect the type, never the previous paint
    // and never the floor below it.
    maskContext.clearRect(0, 0, mask.width, mask.height);
    maskContext.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      typePx,
      0,
      0,
      mask.width,
      mask.height,
    );
    const { data } = maskContext.getImageData(0, 0, mask.width, mask.height);

    // The floor sits on the type's ink. Scanning pixels would instead follow
    // the selection box and the caret: both fill the whole line box, so they
    // would drag the reflection down. Font metrics stay put.
    measure.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    const metrics = measure.measureText(text.value || " ");
    const baseline =
      (fontSize -
        metrics.fontBoundingBoxAscent -
        metrics.fontBoundingBoxDescent) /
        2 +
      metrics.fontBoundingBoxAscent;
    const seam =
      ((baseline + metrics.actualBoundingBoxDescent) / fontSize) * typePx;
    const band = Math.min(floorPx, seam);

    // Outline of the real letters: dilate the type by a pixel or two, subtract
    // the type from the dilated copy, so only the rim around the letters
    // remains. Build it while the type is still opaque, before tinting.
    rimContext.clearRect(0, 0, rim.width, rim.height);
    for (const [dx, dy] of rimOffsets) {
      rimContext.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        typePx,
        dx,
        dy,
        canvas.width,
        typePx,
      );
    }
    rimContext.globalCompositeOperation = "destination-out";
    rimContext.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      typePx,
      0,
      0,
      canvas.width,
      typePx,
    );
    rimContext.globalCompositeOperation = "source-in";
    rimContext.fillStyle = fill;
    rimContext.fillRect(0, 0, rim.width, rim.height);
    rimContext.globalCompositeOperation = "source-over";

    // Keep the real texture as a faint backdrop to improve legibility: tint what was just drawn with
    // the text colour (source-in keeps only the type's shape), then lay the
    // glyphs over it.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = RIM_ALPHA;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(rim, 0, 0);
    ctx.globalAlpha = 1;
    ctx.scale(scaleX, scaleY);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = fill;

    for (let i = 0; i < cols * rows; i++) {
      const glyph = glyphFor(cellValue(data, i), i);
      if (!glyph) continue;

      const x = (i % cols) * cell + cell * 0.5;
      const y = Math.floor(i / cols) * cell + cell * 0.5;
      const size = random(i, 0x85ebca6b) < BIG_GLYPH ? cell * 6 : cell * 2.5;
      ctx.font = `${size}px ${FONT_FAMILY}`;
      ctx.fillText(glyph, x, y);
    }

    // Frosted floor: mirror the bottom of the type around the seam, blur it,
    // fade it out, then lay it back under the glyphs.
    mirrorContext.clearRect(0, 0, mirror.width, mirror.height);
    mirrorContext.save();
    mirrorContext.filter = `blur(${Math.max(1.5, cell * dpr * 1.2)}px)`;
    mirrorContext.translate(0, seam);
    mirrorContext.scale(1, -1);
    mirrorContext.drawImage(
      canvas,
      0,
      seam - band,
      canvas.width,
      band,
      0,
      seam - band,
      canvas.width,
      band,
    );
    mirrorContext.restore();

    const fade = mirrorContext.createLinearGradient(0, 0, 0, floorPx);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.5, "rgba(0,0,0,.4)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    mirrorContext.globalCompositeOperation = "destination-in";
    mirrorContext.fillStyle = fade;
    mirrorContext.fillRect(0, 0, mirror.width, mirror.height);
    mirrorContext.globalCompositeOperation = "source-over";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = FLOOR_ALPHA;
    ctx.drawImage(mirror, 0, seam);
    ctx.globalAlpha = 1;
  };

  canvas.addEventListener("paint", onPaint);
}
</script>

<template>
  <figure class="ascii-text">
    <canvas ref="canvasEl" content="drawable">
      <input
        ref="textEl"
        class="ascii-text-text"
        drawable
        type="text"
        value="HTML"
        aria-label="Texte affiché en art ASCII"
        autocomplete="off"
        spellcheck="false"
      />
    </canvas>
  </figure>
</template>

<style scoped>
.ascii-text {
  width: fit-content;
  margin: 0 auto;
}

canvas {
  display: block;
  user-select: text;
}

/* Real, selectable text input used as the texture source. */
.ascii-text-text {
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: none;
  appearance: none;
  box-sizing: border-box;
  background: transparent;
  color: #fff;
  font-family: serif;
  font-weight: bold;
  line-height: 1;
  text-align: center;
  user-select: text;
}

/* Sampled into the mask: a near-white highlight maxes out the glyph ramp, so
   the selection reads as a dense block of glyphs instead of faint dots. */
.ascii-text-text::selection {
  background: #555;
}
</style>
