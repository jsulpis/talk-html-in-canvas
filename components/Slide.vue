<template>
  <div class="slidev-layout blueprint">
    <slot />
  </div>
</template>

<style scoped>
.slidev-layout.blueprint {
  position: relative;
  height: 100%;
  overflow: hidden;
  padding: 0;
  color: var(--text);
  background: var(--bg);
  font-family: Inter, sans-serif;
}

.slidev-layout.blueprint::before,
.slidev-layout.blueprint::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
}

/* .slidev-layout.blueprint::before {
  opacity: 0.6;
  background-image:
    linear-gradient(to right, var(--grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid) 1px, transparent 1px),
    linear-gradient(to right, var(--grid-subtle) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-subtle) 1px, transparent 1px);
  background-size: 120px 120px, 120px 120px, 60px 60px, 60px 60px;
} */

.slidev-layout.blueprint::after {
  background:
    radial-gradient(ellipse at 85% 25%, #dcebfc 0%, #dcebfc00 60%),
    radial-gradient(ellipse at center, transparent 35%, #e2eef599 78%, #d5e3f0e6 100%);
}
</style>
