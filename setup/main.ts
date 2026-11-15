import { defineAppSetup } from '@slidev/types'

// Slidev hardcodes `f` → fullscreen (no config to disable it).
// Swallow it in the earliest phase (window capture) so it never reaches
// Slidev's handler, while leaving the browser shortcut (⌘F / Ctrl+F) intact.
export default defineAppSetup(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'f') {
      return
    }
    const t = e.target as HTMLElement | null
    if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')) {
      return
    }
    e.stopImmediatePropagation()
  }, true)
})
