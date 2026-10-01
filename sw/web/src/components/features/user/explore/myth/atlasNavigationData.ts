// 선택 계층의 자료와 모양. 팩션 주소에서도 그룹 선택을 복원한다.
export const ATLAS_GROUP_PARAM = "group";
export type AtlasWorld = "myth" | "faction";
export function atlasStepKeys(world: AtlasWorld) {
  return world === "myth" ? ["region", "myth", "group"] as const : ["theme", "faction", "group"] as const;
}
export const ATLAS_NAV_LAYOUT = {
  root: "mx-auto flex w-full max-w-[420px] flex-col gap-2 md:gap-3",
  row: "grid min-h-12 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-stretch rounded-lg border border-white/20 bg-bg-main md:min-h-14 md:grid-cols-[3.5rem_2.75rem_minmax(0,1fr)_2.75rem]",
  footer: "mt-1 flex flex-wrap items-center gap-2",
} as const;

export interface AtlasGroup { id: string; name: string; count: number }
export interface AtlasEntry {
  id: string;
  name: string;
  count: number;
  disabled?: boolean;
  href?: string;
  /** 「주요 장면」 자료가 있는 항목은 선택기 칩 왼쪽에 이미지 아이콘을 띄운다 */
  scenes?: number;
  groups: AtlasGroup[];
}
export interface AtlasTheme { id: string; name: string; entries: AtlasEntry[] }
export interface AtlasSelection { themeId: string; entryId: string | null; groupId: string | null }

export function firstAtlasEntry(theme: AtlasTheme) {
  return theme.entries.find((entry) => !entry.disabled) ?? null;
}

export function atlasSelection(tree: AtlasTheme[], selection: AtlasSelection) {
  const theme = tree.find((item) => item.id === selection.themeId) ?? tree[0];
  const entry = theme?.entries.find((item) => item.id === selection.entryId) ?? null;
  const group = entry?.groups.find((item) => item.id === selection.groupId) ?? null;
  return { theme, entry, group };
}
