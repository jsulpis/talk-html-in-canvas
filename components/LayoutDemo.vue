<template>
  <div
    class="layout-demo"
    role="group"
    aria-label="Carte projet redimensionnable"
  >
    <article class="project-card">
      <figure class="project-media">
        <img
          src="/petit-cauldron.eidoux.dev.jpg"
          alt="Capture d’écran du jeu Petit Cauldron"
        />
        <figcaption>Jeu web</figcaption>
      </figure>

      <div class="project-body">
        <p class="project-kicker">Projet personnel</p>
        <h3 class="project-title">Petit Cauldron</h3>
        <p class="project-desc">
          Mélangez des ingrédients, laissez la magie opérer — un petit jeu de
          potions en pixel art propulsé par Three.js.
        </p>

        <ul class="project-tags">
          <li>Three.js</li>
          <li>WebGL</li>
          <li>Vite</li>
        </ul>

        <div class="project-author">
          <span class="project-avatar" aria-hidden="true">EI</span>
          <span>Etienne Idoux</span>
        </div>
      </div>

      <aside class="project-aside">
        <dl class="project-meta">
          <div><dt>Année</dt><dd>2025</dd></div>
          <div><dt>Rôle</dt><dd>Solo</dd></div>
          <div><dt>Durée</dt><dd>2 mois</dd></div>
        </dl>
        <a
          class="project-link"
          href="https://petit-cauldron.eidoux.dev/"
          target="_blank"
          rel="noreferrer"
        >
          Voir le projet <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </article>
  </div>
</template>

<style scoped>
/* Native CSS resize: the wrapper is the container, the card queries it. */
.layout-demo {
  width: min(850px, 100%);
  min-width: 380px;
  max-width: 1020px;
  overflow: hidden;
  resize: horizontal;
  container-type: inline-size;
  container-name: demo;
  box-shadow: 0 30px 80px #1e355226;
}

.project-card {
  display: grid;
  grid-template-areas:
    "media"
    "body"
    "aside";
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
}

.project-media {
  position: relative;
  grid-area: media;
  margin: 0;
  overflow: hidden;
}

.project-media img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.project-media figcaption {
  position: absolute;
  bottom: 14px;
  left: 14px;
  padding: 4px 10px;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  background: #101b2dcc;
  border-radius: 4px;
}

.project-body {
  display: flex;
  flex-direction: column;
  grid-area: body;
  gap: 12px;
  padding: clamp(20px, 3.4cqi, 32px);
  padding-bottom: 18px;
}

.project-kicker {
  margin: 0;
  color: var(--accent-bright);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.project-title {
  margin: 0;
  color: var(--text);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.1;
}

.project-desc {
  margin: 0;
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.45;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.project-tags li {
  padding: 4px 10px;
  color: var(--text-secondary);
  font: 0.85rem "JetBrains Mono", monospace;
  background: #e8f0fa;
  border-radius: 4px;
}

.project-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}

.project-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--accent);
  border-radius: 50%;
  place-items: center;
}

.project-aside {
  display: flex;
  flex-wrap: wrap;
  grid-area: aside;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 18px clamp(20px, 3.4cqi, 32px) clamp(20px, 3.4cqi, 32px);
  border-top: 1px solid var(--line);
}

.project-meta {
  display: flex;
  gap: 24px;
  margin: 0;
}

.project-meta div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-meta dt {
  color: var(--text-faint);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.project-meta dd {
  margin: 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
}

.project-link {
  padding: 10px 16px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  background: var(--accent);
  border-radius: 6px;
  transition: background 150ms ease;
}

.project-link:hover {
  background: var(--accent-bright);
}

/* Medium: media on the left, body and aside on the right. */
@container demo (min-width: 640px) {
  .project-card {
    grid-template-areas:
      "media body"
      "media aside";
    grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1.5fr);
  }

  .project-media {
    min-height: 220px;
  }

  .project-media img {
    position: absolute;
    inset: 0;
    height: 100%;
    aspect-ratio: auto;
  }
}

/* Wide: three columns, the aside becomes a sidebar. */
@container demo (min-width: 920px) {
  .project-card {
    grid-template-areas: "media body aside";
    grid-template-columns: minmax(250px, 0.9fr) minmax(0, 1.5fr) 200px;
  }

  .project-aside {
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
    padding: clamp(20px, 3.4cqi, 32px);
    border-top: 0;
    border-left: 1px solid var(--line);
  }

  .project-meta {
    flex-direction: column;
    gap: 16px;
  }

  .project-link {
    text-align: center;
  }
}
</style>
