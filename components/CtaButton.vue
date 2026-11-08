<script setup lang="ts">
import { ref } from "vue";

interface Emoji {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  scale: number;
  duration: number;
}

const emojis = ref<Emoji[]>([]);
let nextId = 0;

function throwEmojis() {
  for (let i = 0; i < 6; i++) {
    const id = nextId++;
    const angle = Math.random() * Math.PI * 2;
    const distance = 140 + Math.random() * 180;

    emojis.value.push({
      id,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rot:
        (Math.random() - 0.5) * 120 +
        (Math.random() < 0.5 ? -1 : 1) * (360 + 2 *Math.random() * 360),
      scale: 0.8 + Math.random() * 0.8,
      duration: 900 + Math.random() * 500,
    });

    setTimeout(() => {
      emojis.value = emojis.value.filter((emoji) => emoji.id !== id);
    }, 1400);
  }
}
</script>

<template>
  <span class="cta-wrap">
    <span
      v-for="emoji in emojis"
      :key="emoji.id"
      class="cta-emoji"
      aria-hidden="true"
      :style="{
        '--dx': `${emoji.dx}px`,
        '--dy': `${emoji.dy}px`,
        '--rot': `${emoji.rot}deg`,
        '--scale': emoji.scale,
        '--duration': `${emoji.duration}ms`,
      }"
      >👋</span
    >
    <button class="cta-demo" type="button" @click="throwEmojis">
      Bonjour !
    </button>
  </span>
</template>

<style scoped>
.cta-wrap {
  position: relative;
  display: inline-flex;
}

.cta-emoji {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  font-size: 3rem;
  line-height: 1;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(var(--scale));
  animation: cta-throw var(--duration) cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes cta-throw {
  0% {
    transform: translate(-50%, -50%) scale(calc(var(--scale) * 0.4));
  }

  50% {
    opacity: 1;
  }

  to {
    opacity: 0;
    transform: translate(
        calc(-50% + var(--dx)),
        calc(-50% + var(--dy))
      )
      rotate(var(--rot)) scale(var(--scale));
  }
}

.cta-demo {
  position: relative;
  z-index: 1;
  padding: 28px 56px;
  color: #fff;
  font: inherit;
  font-size: 2rem;
  font-weight: 600;
  background: var(--accent);
  border: 0;
  border-radius: 8px;
  box-shadow: 0 18px 50px #2563eb33;
  cursor: pointer;
  transition:
    background 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.cta-demo:hover {
  background: var(--accent-bright);
  box-shadow: 0 26px 60px #2563eb59;
  transform: translateY(-3px);
}

.cta-demo:active {
  background: #1e3a8a;
  box-shadow: 0 8px 18px #2563eb26;
  transform: translateY(3px);
}

.cta-demo:focus-visible {
  outline: 5px solid var(--accent-bright);
  outline-offset: 8px;
}
</style>
