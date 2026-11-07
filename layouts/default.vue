<template>
  <Slide class="default">
    <main class="default-content">
      <slot />
    </main>
    <SlideFooter label="@jsulpis" />
  </Slide>
</template>

<style scoped>
.default-content {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 120px 140px 150px;
  color: var(--text-body);
  font-size: 2rem;
  line-height: 1.4;
}

.default-content:not(:has(h1)) {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.default-content:has(.vs-eyebrow) {
  padding-top: 44px;
}
</style>
