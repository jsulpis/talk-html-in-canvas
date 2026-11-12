<script lang="ts">
// Slides stay mounted and each has its own switch, so the pill can only slide
// when entering a slide whose side differs from the previous one.
let lastSide: "html" | "canvas" | undefined;
let lastThumb: HTMLElement | null = null;
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { onSlideEnter } from "@slidev/client";

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
const isDivider = computed(() => Boolean(props.frontmatter.divider));

const thumb = ref<HTMLElement>();
const htmlOption = ref<HTMLElement>();
const canvasOption = ref<HTMLElement>();

function boxOf(el?: HTMLElement | null) {
  return el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
}

// Timings live in style.css: --motion-duration / --motion-ease.
function motion() {
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue("--motion-duration").trim();
  const duration = raw.endsWith("ms")
    ? parseFloat(raw)
    : raw.endsWith("s")
      ? parseFloat(raw) * 1000
      : parseFloat(raw);
  return {
    duration: Number.isFinite(duration) ? duration : 300,
    easing: style.getPropertyValue("--motion-ease").trim() || "ease",
  };
}

function placeThumb(from?: HTMLElement | null) {
  const active = isCanvas.value ? canvasOption.value : htmlOption.value;
  const to = boxOf(active);
  if (!thumb.value || !to?.width) return;

  // The thumb's inline box is always the destination; the motion only uses
  // transform so it can run on the compositor without triggering layout.
  thumb.value.style.left = `${to.left}px`;
  thumb.value.style.width = `${to.width}px`;

  const start = boxOf(from);
  if (!start?.width || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;

  const timing = motion();
  // Same two boxes for both pills, expressed around each element's own box.
  const framesFor = (base: { left: number; width: number }) => {
    const at = (box: { left: number; width: number }) => ({
      transform: `translateX(${box.left - base.left}px) scaleX(${box.width / base.width})`,
    });
    return [at(start), at(to)];
  };

  // Move the outgoing pill too: both are at the same coordinates, so the
  // crossfade reads as a single rectangle sliding over.
  const targets: Array<
    [HTMLElement | null | undefined, { left: number; width: number } | null]
  > = [
    [thumb.value, to],
    [lastThumb, lastThumb ? boxOf(lastThumb) : null],
  ];
  for (const [el, base] of targets) {
    if (!el || !base) continue;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(framesFor(base), timing);
  }
}

onMounted(() => placeThumb());

onSlideEnter(async () => {
  await nextTick();
  const sideChanged = lastSide && lastSide !== props.side;
  const other = isCanvas.value ? htmlOption.value : canvasOption.value;
  placeThumb(sideChanged ? other : null);
  lastSide = props.side;
  lastThumb = thumb.value ?? null;
});
</script>

<template>
  <Slide class="vs-section">
    <main v-if="isDivider" class="vs-divider">
      <slot />
    </main>

    <main v-else class="vs-content">
      <header class="vs-header">
        <h1 v-if="title">{{ title }}</h1>
        <div class="vs-switch" role="group" aria-label="HTML ou Canvas">
          <span ref="thumb" class="vs-switch-thumb" />
          <span
            ref="htmlOption"
            class="vs-switch-option"
            :class="{ 'is-active': !isCanvas }"
          >HTML</span>
          <span
            ref="canvasOption"
            class="vs-switch-option"
            :class="{ 'is-active': isCanvas }"
          >Canvas</span>
        </div>
        <p v-if="subtitle && !frontmatter.subtitleClick" class="vs-subtitle">{{ subtitle }}</p>
        <p v-else-if="subtitle" v-click="1" class="vs-subtitle">{{ subtitle }}</p>
      </header>

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
  padding: 68px 106px 150px;
  color: var(--text-body);
  font-size: 2rem;
  line-height: 1.4;
}

.vs-header {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 40px;
}

.vs-content h1 {
  grid-column: 1;
  margin: 0;
  color: var(--text);
  font-size: 4.5rem;
  font-weight: 600;
  line-height: 1.1;
  view-transition-name: vs-title;
}

.vs-subtitle {
  grid-column: 1 / -1;
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 2.5rem;
  font-weight: 400;
}

.vs-switch {
  position: relative;
  grid-column: 2;
  display: flex;
  padding: 6px;
  font-size: 2.5rem;
  border-radius: 999px;
}

.vs-switch-thumb {
  position: absolute;
  top: 6px;
  bottom: 6px;
  background: var(--surface);
  border-radius: 0;
  box-shadow: 0 2px 10px #1e355226;
  transform-origin: left center;
}

.vs-switch-option {
  position: relative;
  padding: 16px 38px;
  color: var(--text-muted);
  font-weight: 600;
  line-height: 1;
  border-radius: .5em;
  transition: color var(--motion-duration) var(--motion-ease);
}

.vs-switch-option.is-active {
  color: var(--accent-bright);
}

.vs-content :deep(code) {
  color: var(--accent-bright);
  font-family: "JetBrains Mono", monospace;
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

/* Button + code stack centred as one column with a fixed gap. */
.vs-body--columns.cta-pair {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 56px;
}

.vs-body :deep(.vs-lead) {
  position: relative;
  z-index: 2;
  translate: calc(50% + 28px) 0;
  transition:
    translate var(--motion-duration) var(--motion-ease),
    opacity var(--motion-duration) var(--motion-ease);
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
    border-color var(--motion-duration) var(--motion-ease),
    box-shadow var(--motion-duration) var(--motion-ease);
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
    var(--bg-deep) 150%
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

.vs-content :deep(.canvas-meme) {
  display: block;
  width: auto;
  height: 500px;
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
