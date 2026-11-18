<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";

const canvas = ref<HTMLCanvasElement | null>(null);
const hovered = ref(false);

const TEXT = "Bonjour !";
const FONT = "600 32px Inter, sans-serif";
const PAD_X = 56;
const PAD_Y = 28;
const RADIUS = 8;
const LIFT = 3;

let ctx: CanvasRenderingContext2D | null = null;
let buttonPath: Path2D | null = null;
let observer: ResizeObserver | null = null;

function draw() {
  const el = canvas.value;
  if (!ctx || !el) return;

  const dpr = window.devicePixelRatio || 1;
  const width = el.width / dpr;
  const height = el.height / dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.font = FONT;
  const w = Math.round(ctx.measureText(TEXT).width + PAD_X * 2);
  const h = Math.round(32 * 1.2 + PAD_Y * 2);
  const x = (width - w) / 2;
  const y = (height - h) / 2;

  // Hit-test path stays at rest; the drawn one is lifted on hover.
  buttonPath = new Path2D();
  buttonPath.roundRect(x, y, w, h, RADIUS);

  const lift = hovered.value ? -LIFT : 0;

  ctx.save();
  ctx.translate(0, lift);
  ctx.shadowColor = hovered.value ? "rgba(37, 99, 235, 0.35)" : "rgba(37, 99, 235, 0.2)";
  ctx.shadowBlur = hovered.value ? 40 : 28;
  ctx.shadowOffsetY = hovered.value ? 26 : 18;
  ctx.fillStyle = hovered.value ? "#1d67d8" : "#2578eb";
  ctx.fill(buttonPath);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(TEXT, width / 2, y + lift + h / 2);
}

function resize() {
  const el = canvas.value;
  if (!el) return;
  const dpr = window.devicePixelRatio || 1;
  // clientWidth/Height are layout pixels: unaffected by Slidev's scale transform.
  el.width = Math.round(el.clientWidth * dpr);
  el.height = Math.round(el.clientHeight * dpr);
  draw();
}

function onPointerMove(event: PointerEvent) {
  if (!ctx || !buttonPath) return;

  // Identity transform: offsetX/Y and the Path2D are both in canvas CSS pixels.
  ctx.save();
  ctx.resetTransform();
  const isOver = ctx.isPointInPath(buttonPath, event.offsetX, event.offsetY);
  ctx.restore();

  if (isOver !== hovered.value) {
    hovered.value = isOver;
    draw();
  }
}

function onPointerLeave() {
  if (!hovered.value) return;
  hovered.value = false;
  draw();
}

onMounted(async () => {
  ctx = canvas.value?.getContext("2d") ?? null;
  observer = new ResizeObserver(resize);
  observer.observe(canvas.value!);
  await document.fonts.ready;
  resize();
  document.fonts.addEventListener("loadingdone", draw);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  document.fonts.removeEventListener("loadingdone", draw);
});
</script>

<template>
  <canvas
    ref="canvas"
    class="canvas-frame canvas-button"
    role="img"
    aria-label="Bouton « Bonjour ! » rendu dans un canvas"
    :style="{ cursor: hovered ? 'pointer' : 'default' }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  />
</template>

<style scoped>
.canvas-button {
  aspect-ratio: 16 / 9;
}
</style>
