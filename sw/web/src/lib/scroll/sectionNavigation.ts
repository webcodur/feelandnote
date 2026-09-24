/** 초기 배치가 준비된 문서의 제목으로 한 번만 이동한다. */
export function scrollToSection(section: HTMLElement) {
  if (!section.isConnected) return;
  const inset = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const top = section.getBoundingClientRect().top + window.scrollY - inset;
  const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo({ top: Math.max(0, Math.min(top, limit)), behavior: "instant" });
  section.focus({ preventScroll: true });
}
