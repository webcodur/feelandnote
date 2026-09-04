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

// 셀럽 실존 축(celeb_reality) — 이 인물을 세상이 실존(REAL)·전승(FICTION)·양쪽 다(BOTH)로
// 다루는가. celeb_tier(파이프라인 분기: celeb_contents 스펙트럼을 쓰는가, 원전 관계를
// 쓰는가)와 독립된 축이다. DB celebs.celeb_reality의 CHECK 제약이 값 집합의 최종 규약이다.
//
// 지금은 celeb_tier='fiction' 행이 그대로 남아 있어(celeb_reality는 거기서 역산 백필만
// 됨) 목록·검색 노출은 여전히 tier 기준으로 정확하다. 이 상수는 BOTH 인물이 실제로 생겨
// tier(full/light, 실존 파이프라인 유지)와 reality(BOTH, 신화 자료도 있음)가 갈리는
// 순간부터 쓰기 시작한다 — 그 전까지 목록 필터를 reality로 미리 바꿔봐야 결과가 같다.
export type CelebReality = 'REAL' | 'BOTH' | 'FICTION'

export const CELEB_REALITIES: readonly CelebReality[] = ['REAL', 'BOTH', 'FICTION'] as const

// 실존 인물 목록(홈·탐색·타임라인·검색·게임)에 나올 자격. FICTION만 제외한다 —
// BOTH는 실존 쪽에도 걸쳐 있으므로 계속 나온다.
export const LISTING_DEFAULT_REALITIES: readonly CelebReality[] = ['REAL', 'BOTH'] as const

export function isCelebReality(value: string | null | undefined): value is CelebReality {
  return !!value && (CELEB_REALITIES as readonly string[]).includes(value)
}
