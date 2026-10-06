/** 본문 위를 덮는 머리글·구획 제목의 아랫변을 잰다. */
export function topOverlayBottom(exclude: HTMLElement) {
  const bands: { top: number; bottom: number }[] = [];
  document.querySelectorAll("body *").forEach((el) => {
    if (exclude.contains(el)) return;
    const { position } = getComputedStyle(el);
    if (position !== "sticky" && position !== "fixed") return;
    const r = el.getBoundingClientRect();
    if (r.height > 10 && r.height < 240 && r.top < 400 && r.bottom > 0) {
      bands.push({ top: r.top, bottom: r.bottom });
    }
  });
  bands.sort((a, b) => a.top - b.top);
  let bottom = 0;
  for (const band of bands) {
    if (band.top > bottom + 4) break;
    bottom = Math.max(bottom, band.bottom);
  }
  return Math.max(bottom, 80);
}
