/**
 * 가상 담화 편집 세부 페이지 경로 값 — `/discourses/{편}/{언어}/{탭}` 의 허용 세그먼트.
 *
 * 주소 어휘(언어 토막·폴더 키 인코딩)는 팩션과 같아서 `faction-edit-route` 를 **그대로 쓴다**.
 * 담화만의 것은 탭 목록뿐이다.
 */

export { folderToParam, paramToFolder } from './faction-edit-route'

/** 편집 언어 — 팩션과 동일(한국어·영문·둘 다) */
export const DISCOURSE_EDIT_LANGS: ReadonlySet<string> = new Set(['ko', 'en', 'both'])

/**
 * 편집 탭 — 담화는 둘이다.
 * - script : 원고 — 대사와 발언 순서. 이 담화의 본문
 * - info   : 인물 — 말하는 사람의 실체와 영상 전체 설정
 *
 * ⚠ 주소 토막은 `shorts`·`info` 를 쓴다. remotion-bo 시절 편집기가 팩션 주소 어휘를 빌려 쓰면서
 *   원고를 `shorts` 자리에 올렸고(`DiscourseEditor.tsx:42 TAB_SEGMENT`), 그 주소로 저장해 둔
 *   북마크가 있다. 이식하면서 주소를 바꾸면 그 링크가 죽으므로 어휘를 유지한다.
 */
export const DISCOURSE_EDIT_TABS: ReadonlySet<string> = new Set(['info', 'shorts', 'longform'])

export type DiscourseEditTab = 'script' | 'info'

/** 경로 세그먼트를 편집 탭으로 정규화 — 인물(info) 말고는 전부 원고 */
export function toDiscourseEditTab(tab: string): DiscourseEditTab {
  return tab === 'info' ? 'info' : 'script'
}

/** 편집 탭 → 주소 한 토막 */
export const DISCOURSE_TAB_SEGMENT: Record<DiscourseEditTab, string> = {
  script: 'shorts',
  info: 'info',
}
