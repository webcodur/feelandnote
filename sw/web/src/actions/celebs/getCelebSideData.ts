'use server'

// 분석 첫 탭은 초기 HTML에, 나머지 부가 자료는 사용자 선택 시 전달한다.
// 조회는 기존 캐시 함수를 재사용한다.

import { getCelebInfluence, type CelebInfluenceDetail } from '@/actions/home/getCelebInfluence'
import { getInfluenceExplorer, type InfluenceExplorerData } from '@/actions/home/getInfluenceExplorer'
import { getFactionsByIds, type FeaturedFaction } from '@/actions/home/getFeaturedFactions'
import { getSimilarByCelebId, type SimilarByCelebResult } from '@/actions/spectrum/getSimilarByCelebId'
import { getCelebBySlug } from '@/actions/user/getCelebBySlug'
import type { FactionItem } from '@/actions/user/getCelebBySlug'

export interface CelebFactionsData {
  factions: FeaturedFaction[]
  /** 이 인물 자신의 세력 배정 — 세력별 역할·긴 소개·세력 화보를 든다 */
  memberships: FactionItem[]
}

export interface CelebAnalysisData {
  influence: CelebInfluenceDetail | null
  influenceExplorer: InfluenceExplorerData | null
  spectrum: SimilarByCelebResult | null
}

/** 선택한 세력 탭의 화보와 소속 정보 */
export async function getCelebFactions(
  slug: string,
  locale: string,
): Promise<CelebFactionsData> {
  const result = await getCelebBySlug(slug, locale)
  if (!result.success || !result.data) {
    return { factions: [], memberships: [] }
  }

  const profile = result.data
  const factions = await getFactionsByIds(
    profile.factions.map((faction) => faction.id),
  )

  // 화면에 서는 세력에 대응하는 배정만 남긴다 — 신화·비공개 세력 배정은 factions와 같은 기준으로 걸러진다
  const featuredIds = new Set(factions.map((faction) => faction.id))
  const memberships = profile.factions.filter((faction) => featuredIds.has(faction.id))

  return { factions, memberships }
}

/** 초기 배치에는 첫 탭만 포함한다. 숨겨진 영향력 탐색기는 선택할 때 조회한다. */
export async function getCelebInitialAnalysis(
  celebId: string,
  locale: string,
  presence: { spectrum: boolean; influence: boolean },
): Promise<CelebAnalysisData> {
  if (presence.spectrum) {
    return { spectrum: await getSimilarByCelebId(celebId, 3, locale), influence: null, influenceExplorer: null }
  }
  if (presence.influence) {
    const [influence, influenceExplorer] = await Promise.all([
      getCelebInfluence(celebId, locale), getInfluenceExplorer(celebId, locale),
    ])
    return { spectrum: null, influence, influenceExplorer }
  }
  return { spectrum: null, influence: null, influenceExplorer: null }
}
