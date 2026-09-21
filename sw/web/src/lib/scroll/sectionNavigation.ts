/** Keep a section selected by the table of contents in place while earlier content loads. */
let releaseNavigation: (() => void) | undefined;

export function cancelSectionNavigation() {
  releaseNavigation?.();
  releaseNavigation = undefined;
}

export function scrollToSection(section: HTMLElement) {
  cancelSectionNavigation();

  const align = () => {
    if (!section.isConnected) {
      cancelSectionNavigation();
      return;
    }
    const inset = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    const top = section.getBoundingClientRect().top + window.scrollY - inset;
    const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const destination = Math.max(0, Math.min(top, limit));
    if (Math.abs(window.scrollY - destination) > 1) {
      // Smooth scrolling traverses and mounts deferred sections, invalidating its destination.
      window.scrollTo({ top: destination, behavior: "instant" });
    }
  };

  const observer = new ResizeObserver(align);
  // Watch individual sections too: two sections can grow/shrink by the same amount.
  const sections = section.closest("main")?.querySelectorAll("section[id]") ?? [section];
  sections.forEach((element) => observer.observe(element));
  observer.observe(document.body);

  const release = () => {
    observer.disconnect();
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
      window.removeEventListener(event, cancelSectionNavigation, true);
    }
    window.removeEventListener("popstate", cancelSectionNavigation);
    window.removeEventListener("pagehide", cancelSectionNavigation);
  };
  releaseNavigation = release;
  // Any new user gesture owns the viewport. Do not pull the reader back to the heading.
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
    window.addEventListener(event, cancelSectionNavigation, { capture: true, passive: true });
  }
  window.addEventListener("popstate", cancelSectionNavigation);
  window.addEventListener("pagehide", cancelSectionNavigation);

  align();
  section.focus({ preventScroll: true });
}
