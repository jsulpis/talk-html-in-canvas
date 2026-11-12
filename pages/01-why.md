---
layout: agenda
active: 1
items:
  - Pourquoi ?
  - Quoi ?
  - Comment ?
  - Applications
---

---
layout: vs
divider: true
---

<div class="vs-title">HTML <span class="vs-weak">vs</span> Canvas</div>

---
layout: vs
title: Sémantique
side: html
tree:
  - role: main
    label: landmark
  - role: heading
    label: '« DevFest Lyon », niveau 2'
    level: 1
  - role: form
    label: formulaire
    level: 1
  - role: textbox
    label: '« Votre nom »'
    level: 2
  - role: button
    label: '« Participer »'
    level: 2
---

<main v-click class="semantic-card vs-lead">
  <h2>{{ $slidev.configs.eyebrow }}</h2>
  <form>
    <label for="name">Votre nom</label>
    <input id="name" type="text" autocomplete="name">
    <button type="button">Participer</button>
  </form>
</main>

::right::

<SemanticsPanel code-click :tree="$frontmatter.tree">

```html
<main class="card">
  <h2>DevFest Lyon</h2>

  <form>
    <label for="name">Votre nom</label>
    <input id="name" type="text">

    <button>Participer</button>
  </form>
</main>
```

</SemanticsPanel>

---
layout: vs
title: Sémantique
side: canvas
tree:
  - role: img
    label: '« Une image »'
---

<div v-click class="vs-lead">
  <div class="canvas-frame canvas-hero">
    <svg class="canvas-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="8" y="10" width="48" height="44" rx="3" />
      <circle cx="23" cy="24" r="5" />
      <path d="M12 47l13-14 10 10 7-7 10 11" />
    </svg>
  </div>
</div>

::right::

<SemanticsPanel code-click :tree="$frontmatter.tree">

```html
<canvas
  role="img"
  aria-label="Une image"
></canvas>
```

</SemanticsPanel>

---
layout: vs
title: Sémantique
side: canvas
class: budget-demo
tree:
  - role: table
    label: '« Budget 2026 : 60 000 € », 6 lignes'
  - role: row
    label: '« Poste » · « Montant »'
    level: 1
  - role: row
    label: '« Lieu » · 18 000 €'
    level: 1
  - role: row
    label: '« Restauration » · 15 000 €'
    level: 1
  - role: row
    label: '« Intervenants » · 12 000 €'
    level: 1
  - role: row
    label: '« Matériel » · 9 000 €'
    level: 1
  - role: row
    label: '« Communication » · 6 000 €'
    level: 1
---

<BudgetCanvas class="canvas-donut" />

::right::

<SemanticsPanel class="budget-a11y" :tree="$frontmatter.tree">

```html {|1|3-11}
<canvas aria-hidden="true"></canvas>

<table class="sr-only">
  <caption>Budget 2026 : 60 000 €</caption>
  <tr><th>Poste</th><th>Montant</th></tr>
  <tr><th>Lieu</th><td>18 000 €</td></tr>
  <tr><th>Restauration</th><td>15 000 €</td></tr>
  <tr><th>Intervenants</th><td>12 000 €</td></tr>
  <tr><th>Matériel</th><td>9 000 €</td></tr>
  <tr><th>Communication</th><td>6 000 €</td></tr>
</table>
```

</SemanticsPanel>

---
layout: vs
title: Interactions
side: html
class: cta-pair
---

<div v-click="1" class="cta-stage">
  <CtaButton />
</div>

::right::

<SemanticsPanel :code-click="2">

```html
<button type="button">Bonjour !</button>
```

</SemanticsPanel>

---
layout: vs
title: Interactions
side: html
highlight: true
---

<input
  class="text-demo"
  type="text"
  placeholder="Écrivez ici…"
  aria-label="Écrivez ici"
/>

---
layout: vs
title: Interactions
side: canvas
---

<div class="canvas-frame canvas-hero canvas-solo">
  <svg class="canvas-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="8" y="10" width="48" height="44" rx="3" />
    <circle cx="23" cy="24" r="5" />
    <path d="M12 47l13-14 10 10 7-7 10 11" />
  </svg>
</div>

---
layout: vs
title: Interactions
side: canvas
highlight: true
---

<blockquote class="spec-quote">
  “Implementing text editing controls using the canvas element [...] is a huge amount of work, and authors are most strongly encouraged to
  avoid doing any of it”
  <footer>
    <a
      href="https://html.spec.whatwg.org/multipage/canvas.html#best-practices"
      target="_blank"
      rel="noreferrer"
    >HTML Living Standard</a>
  </footer>
</blockquote>

---
layout: vs
title: Interactions
subtitle: Hit Testing (WebGL)
side: canvas
---

<CanvasCubes class="canvas-large" />

---
layout: vs
title: Interactions
subtitle: Hit Testing (Canvas 2D)
side: canvas
---

<CanvasButton class="canvas-large" />

---
layout: vs
title: Interactions
subtitle: HTML overlay
side: canvas
---

<PetitCauldronShot class="canvas-large" />

---
layout: vs
title: Layout
subtitle: Flex, Grid, Container Queries...
side: html
---

<LayoutDemo />

---
layout: vs
title: Layout
side: canvas
---

<v-switch at="0">
  <template #1>
    <img class="canvas-meme" src="/bon-chance.webp" alt="Mème « Bon chance »" />
  </template>
  <template #2>
    <CanvasOverflow />
  </template>
</v-switch>

---
layout: vs
title: Graphismes
subtitle: ASCII Art
subtitleClick: true
side: html
---

<pre v-click="1" class="dino-art" role="img" aria-label="Dessin d'un dinosaure en art ASCII">              __
             /._)
      .-^^-./ /
     /       /
  __/       /
 &lt;__.|_|-|_|</pre>

---
layout: vs
title: Graphismes
subtitle: "Canvas 2D : ASCII Art"
side: canvas
---

<AsciiArtCanvas />


---
layout: vs
title: Graphismes
subtitle: "Canvas WebGL : explosion"
side: canvas
---

<CubesRadiance />


---
layout: vs
title: Graphismes
subtitle: "Canvas WebGL : shaders, simulations..."
side: canvas
disabled: true
class: balls-cloud
---

<BallsRadiance />


---
layout: vs
title: Graphismes
subtitle: "Canvas WebGL : modèle 3D"
side: canvas
---

<ModelTurntable src="/duck.obj" />

---
layout: vs
title: Graphismes
subtitle: "Canvas WebGL : couleur + géométrie"
side: canvas
---

<ModelDecomposition src="/duck.obj" albedo="/duck_diffuse.png" />


---
layout: vs
title: Graphismes
subtitle: "Canvas WebGL : texture(s)"
side: canvas
---

<DisplacementDecomposition name="/red_brick_03" />

---
layout: default
---

<CompareTable />


---
layout: vs
divider: true
clicks: 1
---

<HtmlInCanvasTitle />
