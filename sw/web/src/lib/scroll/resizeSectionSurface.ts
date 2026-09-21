/** Commit the new section height and compensate offscreen growth before the next paint. */
export function resizeSectionSurface(surface: HTMLElement, height: number, inset: number) {
  const previousHeight = surface.offsetHeight;
  if (Math.abs(height - previousHeight) < 1) return;
  const aboveViewport = surface.getBoundingClientRect().bottom <= inset;
  const previousScroll = window.scrollY;
  surface.style.height = `${height}px`;
  if (aboveViewport) {
    // Capture scroll before shrinking: the browser may clamp it when the page gets shorter.
    window.scrollTo({ top: previousScroll + height - previousHeight, behavior: "instant" });
  }
}
