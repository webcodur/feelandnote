// 선택 계층의 자료와 모양. 팩션 주소에서도 그룹 선택을 복원한다.
export const ATLAS_GROUP_PARAM = "group";
export const ATLAS_NAV_LAYOUT = {
  root: "mx-auto flex w-full max-w-[420px] flex-col gap-2 md:gap-3",
  row: "grid min-h-11 grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] items-stretch overflow-hidden rounded-lg border border-white/20 bg-bg-main md:min-h-[4.5rem] md:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]",
  footer: "mt-1 flex flex-wrap items-center gap-2",
  action: "inline-flex min-h-10 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-white/20 bg-bg-main px-2 py-2 text-[13px] font-semibold text-text-primary outline-none hover:border-accent hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent md:gap-1.5 md:text-sm",
} as const;

export interface AtlasGroup { id: string; name: string; count: number }
export interface AtlasEntry {
  id: string;
  name: string;
  count: number;
  disabled?: boolean;
  href?: string;
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
