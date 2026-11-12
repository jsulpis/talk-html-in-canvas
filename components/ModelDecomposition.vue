<script setup lang="ts">
import ModelTurntable from "./ModelTurntable.vue";

defineProps<{ src: string; albedo: string }>();
</script>

<template>
  <div class="decomposition">
    <figure>
      <div class="panel">
        <img :src="albedo" alt="Carte d'albedo du modèle dépliée en UV" />
      </div>
      <figcaption>Couleur</figcaption>
    </figure>
    <lucide-plus class="plus"/>
    <figure>
      <div class="panel">
        <ModelTurntable :src="src" mode="matcap" />
      </div>
      <figcaption>Géométrie</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.decomposition {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 56px;
}

.plus {
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

.panel {
  width: 500px;
  height: 500px;
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

figcaption span {
  color: var(--text-faint);
}
</style>
