<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const COLS = 140;
// Each brightness band gets a few glyphs to pick from: the random pick keeps
// the sketched feel, the band keeps the density gradient readable.
const BANDS = ["", ".,", "-~", "+=", "*x", "%#@&"];
// < 1 lifts the midtones: the yellow sits at 0.31 raw ink, which is nearly
// blank, while navy sits at 0.8. Raise for more shade evenness, lower to
// restore contrast.
const INK_GAMMA = 0.7;
const SRC = "/devfest-lyon.png";

const canvasEl = ref<HTMLCanvasElement>();
let rendered = false;
let observer: ResizeObserver | null = null;

// Paint on the first real layout size rather than on slide entry: the
// overview grid mounts every slide without ever entering it.
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

async function render() {
  const img = new Image();
  img.src = SRC;
  await img.decode();
  await document.fonts.load('100px "JetBrains Mono"').catch(() => []);

  const canvas = canvasEl.value!;
  const ctx = canvas.getContext("2d")!;
  ctx.font = '100px "JetBrains Mono", monospace';
  const charAspect = ctx.measureText("M").width / 100;
  const rows = Math.round(COLS * charAspect * (img.height / img.width));

  // Sample the picture on a COLS × rows grid: one pixel block per character.
  const sample = document.createElement("canvas");
  sample.width = COLS;
  sample.height = rows;
  const sctx = sample.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, COLS, rows);
  const { data } = sctx.getImageData(0, 0, COLS, rows);

  const box = canvas.parentElement!.parentElement!;
  const aspect = (COLS * charAspect) / rows;
  const width = Math.min(box.clientWidth, box.clientHeight * aspect);
  const height = width / aspect;
  const cellH = height / rows;
  const cellW = cellH * charAspect;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.scale(dpr, dpr);
  ctx.font = `${cellH}px "JetBrains Mono", monospace`;

  // Ink = perceived darkness (1 - luminance), so a saturated but bright colour
  // like the yellow stays light while the navy shapes ink hardest.
  const count = COLS * rows;
  const inks = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 4;
    const luma = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    inks[i] = (1 - luma / 255) * (data[p + 3] / 255);
  }
  const sorted = Float32Array.from(inks).sort();
  const lo = sorted[Math.floor(count * 0.18)];
  const hi = sorted[Math.floor(count * 0.97)] || 1;

  const glyphFor = (ink: number) => {
    const band =
      BANDS[Math.min(BANDS.length - 1, Math.floor(ink * BANDS.length))];
    return band ? band[(Math.random() * band.length) | 0] : "";
  };

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      const ink = Math.pow(
        Math.min(1, Math.max(0, (inks[i] - lo) / (hi - lo))),
        INK_GAMMA,
      );
      const glyph = glyphFor(ink);
      if (!glyph) continue;
      // Ink the glyph with the sampled colour, pulled down to a max channel
      // of 170 so pale colours still read on the light slide.
      const p = i * 4;
      const k = Math.min(1, 170 / Math.max(data[p], data[p + 1], data[p + 2], 1));
      ctx.fillStyle = `rgb(${(data[p] * k) | 0} ${(data[p + 1] * k) | 0} ${(data[p + 2] * k) | 0})`;
      // One glyph in twelve is drawn almost three times too big and bleeds
      // over its neighbours.
      ctx.font = `${cellH * (Math.random() < 0.1 ? 3 : 1.5)}px "JetBrains Mono", monospace`;
      ctx.fillText(glyph, (x + 0.5) * cellW, (y + 0.5) * cellH);
    }
  }
}
</script>

<template>
  <figure class="ascii">
    <canvas
      ref="canvasEl"
      role="img"
      aria-label="Logo redessiné en art ASCII"
    />
  </figure>
</template>

<style scoped>
.ascii {
  width: fit-content;
  margin-top: -2.2rem;
}

canvas {
  display: block;
}
</style>
