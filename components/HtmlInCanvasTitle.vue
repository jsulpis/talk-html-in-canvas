<script setup lang="ts">
import { useSlideContext } from "@slidev/client";

const { $clicks } = useSlideContext();
</script>

<template>
  <div
    class="vs-title"
    role="img"
    :aria-label="`HTML ${$clicks >= 1 ? 'in' : 'vs'} Canvas`"
  >
    HTML
    <span
      class="vs-weak vs-flip-word"
      :class="{ 'is-flipped': $clicks >= 1 }"
      aria-hidden="true"
    >
      <span class="vs-dash vs-dash-left">-</span>
      <span class="vs-flip" v-for="pair in ['vi', 'sn']" :key="pair">
        <span class="vs-flip-face vs-flip-front">{{ pair[0] }}</span>
        <span class="vs-flip-face vs-flip-back">{{ pair[1] }}</span>
      </span>
      <span class="vs-dash vs-dash-right">-</span>
    </span>
    Canvas
  </div>
</template>

<style scoped>
/* Typography (.vs-title, .vs-weak) comes from the vs layout. */
.vs-flip-word {
  position: relative;
  display: inline-flex;
  perspective: 6em;
  --flip-duration: calc(var(--motion-duration) * 2.5);
}

/* Hyphens live in the flex gaps: absolutely positioned so the words never move. */
.vs-dash {
  position: absolute;
  top: 50%;
  left: 0;
  font-size: 1em;
  font-weight: 400;
  line-height: 1;
  color: inherit;
  opacity: 0;
  translate: -50% -50%;
  transition: opacity calc(var(--flip-duration) * 0.64) linear;
}

.vs-dash-left {
  margin-left: -0.33ch;
}

.vs-dash-right {
  left: 100%;
  margin-left: 0.63ch;
}

.vs-flip-word.is-flipped .vs-dash {
  opacity: 1;
  transition-delay: calc(var(--flip-duration));
}

/* One 3D quarter-turn per letter: "vs" rolls into "in" on the first click. */
.vs-flip {
  display: inline-grid;
  transform-style: preserve-3d;
  transition: transform var(--flip-duration) cubic-bezier(0.45, 0, 0.25, 1);
  transition-delay: var(--letter-delay, 0ms);
}

.vs-flip-word.is-flipped .vs-flip {
  transform: rotateX(-90deg);
}

/* Stagger the letters: left turns first, right follows. */
.vs-flip + .vs-flip {
  --letter-delay: calc(var(--flip-duration) * 0.14);
}

.vs-flip-face {
  grid-area: 1 / 1;
  line-height: 1em;
  backface-visibility: hidden;
  transform: translateZ(0.5em);
  transition: all calc(var(--flip-duration) * 0.64) linear;
}

.vs-flip-back {
  transform: rotateX(90deg) translateZ(0.5em);
  opacity: 0;
  transition-delay: var(--letter-delay, 0ms);
}

/* Each letter fades out as it rolls away, the next fades in as it comes round. */
.vs-flip-front {
  opacity: 1;
  transition-delay: calc(
    var(--flip-duration) * 0.36 + var(--letter-delay, 0ms)
  );
}

.vs-flip-word.is-flipped .vs-flip-front {
  opacity: 0;
  transition-delay: var(--letter-delay, 0ms);
}

.vs-flip-word.is-flipped .vs-flip-back {
  opacity: 1;
  color: var(--text);
  transition-delay: calc(
    var(--flip-duration) * 0.36 + var(--letter-delay, 0ms)
  );
}
</style>
