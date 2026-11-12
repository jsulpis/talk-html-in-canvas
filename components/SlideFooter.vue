<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <footer class="slide-footer">
    <span>{{ label }}</span>
    <nav aria-label="Slide navigation">
      <button aria-label="Previous slide" @click="$slidev.nav.prev">
        <lucide-arrow-left/>
      </button>
      <button aria-label="Next slide" @click="$slidev.nav.next">
        <lucide-arrow-right/>
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
</style>
