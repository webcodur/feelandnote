/** 목차가 고른 구획으로 부드럽게 이동한다. 모션 줄이기 환경에서는 즉시 이동한다. */
export function scrollToSection(section: HTMLElement) {
  if (!section.isConnected) return;
  const inset = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const top = section.getBoundingClientRect().top + window.scrollY - inset;
  const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  window.scrollTo({ top: Math.max(0, Math.min(top, limit)), behavior: reduceMotion ? "instant" : "smooth" });
  section.focus({ preventScroll: true });
}
