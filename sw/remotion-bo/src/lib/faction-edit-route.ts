/**
 * 언어·탭 편집 화면 공용 상수 — /[series]/[name]/[lang]/[tab] 의 허용 경로 값.
 *
 * 이름에 faction 이 남아 있지만 세력도 전용이 아니다. 세력도가 web-bo 로 이관되면서
 * 이 상수의 실사용자는 담화(가상 담화) 편집 화면 하나다. 참조 6곳 개명은 별건으로 둔다.
 */
export const FACTION_EDIT_LANGS: ReadonlySet<string> = new Set(['ko', 'en', 'both'])

/**
 * 편집 탭 — 정비(데이터 세팅)와 편성(구성 방식)을 가른다.
 * - info     : 정비 — 인물 데이터 그 자체 (편 배정·구성과 무관)
 * - shorts   : 편성 > 쇼츠 (담화는 이 자리에 「원고」를 올린다)
 * - longform : 편성 > 롱폼
 */
export const FACTION_EDIT_TABS: ReadonlySet<string> = new Set(['info', 'shorts', 'longform'])

export type FactionEditTab = 'info' | 'shorts' | 'longform'

/** 경로 세그먼트를 편집 탭으로 정규화 — 알 수 없으면 정비(info) */
export function toFactionEditTab(tab: string): FactionEditTab {
  return tab === 'shorts' || tab === 'longform' ? tab : 'info'
}
