/**
 * 세력 고유색을 글자·테두리로 쓸 때 테마 바탕에서 읽히는 표시색을 만든다(다크는 밝히고 라이트는 내린다).
 * 색조는 지키고 밝기만 옮긴다.
 * 칩 텍스트에 쓰고, 원색 그대로는 색 점(도트)으로 보인다.
 */
export function readableFactionColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  // 다크 바탕은 어두운 세력색을 밝히고, 라이트 바탕은 밝은 세력색을 먹색 쪽으로 내린다
  const darkMix = lum < 0.35 ? 30 : lum < 0.55 ? 55 : 85;
  const lightMix = lum > 0.55 ? 45 : lum > 0.35 ? 65 : 85;
  return `light-dark(color-mix(in oklab, ${hex} ${lightMix}%, #1c1914), color-mix(in srgb, ${hex} ${darkMix}%, #f1e9d2))`;
}

/**
 * 칩 테두리 — 어두운 원색에 알파를 씌우면 경계가 아예 사라지므로
 * 표시색을 반투명으로 써 모든 세력의 윤곽이 읽히게 한다.
 */
export function readableFactionBorder(hex: string): string {
  return `color-mix(in srgb, ${readableFactionColor(hex)} 55%, transparent)`;
}
