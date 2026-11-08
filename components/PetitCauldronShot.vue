<template>
  <div class="shot">
    <div class="shot-frame">
      <img
        src="/petit-cauldron.eidoux.dev.jpg"
        alt="Capture d’écran de Petit Cauldron"
      />
      <span v-click class="shot-panel" />
    </div>

    <p class="shot-credit">
      <a href="https://petit-cauldron.eidoux.dev/" target="_blank" rel="noreferrer">Petit Cauldron</a>
      - <a href="https://eidoux.dev/">Etienne Idoux</a>
    </p>
  </div>
</template>

<style scoped>
.shot {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.shot-frame {
  position: relative;
  width: 100%;
}

.shot-frame img {
  display: block;
  width: 100%;
  box-shadow: 0 30px 80px #1e355226;
}

.shot-panel {
  position: absolute;
  left: 28.8%;
  top: 56.8%;
  width: 42.4%;
  height: 40.9%;
  border: 10px solid white;
  border-radius: 6px;
  box-shadow:
    0 0 0 4px #1d4ed826,
    0 0 40px #1d4ed866;
  pointer-events: none;
  transition:
    opacity 150ms ease,
    scale 150ms ease;
}

.shot-panel.slidev-vclick-hidden {
  opacity: 0;
  scale: 1;
}

.shot-credit {
  margin: 16px 0 0;
  color: var(--text-muted);
  font-size: 1.5rem;
  text-align: center;
}

.shot-credit a {
  color: var(--accent-bright);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 4px;
}
</style>
