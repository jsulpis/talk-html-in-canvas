<template>
  <Slide class="cover">
    <main class="cover-main">
      <section class="cover-copy">
        <div class="cover-heading">
          <p class="cover-eyebrow">{{ $frontmatter.eyebrow }}</p>
          <div>
            <h1 class="cover-title">{{ $frontmatter.title }}</h1>
            <p class="cover-subtitle">{{ $frontmatter.subtitle }}</p>
          </div>
        </div>
        <div class="cover-rule" />
        <div class="cover-meta">
          <span class="cover-speaker">{{ $frontmatter.speaker }}</span>
          <i class="cover-divider" />
          <span class="cover-role">{{ $frontmatter.role }}</span>
        </div>
        <img class="cover-logo" src="/Scaleway-Logo.png" alt="Scaleway">
      </section>
      <CanvasBlueprint />
    </main>
    <SlideFooter label="04/12/2026" />
  </Slide>
</template>

<style scoped>
.cover-main {
  position: absolute;
  z-index: 1;
  top: 254px;
  left: 97px;
  display: flex;
  align-items: center;
  gap: 100px;
}

.cover-copy {
  display: flex;
  flex-direction: column;
  width: 910px;
  gap: 40px;
}

.cover-heading {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cover-eyebrow {
  margin: 0;
  color: var(--accent-bright);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.125rem;
  font-weight: 700;
  letter-spacing: 5px;
  line-height: 1.2;
}

.slidev-layout.cover .cover-title {
  margin: 0;
  color: var(--text);
  font-family: Inter, sans-serif;
  font-size: 6.625rem;
  font-weight: 900;
  line-height: 1;
}

.slidev-layout.cover .cover-subtitle {
  margin: .75rem 0 0;
  color: var(--text-secondary);
  font-family: Inter, sans-serif;
  font-size: 3.25rem;
  font-weight: 400;
  font-style: italic;
  line-height: 1.15;
  white-space: pre-line;
  opacity: 1;
}

.cover-rule {
  width: 160px;
  height: 5px;
  background: var(--accent);
}

.cover-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  white-space: nowrap;
}

.cover-speaker {
  color: var(--text-body);
  font-size: 2.25rem;
  font-weight: 600;
}

.cover-divider {
  width: 2px;
  height: 30px;
  background: var(--text-muted);
}

.cover-role {
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.625rem;
}

.cover-logo {
  display: block;
  width: 323px;
  height: auto;
}
</style>
