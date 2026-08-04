// celeb_dialogues 테이블 조회 헬퍼
//
// lines / lines_en 컬럼은 21상황 × 3변형(약 63개 문자열)이 들어있는 JSONB.
// 대부분의 호출부는 greeting과 quote만 필요하므로 Postgres JSON path operator로
// 필요 키만 추출해 egress를 절감한다.

/** 단일 셀럽 조회용 — greeting/quote만 추출 */
export const DIALOGUE_BRIEF_SELECT =
  'greeting:lines->greeting, quote:lines->quote, greeting_en:lines_en->greeting, quote_en:lines_en->quote'

/** 다중 셀럽 조회용 (celeb_id 포함) */
export const DIALOGUE_BRIEF_SELECT_WITH_ID = `celeb_id, ${DIALOGUE_BRIEF_SELECT}`

/** 셀럽 프로필 페이지용 — quote/monologue만 추출 (greeting 제외) */
export const DIALOGUE_PROFILE_SELECT =
  'quote:lines->quote, monologue:lines->monologue, quote_en:lines_en->quote, monologue_en:lines_en->monologue'

export interface DialogueBrief {
  greeting?: string[] | null
  quote?: string | null
  greeting_en?: string[] | null
  quote_en?: string | null
}

export interface DialogueBriefWithId extends DialogueBrief {
  celeb_id: string
}

export interface DialogueProfile {
  quote?: string | null
  monologue?: string | null
  quote_en?: string | null
  monologue_en?: string | null
}

/**
 * quote 필드에서 화면 표시용 문자열을 추출한다.
 * JSON 문자열의 이중 따옴표를 벗기고, 운영용 대괄호 표지는 숨긴다.
 */
export function getDisplayDialogueQuote(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  const quote = raw.startsWith('"') && raw.endsWith('"')
    ? raw.slice(1, -1).trim()
    : raw
  if (!quote || /^\[[\s\S]*\]$/.test(quote)) return null
  return quote
}
