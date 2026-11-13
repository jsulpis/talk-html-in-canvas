<script setup lang="ts">
const steps = [
  {
    title: "Idée & explainer",
    actor: "Développeurs",
    desc: ["Problème identifié", "Explainer rédigé"],
  },
  {
    title: "Incubation",
    actor: "Web Incubator Community Group (WICG)",
    desc: ["Prototype", "Feedback public", "Origin trials"],
    current: true,
  },
  {
    title: "Standardisation",
    actor: "Groupes de travail W3C ou WHATWG",
    desc: ["Spec formelle", "Modèle de sécurité"],
  },
  {
    title: "Implémentation",
    actor: "Navigateurs",
    desc: ["Blink, Gecko, WebKit", "Interop via WPT"],
  },
  {
    title: "Disponibilité",
    actor: "Navigateurs",
    desc: ["Stable partout", "Baseline"],
  },
];
</script>

<template>
  <div class="standards">
    <header class="standards-head">
      <h1>Cycle de vie d’un standard HTML</h1>
    </header>

    <ol class="standards-rail">
      <li
        v-for="(step, i) in steps"
        :key="step.title"
        class="standards-step"
      >
        <span
          v-if="step.current"
          v-click="1"
          class="standards-highlight"
          aria-hidden="true"
        />
        <span class="standards-num">{{ String(i + 1).padStart(2, "0") }}</span>
        <strong>{{ step.title }}</strong>
        <span class="standards-actor">{{ step.actor }}</span>
        <ul class="standards-desc">
          <li v-for="item in step.desc" :key="item">{{ item }}</li>
        </ul>
        <lucide-arrow-right
          v-if="i < steps.length - 1"
          class="standards-arrow"
          aria-hidden="true"
        />
        <span v-if="step.current" v-click="1" class="standards-here">
          HTML-in-Canvas
        </span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.standards {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 104px 106px 150px;
}

.standards-head h1 {
  margin: 0;
  color: var(--text);
  font-size: 3.6rem;
  font-weight: 600;
  line-height: 1.1;
}

.standards-rail {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-content: center;
  gap: 40px;
  padding: 0;
  margin: 5rem 0 0;
  list-style: none;
}

.standards-step {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 30px 24px 32px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: 0 12px 30px #1e355214;
}

.standards-arrow {
  position: absolute;
  top: 50%;
  left: 100%;
  width: 40px;
  height: 40px;
  padding: 3px;
  color: var(--accent);
  translate: 0 -50%;
  stroke-width: 2;
}

.standards-num {
  color: var(--accent-soft);
  font-family: "JetBrains Mono", monospace;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 2px;
}

.standards-step strong {
  color: var(--text);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.2;
}

.standards-actor {
  color: var(--text-body);
  font-family: "JetBrains Mono", monospace;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 0.5em;
}

.standards-desc {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1.35;
  list-style: none;
}

.standards-desc li {
  position: relative;
  padding-left: 20px;
}

.standards-desc li::before {
  position: absolute;
  top: 0.58em;
  left: 0;
  width: 7px;
  height: 7px;
  background: var(--accent-soft);
  content: "";
}

.standards-highlight {
  position: absolute;
  inset: -1px;
  z-index: -1;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
  border: 1px solid var(--accent);
  box-shadow: 0 18px 40px #2563eb26;
}

.standards-highlight::before {
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: var(--accent);
  content: "";
}

.standards-here {
  position: absolute;
  right: 18px;
  bottom: -14px;
  padding: 5px 12px;
  color: #fff;
  font-family: "JetBrains Mono", monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--accent);
}
</style>
