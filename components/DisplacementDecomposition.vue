<script setup lang="ts">
import DisplacementSquare from "./DisplacementSquare.vue";

defineProps<{ name: string }>();
</script>

<template>
  <div class="decomposition">
    <figure>
      <div class="panel panel--map">
        <img :src="`${name}_disp_1k.jpg`" alt="Carte de déplacement" />
      </div>
      <figcaption>Displacement</figcaption>
    </figure>
    <span class="arrow" aria-hidden="true"><lucide-arrow-big-right /></span>
    <figure>
      <div class="panel panel--preview">
        <DisplacementSquare :name="name" />
      </div>
    </figure>
  </div>
</template>

<style scoped>
.decomposition {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  margin-left: 70px;
}

.arrow {
  display: flex;
  align-items: center;
  margin-left: 70px;
  color: var(--text-faint);
  font-size: 6rem;
  line-height: 1;
  user-select: none;
}

figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin: 0;
}

.panel--map {
  width: 450px;
  height: 450px;
}

.panel--preview {
  width: 800px;
  height: 600px;
}

.panel img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.panel :deep(canvas) {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
}

figcaption {
  color: var(--text-body);
  font-size: 3rem;
  margin-top: 1rem;
  line-height: 1;
}
</style>
