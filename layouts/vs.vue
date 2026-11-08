<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  frontmatter: Record<string, any>;
  side?: "html" | "canvas";
  class?: string;
}>();

const title = computed(() => props.frontmatter.title as string | undefined);
const subtitle = computed(
  () => props.frontmatter.subtitle as string | undefined,
);
const isCanvas = computed(() => props.side === "canvas");
const isLit = computed(
  () => props.side === "html" && Boolean(props.frontmatter.highlight),
);
const isDivider = computed(() => Boolean(props.frontmatter.divider));
</script>

<template>
  <Slide class="vs-section">
    <main v-if="isDivider" class="vs-divider">
      <slot />
    </main>

    <main v-else class="vs-content">
      <p
        class="vs-eyebrow"
        :class="{ 'vs-eyebrow-canvas': isCanvas, 'vs-eyebrow-lit': isLit }"
      >
        <span :class="isCanvas ? 'vs-fade' : 'vs-strong'">HTML</span> <span class="vs-weak">vs</span> <span :class="isCanvas ? 'vs-strong' : 'vs-fade'">Canvas</span><span v-if="!isCanvas && !isLit" v-click />
      </p>

      <h1 v-if="title">{{ title }}</h1>
      <p v-if="subtitle" class="vs-subtitle">{{ subtitle }}</p>

      <div
        class="vs-body"
        :class="[props.class, { 'vs-body--columns': !!$slots.right }]"
      >
        <slot />
        <slot name="right" />
      </div>
    </main>

    <SlideFooter label="@jsulpis" />
  </Slide>
</template>

<style scoped>
.vs-divider {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.vs-divider :deep(.vs-title) {
  view-transition-name: vs-title;
  width: fit-content;
  margin: 0 auto;
  color: var(--text);
  font-size: 5.5rem;
  font-weight: 600;
  line-height: 1;
  text-align: center;
}

.vs-divider :deep(.vs-weak) {
  color: var(--text-muted);
  font-size: 0.8em;
  font-weight: 400;
}

.vs-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 44px 140px 150px;
  color: var(--text-body);
  font-size: 2rem;
  line-height: 1.4;
}

.vs-content h1 {
  margin: 0 0 48px;
  color: var(--text);
  font-size: 4.5rem;
  font-weight: 600;
  line-height: 1.1;
}

.vs-subtitle {
  margin: -30px 0 40px;
  color: var(--text-muted);
  font-size: 2.5rem;
  font-weight: 400;
}

.vs-content :deep(code) {
  color: var(--accent-bright);
  font-family: "JetBrains Mono", monospace;
}

.vs-eyebrow {
  view-transition-name: vs-title;
  width: fit-content;
  margin: 0 auto 12px;
  color: var(--text);
  font-size: 3rem;
  font-weight: 600;
  line-height: 1;
  text-align: center;
}

.vs-strong {
  position: relative;
}

.vs-strong::before {
  content: "";
  position: absolute;
  left: -0.65em;
  top: 50%;
  width: 0.3em;
  height: 0.3em;
  border-radius: 50%;
  background: var(--accent-bright);
  box-shadow: 0 0 0 0.14em rgba(37, 99, 235, 0.16);
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 300ms ease;
}

.vs-weak {
  color: var(--text-muted);
  font-weight: 400;
  font-size: 0.8em;
  transition: color 300ms ease;
}

.vs-fade {
  transition: color 300ms ease;
}

.vs-eyebrow:has(.slidev-vclick-current) .vs-weak,
.vs-eyebrow:has(.slidev-vclick-prior) .vs-weak,
.vs-eyebrow:has(.slidev-vclick-current) .vs-fade,
.vs-eyebrow:has(.slidev-vclick-prior) .vs-fade {
  color: var(--text-faint);
}

.vs-eyebrow:has(.slidev-vclick-current) .vs-strong::before,
.vs-eyebrow:has(.slidev-vclick-prior) .vs-strong::before {
  opacity: 1;
}

.vs-eyebrow-canvas .vs-fade,
.vs-eyebrow-canvas .vs-weak,
.vs-eyebrow-lit .vs-fade,
.vs-eyebrow-lit .vs-weak {
  color: var(--text-faint);
}

.vs-eyebrow-canvas .vs-strong::before {
  left: auto;
  right: -0.65em;
  opacity: 1;
}

.vs-eyebrow-lit .vs-strong::before {
  opacity: 1;
}

.vs-body {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
}

.vs-body--columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 56px;
  justify-content: normal;
}

.vs-body--columns.budget-demo {
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
}

.vs-body--columns.wide-code {
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 40px;
}

.vs-body :deep(.vs-lead) {
  position: relative;
  z-index: 2;
  translate: calc(50% + 28px) 0;
  transition:
    translate 400ms cubic-bezier(0.5, 0, 0.1, 1),
    opacity 300ms ease;
}

.vs-body :deep(.cta-stage) {
  display: flex;
  justify-content: center;
}

.vs-body :deep(.vs-lead.slidev-vclick-prior) {
  translate: 0 0;
}

.vs-content :deep(.semantic-card) {
  padding: 48px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: 0 30px 80px #1e355226;
}

.vs-content :deep(.semantic-card h2) {
  margin: 0 0 32px;
  color: var(--text);
  font-size: 2.75rem;
  font-weight: 600;
}

.vs-content :deep(.semantic-card form) {
  display: flex;
  flex-direction: column;
}

.vs-content :deep(.semantic-card label) {
  color: var(--text-secondary);
  font-size: 1.75rem;
}

.vs-content :deep(.semantic-card input) {
  padding: 16px 18px;
  color: var(--text);
  font: inherit;
  font-size: 1.5rem;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.vs-content :deep(.semantic-card button) {
  margin-top: 1rem;
  padding: 16px 24px;
  color: #fff;
  font: inherit;
  font-size: 1.5rem;
  font-weight: 600;
  background: var(--accent);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.vs-content :deep(.text-demo) {
  width: 560px;
  padding: 28px 40px;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  font-size: 2rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 18px 50px #2563eb26;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.vs-content :deep(.text-demo:hover) {
  border-color: var(--accent);
  box-shadow: 0 22px 55px #2563eb40;
}

.vs-content :deep(.text-demo:focus) {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px #2563eb26;
}

.vs-content :deep(.spec-quote) {
  max-width: 1500px;
  margin: 0;
  padding-left: 40px;
  color: var(--text);
  font-size: 3rem;
  font-weight: 300;
  font-style: italic;
  line-height: 1.35;
  border-left: 6px solid var(--accent);
}

.vs-content :deep(.spec-quote footer) {
  margin-top: 36px;
  color: var(--text-muted);
  font-style: normal;
  font-size: 2rem;
  font-weight: 400;
}

.vs-content :deep(.spec-quote footer a) {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 4px;
}

.vs-content :deep(.spec-quote footer a:hover) {
  color: var(--accent-bright);
}

.vs-content :deep(.canvas-frame) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  color: var(--accent);
  background: radial-gradient(
    ellipse at center,
    #ffffff 0%,
    var(--bg-deep) 100%
  );
  border: 1px solid var(--line-strong);
  box-shadow: 0 30px 80px #1e355226;
}

.vs-content :deep(.canvas-icon) {
  position: relative;
  width: 210px;
  height: 210px;
}

.vs-content :deep(.canvas-hero) {
  view-transition-name: canvas-hero;
}

.vs-content :deep(.canvas-solo) {
  width: 792px;
}

.vs-content :deep(.canvas-large) {
  width: 1100px;
}

.vs-content :deep(canvas.canvas-large) {
  margin-top: -2rem;
}

.vs-content :deep(.canvas-donut) {
  view-transition-name: canvas-donut;
}

.vs-content :deep(.sr-only) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
