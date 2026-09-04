// 셀럽 등급(celeb_tier) 상수 — Single Source of Truth
// celebs.celeb_tier에 CHECK 제약이 없으므로 이 파일이 유일한 규약이다.
//
// 26.09.04: celeb_tier에서 'fiction'을 폐기했다. celeb_tier는 파이프라인 분기(full/light)만
// 정하고, 실존·전승 판단은 아래 celeb_reality가 전담한다. 목록·검색 노출에서 픽션 인물을
// 빼거나 더하던 자리는 전부 LISTING_DEFAULT_REALITIES·celeb_reality 기준으로 옮겼다 —
// 이 파일에서 celeb_tier 기반 필터를 찾고 있다면 그 아래 celeb_reality 절을 대신 써라.

export type CelebTier = 'full' | 'light'

export const CELEB_TIERS: readonly CelebTier[] = ['full', 'light'] as const

// 상세 정보가 공개되는 모든 등급을 sitemap에 싣고 색인한다.
export const INDEXABLE_TIERS: readonly CelebTier[] = [...CELEB_TIERS] as const

export function isCelebTier(value: string | null | undefined): value is CelebTier {
  return !!value && (CELEB_TIERS as readonly string[]).includes(value)
}

// 문자열/URL 파라미터를 등급 배열로. 쉼표 구분(`full,light`), 'all'은 전체 등급.
export function parseCelebTiers(raw: string | null | undefined): CelebTier[] | undefined {
  if (!raw) return undefined
  if (raw === 'all') return [...CELEB_TIERS]
  const tiers = raw.split(',').map(s => s.trim()).filter(isCelebTier)
  return tiers.length > 0 ? [...new Set(tiers)] : undefined
}

// 셀럽 실존 축(celeb_reality) — 이 인물을 세상이 실존(REAL)·전승(FICTION)·양쪽 다(BOTH)로
// 다루는가. celeb_tier(파이프라인 분기: full/light)와 독립된 축이다. DB celebs.celeb_reality의
// CHECK 제약이 값 집합의 최종 규약이다.
//
// 홈·탐색·타임라인·검색·게임 등 목록·노출 필터는 전부 이 축을 쓴다. celeb_tier에는
// 더 이상 픽션 여부가 담기지 않으므로 celeb_tier로 노출을 가르지 않는다.
export type CelebReality = 'REAL' | 'BOTH' | 'FICTION'

export const CELEB_REALITIES: readonly CelebReality[] = ['REAL', 'BOTH', 'FICTION'] as const

// 기본 목록(홈·탐색·타임라인·사이트맵·게임)의 노출 자격. FICTION만 빠진다 —
// BOTH는 실존 쪽에도 걸쳐 있으므로 계속 나온다. 인물 검색은 이 필터를 적용하지
// 않는다(FICTION도 검색되어야 한다) — CELEB_REALITIES 전체가 곧 검색 대상이다.
export const LISTING_DEFAULT_REALITIES: readonly CelebReality[] = ['REAL', 'BOTH'] as const

export function isCelebReality(value: string | null | undefined): value is CelebReality {
  return !!value && (CELEB_REALITIES as readonly string[]).includes(value)
}

// 문자열/URL 파라미터를 실존 축 배열로. 쉼표 구분(`REAL,BOTH`), 'all'은 전체.
export function parseCelebRealities(raw: string | null | undefined): CelebReality[] | undefined {
  if (!raw) return undefined
  if (raw === 'all') return [...CELEB_REALITIES]
  const realities = raw.split(',').map(s => s.trim()).filter(isCelebReality)
  return realities.length > 0 ? [...new Set(realities)] : undefined
}
