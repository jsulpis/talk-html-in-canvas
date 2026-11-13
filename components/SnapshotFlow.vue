<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { useNav, useSlideContext } from "@slidev/client";

// useSlideContext().$clicks snapshots the clicks context at setup time and goes
// stale when Slidev swaps the context (e.g. navigating faster than the
// transitions). The nav's clicks is a computed over the live context.
// v-click directives got stuck the same way, so step visibility is mirrored into
// `step` below, with the click count coming from the page frontmatter.
const { clicks, currentPage } = useNav();
const { $page } = useSlideContext();

// pages/02-what.md declares `clicks: 3`.
const MAX_STEP = 3;

// Rendered step. Frozen while the slide is not current: as soon as navigation
// starts, the nav's clicks reports the *next* slide's count, which would
// otherwise reset the diagram while this slide is still fading out.
const step = ref(0);

// The middle card swaps content while it slides between slots. Waiting for the
// move to finish before switching faces keeps the two from overlapping.
const showTexture = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

// Derived from the motion token so the delay can't drift from the CSS, and
// skipped when transitions are disabled.
function faceSwapDelay() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue("--motion-duration")
    .trim();
  const duration = parseFloat(token) * (token.endsWith("ms") ? 1 : 1000);
  return Number.isFinite(duration) ? duration * 0.8 : 400;
}

watch(
  [clicks, currentPage],
  ([current, page], previous) => {
    if (page !== $page.value) return;

    clearTimeout(timer);
    step.value = Math.min(current, MAX_STEP);

    // Only delay the face swap when the card actually moves between slots while
    // the slide is on screen (1 <-> 2); entering the slide applies it at once.
    const from = previous?.[0];
    const wasCurrent = previous?.[1] === $page.value;
    const moves =
      wasCurrent &&
      ((from === 1 && step.value === 2) || (from === 2 && step.value === 1));
    const apply = () => (showTexture.value = step.value === 1);
    if (moves) timer = setTimeout(apply, faceSwapDelay());
    else apply();
  },
  { immediate: true },
);

onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <div class="flow">
    <figure
      class="flow-step flow-step--square flow-step--html"
      :class="{
        'is-hidden': step === 1,
        'is-paired': step === 0,
      }"
    >
      <figcaption class="flow-label">HTML</figcaption>
      <div class="flow-note" :class="{ 'is-visible': step === 3 }">
        <lucide-eye class="flow-note-eye" aria-hidden="true" />
        <ul class="flow-note-list">
          <li>lecteurs d’écran</li>
          <li>robots</li>
          <li>...</li>
        </ul>
      </div>
      <lucide-arrow-down
        class="flow-note-arrow"
        :class="{ 'is-visible': step === 3 }"
        aria-hidden="true"
      />
      <lucide-code-xml class="flow-icon" />
    </figure>

    <lucide-arrow-big-right
      class="flow-arrow"
      :class="{ 'is-hidden': step < 2 }"
      aria-hidden="true"
    />

    <figure
      class="flow-step flow-step--square flow-step--snapshot"
      :class="{
        'is-hidden': step < 1,
        'is-paired': step === 1,
      }"
    >
      <!-- Stacked faces: swapping them with v-if mid-transition left ghost
           icons in some browsers, a cross-fade doesn't. -->
      <div class="flow-face" :class="{ 'is-active': !showTexture }">
        <figcaption class="flow-label">Snapshot</figcaption>
        <lucide-camera class="flow-icon" />
      </div>
      <div class="flow-face" :class="{ 'is-active': showTexture }">
        <figcaption class="flow-label">Texture</figcaption>
        <lucide-image class="flow-icon" />
      </div>
    </figure>

    <lucide-arrow-big-right
      class="flow-arrow flow-arrow--travel"
      :class="{ 'is-paired': step <= 1 }"
      aria-hidden="true"
    />

    <figure
      class="flow-step flow-step--canvas"
      :class="{ 'is-paired': step <= 1 }"
    >
      <figcaption class="flow-label">Canvas</figcaption>
      <lucide-image class="flow-icon flow-icon--canvas" />
    </figure>
  </div>
</template>

<style scoped>
.flow {
  --shape-height: 300px;
  --shape-gap: 44px;
  --arrow-width: 80px;
  /* Half the space freed up when the snapshot and the left arrow get hidden:
     used to bring HTML, one arrow and Canvas together, centred. */
  --pair-shift: calc(
    (var(--shape-height) + var(--arrow-width) + 2 * var(--shape-gap)) / 2
  );
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--shape-gap);
  width: 100%;
}

.flow-step {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--shape-height);
  margin: 0;
  color: var(--accent);
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: 0 30px 80px #1e355226;
  transition:
    translate var(--motion-duration) var(--motion-ease),
    opacity var(--motion-duration) var(--motion-ease);
}

/* HTML step is not a v-click: it has to leave and come back. It fades in
   while Snapshot and Canvas slide right to make room, so both motions read
   as one gesture. */
.flow-step--html {
  transition:
    translate var(--motion-duration) var(--motion-ease),
    opacity var(--motion-duration) linear;
}

.flow-step.is-hidden {
  opacity: 0;
}

.flow-step--html.is-hidden {
  transition:
    translate var(--motion-duration) var(--motion-ease),
    opacity 180ms linear;
}

.flow-step--html.is-paired {
  translate: var(--pair-shift) 0;
}

.flow-step--snapshot.is-paired {
  translate: calc(-1 * var(--pair-shift)) 0;
}

.flow-step--canvas.is-paired {
  translate: calc(-1 * var(--pair-shift)) 0;
}

.flow-step--square {
  width: var(--shape-height);
}

.flow-step--canvas {
  width: calc(var(--shape-height) * 16 / 9);
  background: radial-gradient(
    ellipse at center,
    #ffffff 0%,
    var(--bg-deep) 150%
  );
  border-color: var(--line-strong);
}

/* The snapshot card holds two faces (Snapshot / Texture) that cross-fade. */
.flow-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 120ms linear;
}

.flow-face.is-active {
  opacity: 1;
}

.flow-label {
  position: absolute;
  bottom: calc(100% + 24px);
  left: 50%;
  translate: -50% 0;
  color: var(--text-body);
  font-family: "Space Grotesk", sans-serif;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 5px;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Annotation above the HTML card: appears once the flow has settled on its
   final state. */
.flow-note {
  position: absolute;
  bottom: calc(100% + 156px);
  left: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  opacity: 0;
  transition: opacity 200ms linear;
  white-space: nowrap;
}

.flow-note-eye {
  flex: none;
  width: 56px;
  height: 56px;
  color: var(--accent);
  stroke-width: 1.5;
}

.flow-note-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  color: var(--text-body);
  font-size: 1.75rem;
  line-height: 1.35;
  list-style: none;
}

.flow-note-list li {
  position: relative;
  padding-left: 20px;
}

.flow-note-list li::before {
  position: absolute;
  top: 0.58em;
  left: 0;
  width: 7px;
  height: 7px;
  background: var(--accent-soft);
  content: "";
}

.flow-note-arrow {
  position: absolute;
  bottom: calc(100% + 100px);
  left: 50%;
  width: 52px;
  height: 52px;
  translate: -50% 0;
  color: var(--accent);
  stroke-width: 1.5;
  opacity: 0;
  transition: opacity 200ms linear;
}

.flow-note.is-visible,
.flow-note-arrow.is-visible {
  opacity: 1;
  transition: opacity 300ms linear;
}

.flow-icon {
  width: 128px;
  height: 128px;
}

/* The icons carry a hard-coded stroke-width on their <g>/<path>; override there. */
.flow-icon :deep(g),
.flow-icon :deep(path),
.flow-icon--canvas :deep(g),
.flow-icon--canvas :deep(path) {
  stroke-width: 1;
}

.flow-arrow {
  flex: none;
  width: var(--arrow-width);
  height: var(--arrow-width);
  color: var(--text-faint);
  stroke-width: 1;
  transition:
    translate var(--motion-duration) var(--motion-ease),
    opacity var(--motion-duration) linear;
}

.flow-arrow.is-hidden {
  opacity: 0;
}

/* The right arrow starts in the gap between HTML and Canvas, then slides back
   to its slot between Snapshot and Canvas. */
.flow-arrow--travel.is-paired {
  translate: calc(-1 * var(--pair-shift)) 0;
}
</style>
