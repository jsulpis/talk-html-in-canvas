<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <footer class="slide-footer">
    <span>{{ label }}</span>
    <nav aria-label="Slide navigation">
      <button aria-label="Previous slide" @click="$slidev.nav.prev">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
      </button>
      <button aria-label="Next slide" @click="$slidev.nav.next">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
      </button>
    </nav>
  </footer>
</template>

<style scoped>
.slide-footer {
  position: absolute;
  z-index: 2;
  bottom: 68px;
  left: 106px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 1708px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
}

nav {
  display: flex;
  gap: 14px;
}

button {
  display: grid;
  width: 44px;
  height: 44px;
  padding: 8px;
  color: #5b7fa8;
  cursor: pointer;
  background: transparent;
  border: 0;
  place-items: center;
}

button:hover {
  color: var(--accent-bright);
}

svg {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}
</style>
