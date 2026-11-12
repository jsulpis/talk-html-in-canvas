<template>
  <table class="compare-table">
    <thead>
      <tr>
        <th scope="col"></th>
        <th scope="col">HTML</th>
        <th scope="col">Canvas</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Sémantique</th>
        <td>✅&ensp;Natif</td>
        <td>⚠️&ensp;Limitée</td>
      </tr>
      <tr>
        <th scope="row">Interactions</th>
        <td>✅&ensp;Natif</td>
        <td>⚠️&ensp;À coder</td>
      </tr>
      <tr>
        <th scope="row">Layout</th>
        <td>✅&ensp;Flex, Grid...</td>
        <td>⚠️&ensp;À coder</td>
      </tr>
      <tr>
        <th scope="row">Graphismes</th>
        <td>⚠️&ensp;Limités</td>
        <td>✅&ensp;Avancés (2D & 3D)</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.compare-table {
  width: min(100%, 1200px);
  margin: 0 auto;
  border-collapse: collapse;
  font-size: 2rem;
  line-height: 1.3;
}

.compare-table th,
.compare-table td {
  padding: 26px 40px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--line);
}

.compare-table thead th {
  padding-top: 0;
  padding-bottom: 18px;
  color: var(--text-muted);
  font-family: "JetBrains Mono", monospace;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  border-bottom: 2px solid var(--line-strong);
}

.compare-table thead th:first-child {
  width: 360px;
}

.compare-table tbody th {
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
}

.compare-table tbody td {
  color: var(--text-body);
}

.compare-table tbody tr:last-child th,
.compare-table tbody tr:last-child td {
  border-bottom: 0;
}
</style>
