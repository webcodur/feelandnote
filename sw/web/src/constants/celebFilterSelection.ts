// 직군·국적의 URL, 임시 선택값, 서버 조회가 같은 선택 목록을 쓴다.
export const CELEB_FILTER_SELECTION_LIMITS = { items: 32, valueLength: 80 } as const;
export const CELEB_FILTER_SELECTION_MAX_LENGTH = CELEB_FILTER_SELECTION_LIMITS.items * (CELEB_FILTER_SELECTION_LIMITS.valueLength + 1);

export function filterSelection(value?: string | null): string[] {
  return [...new Set((value ?? "").split(",").map(item => item.trim()).filter(item => item && item !== "all"))].sort();
}

export function serializeFilterSelection(values: readonly string[]): string {
  return filterSelection(values.join(",")).join(",") || "all";
}

export function toggleFilterSelection(current: string, value: string): string {
  if (value === "all") return "all";
  const selected = filterSelection(current);
  return serializeFilterSelection(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
}
