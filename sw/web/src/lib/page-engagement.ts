export type EngagementKind = 'celeb' | 'faction'

export const LIKE_COOLDOWN_MS = 5 * 60 * 60 * 1000

export interface PageLikes {
  count: number
  nextLikeAt: string | null
  accepted: boolean
}

export function isEngagementTarget(kind: EngagementKind, id: string): boolean {
  return (kind === 'celeb' || kind === 'faction')
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function canLikeAgain(nextLikeAt: string | null, now = Date.now()): boolean {
  return !nextLikeAt || Date.parse(nextLikeAt) <= now
}
