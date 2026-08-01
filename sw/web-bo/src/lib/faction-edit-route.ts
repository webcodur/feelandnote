/** 세력도감 편집 세부 페이지 경로 값 — /[series]/[name]/[lang]/[tab] 의 허용 세그먼트 */
export const FACTION_EDIT_LANGS: ReadonlySet<string> = new Set(['ko', 'en', 'both'])

/**
 * 편집 탭 — 정비(데이터 세팅)와 편성(구성 방식)을 가른다.
 * - info     : 정비 — 세력·인물 데이터 그 자체 (편 배정·구성과 무관)
 * - shorts   : 편성 > 쇼츠 — 세력을 편별로 배치하고 편 화면·음악을 정한다
 * - longform : 편성 > 롱폼 — 세력 순서·시대 문구·편 경계를 짠다
 */
export const FACTION_EDIT_TABS: ReadonlySet<string> = new Set(['info', 'shorts', 'longform'])

export type FactionEditTab = 'info' | 'shorts' | 'longform'

/** 경로 세그먼트를 편집 탭으로 정규화 — 알 수 없으면 정비(info) */
export function toFactionEditTab(tab: string): FactionEditTab {
  return tab === 'shorts' || tab === 'longform' ? tab : 'info'
}

/* ── 한 단계 폴더 키 ↔ 주소 한 토막 ── */

export function folderToParam(folder: string): string {
  return encodeURIComponent(folder)
}

/** 주소 한 토막을 폴더 키로 되돌린다. */
export function paramToFolder(param: string): string {
  return decodeURIComponent(param)
}
