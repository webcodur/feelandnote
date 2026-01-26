'use server'

import { createClient } from '@/lib/supabase/server'
import {
  type Aura,
  AURA_ORDER_DESC, // 9 -> 1 순서
  getAuraByScore,
  calculatePercentile,
} from '@/constants/materials'

export interface RankedCeleb {
  id: string
  nickname: string
  avatar_url: string | null
  profession: string | null
  total_score: number
  aura: Aura
  percentile: number
  ranking: number
}

export interface InfluenceDistribution {
  counts: Record<Aura, number>
  total: number
  // 오라별 대표 셀럽 (상위 3명)
  topCelebs: {
    aura: Aura
    celebs: { id: string; nickname: string; avatar_url: string | null; total_score: number }[]
  }[]
  // 전체 랭킹 리스트 (점수 순)
  ranking: RankedCeleb[]
}

export async function getInfluenceDistribution(): Promise<InfluenceDistribution> {
  const supabase = await createClient()

  // 영향력 데이터와 프로필 조인
  const { data } = await supabase
    .from('celeb_influence')
    .select(`
      celeb_id,
      total_score,
      profiles!celeb_influence_celeb_id_fkey (
        id,
        nickname,
        avatar_url,
        profession,
        status
      )
    `)
    .order('total_score', { ascending: false })

  // 초기값 설정 (1~9 오라 모두 0으로 초기화)
  const initialCounts: Record<Aura, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
  }

  const distribution: InfluenceDistribution = {
    counts: { ...initialCounts },
    total: 0,
    topCelebs: [],
    ranking: []
  }

  if (!data) return distribution

  // 활성 셀럽만 필터링
  const activeCelebs = data.filter(row => {
    const profile = row.profiles as unknown as {
      id: string
      nickname: string
      avatar_url: string | null
      profession: string | null
      status: string
    }
    return profile && profile.status === 'active'
  })

  const total = activeCelebs.length
  distribution.total = total

  // 오라별 그룹핑
  const auraGroups: Record<Aura, { id: string; nickname: string; avatar_url: string | null; total_score: number }[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
  }

  activeCelebs.forEach((row, index) => {
    const profile = row.profiles as unknown as {
      id: string
      nickname: string
      avatar_url: string | null
      profession: string | null
      status: string
    }

    // 순위 기반 percentile (참고용)
    const ranking = index + 1
    const percentile = calculatePercentile(ranking, total)
    
    // 오라 결정: 이제 점수 기반 (절대 평가)
    const score = row.total_score ?? 0;
    const aura = getAuraByScore(score);

    distribution.counts[aura]++

    // 전체 랭킹 리스트에 추가
    distribution.ranking.push({
      id: profile.id,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url,
      profession: profile.profession,
      total_score: score,
      aura,
      percentile,
      ranking
    })

    // 각 오라별 상위 3명만 저장
    if (auraGroups[aura].length < 3) {
      auraGroups[aura].push({
        id: profile.id,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        total_score: score
      })
    }
  })

  // topCelebs 배열 구성 (높은 오라 순서대로: 9 -> 1)
  distribution.topCelebs = AURA_ORDER_DESC
    .filter(aura => auraGroups[aura].length > 0)
    .map(aura => ({
      aura,
      celebs: auraGroups[aura]
    }))

  return distribution
}
