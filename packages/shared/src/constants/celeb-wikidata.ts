/**
 * `celebs.wikidata_qid` 값 규약. 판정 규칙은 docs/project/celeb/celeb-01-01-profile-facts.md 「Wikidata QID」가 쥔다.
 *
 * - null(빈 값): 아직 조사하지 않았거나 확신하지 못했다. QID 조사 도구의 대상이다.
 * - `Q숫자`: 검증한 Wikidata 항목이다.
 * - WIKIDATA_QID_NONE: Wikidata에 그 인물의 항목이 없음을 조사로 확인했다. 다시 조사하지 않는다.
 *
 * 여러 인물이 같은 없음 표시를 가지므로, QID로 사람을 잇는 코드(중복 판정·관계·외부 링크·위키데이터 조회)는
 * 원본 값 대신 wikidataQidOf()를 거친다.
 */
export const WIKIDATA_QID_NONE = 'NONE'

const WIKIDATA_QID = /^Q\d+$/

/** 실제 Wikidata 항목 ID만 돌려준다. 빈 값·없음 표시·형식이 틀린 값은 null이다. */
export function wikidataQidOf(value: string | null | undefined): string | null {
  const qid = value?.trim().toUpperCase() ?? ''
  return WIKIDATA_QID.test(qid) ? qid : null
}

/** QID 조사가 필요한 값인가. 없음이 확인된 인물과 이미 QID가 있는 인물은 조사하지 않는다. */
export function needsWikidataQidResearch(value: string | null | undefined): boolean {
  return !value?.trim()
}
