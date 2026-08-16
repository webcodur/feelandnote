'use server'

/*
  파일명: /actions/celebs/getCelebSideData.ts
  기능: 인물 상세의 관계·분석 구획 자료를 화면이 다가왔을 때 한 번에 내준다
  책임: 이 두 구획은 첫 화면 밖이고 검색 본문이 아니면서 덩치가 크다.
        서버 HTML에 실으면 ISR 한 장이 굳을 때마다 그대로 복사된다
        (external-services.md「ISR 쓰기 비용 규칙」).
        조회 자체는 기존 캐시 함수를 그대로 재사용한다.
*/ // ------------------------------

import { getContemporaries, type ContemporaryCeleb } from '@/actions/celebs/getContemporaries'
import { getCelebInfluence, type CelebInfluenceDetail } from '@/actions/home/getCelebInfluence'
import { getInfluenceExplorer, type InfluenceExplorerData } from '@/actions/home/getInfluenceExplorer'
import { getFactionTagsByIds, type FeaturedTag } from '@/actions/home/getFeaturedTags'
import { getSimilarByCelebId, type SimilarByCelebResult } from '@/actions/spectrum/getSimilarByCelebId'
import { getCelebBySlug } from '@/actions/user/getCelebBySlug'
import type { CelebRelationItem } from '@/actions/user/getCelebBySlug'

export interface CelebConnectionsData {
  relations: CelebRelationItem[]
  contemporaries: ContemporaryCeleb[]
  factions: FeaturedTag[]
}

export interface CelebAnalysisData {
  influence: CelebInfluenceDetail | null
  influenceExplorer: InfluenceExplorerData | null
  spectrum: SimilarByCelebResult | null
}

/** 관계 구획 — 인연·동시대 인물·세력도감 */
export async function getCelebConnections(
  slug: string,
  locale: string,
): Promise<CelebConnectionsData> {
  const result = await getCelebBySlug(slug, locale)
  if (!result.success || !result.data) {
    return { relations: [], contemporaries: [], factions: [] }
  }

  const profile = result.data
  const isFiction = profile.celeb_tier === 'fiction'
  const [contemporaries, factions] = await Promise.all([
    !isFiction && profile.birth_date
      ? getContemporaries(profile.id, profile.birth_date, profile.death_date, locale)
      : Promise.resolve([]),
    getFactionTagsByIds(profile.factionTags.map((tag) => tag.id)),
  ])

  return { relations: profile.relations, contemporaries, factions }
}

/** 분석 구획 — 성향 스펙트럼·영향력 */
export async function getCelebAnalysis(
  celebId: string,
  locale: string,
): Promise<CelebAnalysisData> {
  const [influence, influenceExplorer, spectrum] = await Promise.all([
    getCelebInfluence(celebId, locale),
    getInfluenceExplorer(celebId, locale),
    getSimilarByCelebId(celebId, 3, locale),
  ])

  return { influence, influenceExplorer, spectrum }
}
