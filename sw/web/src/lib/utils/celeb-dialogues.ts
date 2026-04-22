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

export interface DialogueBrief {
  greeting?: string[] | null
  quote?: string | null
  greeting_en?: string[] | null
  quote_en?: string | null
}

export interface DialogueBriefWithId extends DialogueBrief {
  celeb_id: string
}
