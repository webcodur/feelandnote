export const EXPLORE_MODES = ["figures", "faction", "myth"] as const;
export type ExploreMode = typeof EXPLORE_MODES[number];
export type ExploreSearchParams = Record<string, string | string[] | undefined>;

export function parseExploreMode(value: string | string[] | undefined): ExploreMode {
  return value === "faction" || value === "myth" ? value : "figures";
}

// 모드마다 다른 검색 조건을 넘기지 않으며, 옛 목록 주소의 조건은 명시적으로 전달한다.
export function exploreModeHref(mode: ExploreMode, params: ExploreSearchParams = {}): string {
  const query = new URLSearchParams();
  if (mode !== "figures") query.set("mode", mode);
  for (const [key, value] of Object.entries(params)) {
    if (key === "mode" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  return `/explore${query.size ? `?${query}` : ""}`;
}
