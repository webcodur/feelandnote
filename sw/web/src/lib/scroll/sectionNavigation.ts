/** 목차가 고른 구획으로 즉시 이동하며 고정 헤더의 여유와 포커스를 맞춘다. */
export function scrollToSection(section: HTMLElement, container?: HTMLElement) {
  if (!section.isConnected) return;
  const inset = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const top = container
    ? section.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - inset
    : section.getBoundingClientRect().top + window.scrollY - inset;
  const limit = container
    ? Math.max(0, container.scrollHeight - container.clientHeight)
    : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  (container ?? window).scrollTo({ top: Math.max(0, Math.min(top, limit)), behavior: "instant" });
  section.focus({ preventScroll: true });
}
