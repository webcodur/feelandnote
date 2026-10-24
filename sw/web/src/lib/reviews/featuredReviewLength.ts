/** 홈 감상은 본문 분량으로만 선별한다. 공백·서식·URL은 분량에서 뺀다. */
export const FEATURED_REVIEW_MIN_TEXT_LENGTH = { ko: 300, en: 500 } as const

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

function score(key: string): number {
  let hash = 2166136261
  for (const char of key) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  }
  return hash
}

function rotate<T>(rows: readonly T[], turn: number): T[] {
  const offset = ((turn % rows.length) + rows.length) % rows.length
  return [...rows.slice(offset), ...rows.slice(0, offset)]
}

/** 인물마다 하루씩 순환하고, 다음 차례에는 그 인물의 다음 감상을 고른다. 이력은 저장하지 않는다. */
export function orderFeaturedReviews<T extends FeaturedReviewCandidate>(rows: readonly T[], day: string): T[] {
  const pool = [...new Map(rows.filter(row => row.celeb_id).map(row => [row.id, row])).values()]
    .sort((a, b) => score(`${a.celeb_id}:${a.content_id}:${a.id}`) - score(`${b.celeb_id}:${b.content_id}:${b.id}`) || a.id.localeCompare(b.id))
  if (!pool.length) return []
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000)
  if (!Number.isFinite(dayNumber)) throw new Error('Invalid featured review day')
  const byPerson = new Map<string, T[]>()
  for (const row of pool) {
    const reviews = byPerson.get(row.celeb_id!) ?? []
    reviews.push(row)
    byPerson.set(row.celeb_id!, reviews)
  }
  const people = [...byPerson.keys()].sort((a, b) => score(a) - score(b) || a.localeCompare(b))
  const personTurn = Math.floor(dayNumber / people.length)
  const groups = rotate(people, dayNumber).map(id => rotate(byPerson.get(id)!, personTurn))
  const ordered: T[] = []
  // 판매 불가 후보를 건너뛸 때도 다른 인물의 첫 후보를 모두 본 뒤 두 번째 감상을 확인한다.
  for (let round = 0; ordered.length < pool.length; round++) {
    for (const group of groups) {
      if (round < group.length) ordered.push(group[round])
    }
  }
  return ordered
}
