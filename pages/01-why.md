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
transition: view-transition
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
transition: view-transition
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

