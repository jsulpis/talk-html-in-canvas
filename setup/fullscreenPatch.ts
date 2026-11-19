/**
 * Swallow Slidev's fullscreen toggle in order to be able to use ⌘F/Ctrl+F during the presentation
 */
export function preventToggleFullscreen() {
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "f") {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (
        t?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? "")
      ) {
        return;
      }
      e.stopImmediatePropagation();
    },
    true,
  );
}
