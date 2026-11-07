<template>
  <div class="canvas-blueprint" aria-label="HTML document structure inside a canvas">
    <div class="canvas-tag">&lt;canvas&gt;</div>
    <header class="box header">
      <span>&lt;header&gt;</span>
      <div class="nav-bars"><i /><i /><i /></div>
    </header>
    <div class="main-row">
      <main class="box main">
        <span>&lt;main&gt;</span>
        <i class="bar primary title-bar" />
        <i class="bar copy-one" />
        <i class="bar copy-two" />
        <div class="button-row">
          <div class="button primary">&lt;button&gt;</div>
          <div class="button box">&lt;span&gt;</div>
        </div>
      </main>
      <aside class="box aside">
        <span>&lt;aside&gt;</span>
        <i class="bar aside-one" />
        <i class="bar aside-two" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.canvas-blueprint {
  display: flex;
  flex-direction: column;
  width: 716px;
  height: 552px;
  padding: 24px;
  gap: 24px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  background: var(--bg-deep);
  border: 2px solid var(--line-strong);
  box-shadow: 0 30px 70px #1e35524d;
}

.canvas-tag {
  height: 42px;
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 42px;
}

.box {
  background: var(--surface);
  border: 1.5px solid var(--line);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 66px;
  padding: 0 20px;
  border-color: var(--accent-bright);
}

.nav-bars {
  display: flex;
  gap: 10px;
}

.nav-bars i {
  width: 34px;
  height: 8px;
  background: var(--accent-soft);
}

.main-row {
  display: flex;
  height: 324px;
  gap: 24px;
}

.main {
  position: relative;
  flex: 1;
}

.main > span,
.aside > span {
  position: absolute;
  top: 18px;
  left: 20px;
}

.bar {
  position: absolute;
  left: 20px;
  display: block;
  height: 14px;
  background: var(--line);
}

.primary {
  color: #ffffff;
  background: var(--accent);
}

.title-bar { top: 70px; width: 280px; }
.copy-one { top: 100px; width: 200px; }
.copy-two { top: 130px; width: 140px; }

.button-row {
  position: absolute;
  right: 20px;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 20px;
}

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 54px;
}

.aside {
  position: relative;
  width: 236px;
}

.aside-one { top: 70px; width: 160px; }
.aside-two { top: 100px; width: 110px; }
</style>
