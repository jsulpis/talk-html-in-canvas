<template>
  <div class="canvas-frame budget-frame">
    <div class="budget-head">
      <strong>Budget 2026</strong>
      <span>60 000 €</span>
    </div>
    <div class="budget-body">
      <svg class="budget-donut" viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r="58" fill="none" stroke="#e2eef5" stroke-width="28" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="#1d67d8" stroke-width="28" pathLength="100" stroke-dasharray="30 70" transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="#2578eb" stroke-width="28" pathLength="100" stroke-dasharray="25 75" stroke-dashoffset="-30" transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="#3b98f6" stroke-width="28" pathLength="100" stroke-dasharray="20 80" stroke-dashoffset="-55" transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="#60b9fa" stroke-width="28" pathLength="100" stroke-dasharray="15 85" stroke-dashoffset="-75" transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="58" fill="none" stroke="#93d3fd" stroke-width="28" pathLength="100" stroke-dasharray="10 90" stroke-dashoffset="-90" transform="rotate(-90 80 80)" />
      </svg>
      <ul class="budget-legend">
        <li><i style="background: #1d67d8" /><span>Lieu</span><small>18 000 €</small></li>
        <li><i style="background: #2578eb" /><span>Restauration</span><small>15 000 €</small></li>
        <li><i style="background: #3b98f6" /><span>Intervenants</span><small>12 000 €</small></li>
        <li><i style="background: #60b9fa" /><span>Matériel</span><small>9 000 €</small></li>
        <li><i style="background: #93d3fd" /><span>Communication</span><small>6 000 €</small></li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.budget-frame {
  padding: 66px 28px 24px;
}

.budget-head {
  position: absolute;
  top: 20px;
  right: 28px;
  left: 28px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
}

.budget-head strong {
  color: var(--text);
  font-size: 1.75rem;
  font-weight: 600;
}

.budget-head span {
  color: var(--text-muted);
  font: 1.375rem 'JetBrains Mono', monospace;
}

.budget-body {
  display: flex;
  align-items: center;
  gap: 28px;
  width: 100%;
}

.budget-donut {
  flex: none;
  width: 300px;
  height: 300px;
}

.budget-legend {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 15px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.budget-legend li {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 12px;
}

.budget-legend i {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.budget-legend span {
  color: var(--text);
  font-size: 1.5rem;
}

.budget-legend small {
  color: var(--text-muted);
  font: 1.25rem 'JetBrains Mono', monospace;
}
</style>
