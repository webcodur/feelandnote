/** 독서 방식은 REAL·BOTH의 최초 1회 조사 요건이며, 본문 보유 요건이 아니다. */
export function hasCompletedReadingWayResearch(profile: {
  celeb_reality?: unknown
  reading_way?: unknown
  reading_way_en?: unknown
}): boolean {
  if (profile.celeb_reality === 'FICTION') return true
  if (profile.celeb_reality !== 'REAL' && profile.celeb_reality !== 'BOTH') return false
  if (profile.reading_way === '' && profile.reading_way_en === '') return true
  return typeof profile.reading_way === 'string' && profile.reading_way.trim().length > 0
}

/** 독서 방식 한국어 본문 분량 상한(26.10.30 사용자 승인). 글자 수는 공백·줄바꿈을 포함한 문자 수다. */
export const READING_WAY_KO_MAX_CHARS = 1800
export const READING_WAY_MAX_PARAGRAPHS = 4

/** 빈 줄 여부와 관계없이 줄바꿈으로 나뉜 비어 있지 않은 덩어리를 문단으로 센다. */
export function readingWayParagraphCount(text: string): number {
  return text.split(/\n+/u).filter(part => part.trim()).length
}

/** 상한을 넘으면 실제 글자·문단 수를, 안이거나 조사 미달(빈 본문)이면 null을 돌려준다. */
export function readingWayLengthExcess(ko: string): { chars: number; paragraphs: number } | null {
  if (!ko.trim()) return null
  const chars = [...ko].length, paragraphs = readingWayParagraphCount(ko)
  return chars > READING_WAY_KO_MAX_CHARS || paragraphs > READING_WAY_MAX_PARAGRAPHS ? { chars, paragraphs } : null
}
