<template>
  <canvas
    ref="canvas"
    class="canvas-frame canvas-hero canvas-solo"
    aria-label="Texte « ça dépasse » tronqué par le bord du canvas"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement>();

function draw() {
  const el = canvas.value;
  const ctx = el?.getContext("2d");
  if (!el || !ctx) return;

  const scale = 2;
  el.width = 792 * scale;
  el.height = 445 * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-body")
    .trim();
  ctx.font = "600 150px Inter, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("ça dépasse", 100, 222);
}

onMounted(() => document.fonts.ready.then(draw));
</script>
