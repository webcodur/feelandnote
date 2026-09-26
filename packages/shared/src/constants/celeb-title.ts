/**
 * 셀럽 수식어(title·title_en) 길이 규격 — 실행값의 SSoT.
 * 작성 규칙(우선순위·금지 표현)은 docs/project/celeb/celeb-01-03-title.md가 쥔다.
 *
 * 한국어는 글자 수([...s].length)로, 영어는 문자열 길이로 잰다.
 * TARGET은 지향 길이이고 MAX는 저장을 차단하는 상한이다.
 */
export const CELEB_TITLE_KO_TARGET_MAX = 8
export const CELEB_TITLE_KO_MAX = 12
export const CELEB_TITLE_EN_TARGET_MAX = 25
export const CELEB_TITLE_EN_MAX = 40

export const celebTitleLength = (value: string): number => [...value].length

export function celebTitleKoIssue(value: string): string | null {
  const n = celebTitleLength(value)
  if (n < 2) return `title이 ${n}자로 너무 짧다`
  if (n > CELEB_TITLE_KO_MAX) return `title이 ${n}자로 상한 ${CELEB_TITLE_KO_MAX}자를 넘는다`
  return null
}

export function celebTitleEnIssue(value: string): string | null {
  if (!value.trim()) return 'title_en이 비어 있다'
  if (value.length > CELEB_TITLE_EN_MAX) return `title_en이 ${value.length}자로 상한 ${CELEB_TITLE_EN_MAX}자를 넘는다`
  return null
}
