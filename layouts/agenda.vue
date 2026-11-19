<template>
  <Slide class="agenda">
    <main
      class="agenda-list"
      :style="{ transform: `translateY(${(1 - Number($frontmatter.active)) * 141}px)` }"
    >
      <div
        v-for="(item, index) in $frontmatter.items.slice(0, $frontmatter.active)"
        :key="item"
        class="agenda-item"
        :class="{ 'is-active': Number(index) + 1 === Number($frontmatter.active) }"
      >
        <span class="agenda-number">{{ String(Number(index) + 1).padStart(2, '0') }}</span>
        <span class="agenda-label">{{ item }}</span>
      </div>
    </main>
    <SlideFooter label="@jsulpis" />
  </Slide>
</template>

<style scoped>
.agenda-list {
  position: absolute;
  z-index: 1;
  top: 438px;
  left: 140px;
  display: flex;
  flex-direction: column;
  width: 910px;
}

.agenda-item {
  display: flex;
  align-items: center;
  min-height: 141px;
  gap: 32px;
  padding: 38px 0;
}

.agenda-number {
  width: 90px;
  color: var(--text-faint);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 3.375rem;
  font-weight: 700;
  line-height: 1;
  text-align: right;
}

.agenda-label {
  color: var(--text-muted);
  font-size: 3.5rem;
  line-height: 1;
}

.agenda-item.is-active {
  min-height: 172px;
}

.agenda-item.is-active .agenda-number {
  font-size: 4.5rem;
}

.agenda-item.is-active .agenda-label {
  color: var(--text);
  font-size: 6rem;
  font-weight: 600;
}
</style>
