/**
 * 세력 고유색이 어두워 다크 배경에서 글자·테두리로 안 읽힐 때,
 * 색조는 지키고 밝기만 크림색 쪽으로 올린 표시색을 만든다.
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
  const mix = lum < 0.35 ? 45 : lum < 0.55 ? 65 : 85;
  return `color-mix(in srgb, ${hex} ${mix}%, #f1e9d2)`;
}
