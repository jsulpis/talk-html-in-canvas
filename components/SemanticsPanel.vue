<script setup lang="ts">
interface TreeNode {
  role: string;
  label?: string;
  level?: 1 | 2;
}

defineProps<{
  tree?: TreeNode[];
  codeClick?: boolean;
}>();
</script>

<template>
  <div class="semantic-panel">
    <div v-if="codeClick" v-click class="semantic-code">
      <slot />
    </div>
    <div v-else class="semantic-code">
      <slot />
    </div>

    <div v-if="tree" v-click class="semantic-a11y">
      <span class="semantic-a11y-label">Arbre d’accessibilité</span>
      <div class="a11y-tree">
        <div
          v-for="node in tree"
          :key="`${node.role}-${node.label}`"
          class="a11y-node"
          :class="node.level && `level-${node.level}`"
        >
          <b>{{ node.role }}</b>
          <small v-if="node.label">{{ node.label }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.semantic-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
}

.semantic-panel > * {
  grid-area: 1 / 1;
}

.semantic-panel:has(> .semantic-a11y:not(.slidev-vclick-hidden))
  > .semantic-code {
  opacity: 0 !important;
  pointer-events: none;
}

.semantic-code {
  --slidev-code-font-size: 1.75rem;
  --slidev-code-line-height: 1.5;
  --slidev-code-padding: 24px;
  --slidev-code-margin: 0;
  --slidev-code-radius: 0;
  --slidev-code-background: var(--surface);
}

.budget-a11y .semantic-code {
  --slidev-code-font-size: 1.55rem;
  --slidev-code-line-height: 1.4;
  --slidev-code-padding: 18px;
}

.semantic-code :deep(pre.slidev-code) {
  margin: 18px 0;
  padding: 24px;
  overflow: auto;
  font-size: 1.3125rem;
  line-height: 1.45;
  background: #ffffff;
  border: 1px solid var(--line);
}

.semantic-a11y {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
}

.semantic-a11y-label {
  padding-bottom: 14px;
  color: var(--text);
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.2;
  border-bottom: 1px solid var(--line);
}

.semantic-a11y .a11y-tree {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.semantic-a11y .a11y-node {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 16px;
  background: #e8f0fa;
  border-left: 3px solid var(--accent);
}

.semantic-a11y .a11y-node.level-1 {
  margin-left: 22px;
}

.semantic-a11y .a11y-node.level-2 {
  margin-left: 44px;
}

.semantic-a11y b {
  color: var(--text);
  font:
    1.75rem "JetBrains Mono",
    monospace;
}

.semantic-a11y small {
  color: var(--text-muted);
  font-size: 1.25rem;
}

.budget-a11y .a11y-tree {
  gap: 7px;
}

.budget-a11y .a11y-node {
  padding: 4px 12px;
}

.budget-a11y .a11y-node b {
  font-size: 1.75rem;
}

.budget-a11y .a11y-node small {
  font-size: 1.25rem;
}
</style>
