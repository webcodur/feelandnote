/** 홈 감상은 본문 분량으로만 선별한다. 공백·서식·URL은 분량에서 뺀다. */
export const FEATURED_REVIEW_MIN_TEXT_LENGTH = { ko: 400, en: 650 } as const

export interface FeaturedReviewText {
  review: string | null
  review_en: string | null
}

export interface FeaturedReviewCandidate {
  id: string
  celeb_id: string | null
  content_id: string
}

export function featuredReviewTextLength(text: string | null | undefined): number {
  return [...(text ?? '').normalize('NFC')
    .replace(/https?:\/\/\S+|\*\*|__|~~|\s|[\u200B-\u200D\uFEFF]/gu, '')].length
}

export function featuredReviewHasEnoughText(row: FeaturedReviewText): boolean {
  return featuredReviewTextLength(row.review) >= FEATURED_REVIEW_MIN_TEXT_LENGTH.ko
    && featuredReviewTextLength(row.review_en) >= FEATURED_REVIEW_MIN_TEXT_LENGTH.en
}

/** 한국 시간 낮 12시를 기준으로 한영 홈이 같은 날짜를 쓴다. */
export function featuredReviewDay(now = Date.now()): string {
  return new Date(now - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function score(row: FeaturedReviewCandidate): number {
  let hash = 2166136261
  for (const char of `${row.celeb_id}:${row.content_id}:${row.id}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  }
  return hash
}

/** 인물·작품·감상 ID로 순서를 고정하고 날짜마다 다음 후보로 이동한다. 이력은 저장하지 않는다. */
export function orderFeaturedReviews<T extends FeaturedReviewCandidate>(rows: readonly T[], day: string): T[] {
  const pool = [...new Map(rows.filter(row => row.celeb_id).map(row => [row.id, row])).values()]
    .sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id))
  if (!pool.length) return []
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000)
  if (!Number.isFinite(dayNumber)) throw new Error('Invalid featured review day')
  const offset = ((dayNumber % pool.length) + pool.length) % pool.length
  return [...pool.slice(offset), ...pool.slice(0, offset)]
}
