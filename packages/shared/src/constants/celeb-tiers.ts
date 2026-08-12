// 셀럽 등급(celeb_tier) 상수 — Single Source of Truth
// celebs.celeb_tier에 CHECK 제약이 없으므로 이 파일이 유일한 규약이다.

export type CelebTier = 'full' | 'light' | 'fiction'

export const CELEB_TIERS: readonly CelebTier[] = ['full', 'light', 'fiction'] as const

// 기본 목록(홈·탐색·타임라인·사이트맵)의 노출 등급. 상단 검색은 SEARCHABLE_CELEB_TIERS를 쓴다.
// fiction은 기본에서 빠지고 필터로 명시할 때만 등장한다. 상세 페이지는 등급과 무관하게 열린다.
export const LISTING_DEFAULT_TIERS: readonly CelebTier[] = ['full', 'light'] as const

// 상세 정보가 공개되는 모든 등급을 sitemap에 싣고 색인한다.
// 목록 기본 노출 여부는 LISTING_DEFAULT_TIERS가 별도로 결정한다.
export const INDEXABLE_TIERS: readonly CelebTier[] = [...CELEB_TIERS] as const

// 실존 인물이 아닌 등급
export const FICTIONAL_TIERS: readonly CelebTier[] = ['fiction'] as const

// 인물 검색에서는 일반 목록 등급에 픽션 인물을 더한다.
export const SEARCHABLE_CELEB_TIERS: readonly CelebTier[] = [
  ...LISTING_DEFAULT_TIERS,
  ...FICTIONAL_TIERS,
] as const

export function isCelebTier(value: string | null | undefined): value is CelebTier {
  return !!value && (CELEB_TIERS as readonly string[]).includes(value)
}

// 문자열/URL 파라미터를 등급 배열로. 쉼표 구분(`fiction,light`), 'all'은 전체 등급.
export function parseCelebTiers(raw: string | null | undefined): CelebTier[] | undefined {
  if (!raw) return undefined
  if (raw === 'all') return [...CELEB_TIERS]
  const tiers = raw.split(',').map(s => s.trim()).filter(isCelebTier)
  return tiers.length > 0 ? [...new Set(tiers)] : undefined
}
