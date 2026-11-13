<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

// Port of the canvas-sketch "type + glyphs" sketch, retuned for the slide:
// same cell grid, type fitting, glyph threshold ramp and glyph sizes.
const TEXT = "YEAH!!";
const FONT_FAMILY = "serif";
const ROWS = 100;
const BIG_GLYPH = 0.1; // one cell in ten gets the oversized glyph

const canvasEl = ref<HTMLCanvasElement>();
let rendered = false;
let observer: ResizeObserver | null = null;

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

onBeforeUnmount(() => observer?.disconnect());

function glyphFor(v: number) {
  if (v < 50) return "";
  if (v < 100) return ".";
  if (v < 150) return "-";
  if (v < 200) return "+";
  return "_= /"[(Math.random() * 4) | 0];
}

async function render() {
  await document.fonts.load(`100px ${FONT_FAMILY}`).catch(() => []);

  const box = canvasEl.value!.parentElement!.parentElement!;
  const cs = getComputedStyle(box);
  const maxW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const maxH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);

  // Square cells, as in the sketch: grid aspect follows the available box.
  const cell = maxH / ROWS;
  const cols = Math.round(maxW / cell);

  const typeCanvas = document.createElement("canvas");
  typeCanvas.width = cols;
  typeCanvas.height = ROWS;
  const typeContext = typeCanvas.getContext("2d", { willReadFrequently: true })!;

  typeContext.fillStyle = "black";
  typeContext.fillRect(0, 0, cols, ROWS);

  let fontSize = cols * 1.2;
  typeContext.font = `bold ${fontSize}px ${FONT_FAMILY}`;
  let metrics = typeContext.measureText(TEXT);
  const inkW = metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft;
  if (inkW > cols * 0.95) {
    fontSize *= (cols * 0.95) / inkW;
    typeContext.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    metrics = typeContext.measureText(TEXT);
  }

  // Sketch's centering: derive the ink box, then offset the draw by it.
  const mx = metrics.actualBoundingBoxLeft * -1;
  const my = metrics.actualBoundingBoxAscent * -1;
  const mw = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const mh = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  typeContext.save();
  typeContext.translate((cols - mw) * 0.5 - mx, (ROWS - mh) * 0.5 - my);
  typeContext.fillStyle = "white";
  typeContext.textBaseline = "alphabetic";
  typeContext.fillText(TEXT, 0, 0);
  typeContext.restore();

  const { data } = typeContext.getImageData(0, 0, cols, ROWS);

  const canvas = canvasEl.value!;
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cols * cell}px`;
  canvas.style.height = `${ROWS * cell}px`;
  canvas.width = Math.round(cols * cell * dpr);
  canvas.height = Math.round(ROWS * cell * dpr);
  ctx.scale(dpr, dpr);

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--text")
    .trim();

  for (let i = 0; i < cols * ROWS; i++) {
    const glyph = glyphFor(data[i * 4]);
    const x = (i % cols) * cell + cell * 0.5;
    const y = Math.floor(i / cols) * cell + cell * 0.5;
    ctx.font = `${Math.random() < BIG_GLYPH ? cell * 6 : cell * 2.5}px ${FONT_FAMILY}`;
    ctx.fillText(glyph, x, y);
  }
}
</script>

<template>
  <figure class="ascii-text">
    <canvas ref="canvasEl" role="img" aria-label="YEAH!! dessiné en art ASCII" />
  </figure>
</template>

<style scoped>
.ascii-text {
  width: fit-content;
  margin: 0 auto;
}

canvas {
  display: block;
}
</style>
