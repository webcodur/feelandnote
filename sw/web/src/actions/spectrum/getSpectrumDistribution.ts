'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, spreadRevalidate } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { TENDENCY_KEYS, type TendencyKey } from '@/lib/spectrum/constants'
import { getInfluenceRanking } from '@/actions/home/getCelebs'
import { getReviewCelebIdsCached } from './reviewCelebIds'

const DEFAULT_LIMIT = 3000
const SPECTRUM_SEARCH_LIMIT = 8

/** 분포 차트에 찍히는 인물 (성향 4축 수치 + 영향력 점수) — 근거는 별도 조회 */
export interface SpectrumPerson {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  influence: number // 영향력 total_score (0~100)
  stats: Record<TendencyKey, number>
}

interface ProfileRow {
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
}

// 이 화면은 성향 4축만 쓴다. 능력·덕목 12축을 RSC 경계까지 보내지 않는다.
const SCORE_SELECT = [
  ...TENDENCY_KEYS.map((k) => `${k}:persona->dispositions->${k}->score`),
].join(', ')

type SpectrumScoreRow = {
  celeb_id: string
  celeb: ProfileRow | ProfileRow[] | null
} & Partial<Record<TendencyKey, number | null>>

async function fetchSpectrumDistribution(minInfluence: number, limit: number): Promise<SpectrumPerson[]> {
  const db = createStaticClient()

  // 영향력 — getCelebs와 같은 캐시를 공유한다
  const { scoreMap: inflMapRaw } = await getInfluenceRanking()

  // 감상 기록 보유 셀럽만 성향 분석 대상에 넣는다.
  // 닮은 인물 화면과 같은 명단·같은 캐시를 쓴다 — 감상 행을 매번 훑는 대신
  // 집계 캐시 열을 읽어 다섯 배 빠르고, 두 화면이 한 번만 조회한다(실측 26.08.14: 1,717명 동일).
  const reviewIds = await getReviewCelebIdsCached()
  const reviewers = new Set(reviewIds)

  const inflMapItems = Object.entries(inflMapRaw)
    .filter(([, score]) => minInfluence <= 0 || score >= minInfluence)
  const eligibleIds = (minInfluence > 0
    ? inflMapItems.filter(([id]) => reviewers.has(id)).map(([id]) => id)
    : reviewIds
  ).slice(0, limit)

  // 대상 UUID만 200개씩 묶어 조회한다. 허브 진입 때 1,000명 넘는 spectrum를 읽고
  // 클라이언트에서 버리던 비용과 단일 대형 RSC 응답을 함께 없앤다.
  const data = await selectInChunks<SpectrumScoreRow>(eligibleIds, (chunk) =>
      db
        .from('celeb_persona')
        .select(`
          celeb_id, ${SCORE_SELECT},
          celeb:celebs!celeb_persona_celebs_fkey!inner (
            slug, nickname, nickname_en, avatar_url
          )
        `)
        .in('celeb_id', chunk)
        .eq('celeb.publication_status', 'active')
        .order('celeb_id')
        .overrideTypes<SpectrumScoreRow[], { merge: false }>() as unknown as PromiseLike<{
        data: SpectrumScoreRow[] | null
        error: { message: string } | null
      }>
  )

  return data
    .map((row) => {
      const profile = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb
      const stats = Object.fromEntries(
        TENDENCY_KEYS.map((k) => [k, row[k] ?? 0])
      ) as Record<TendencyKey, number>
      return {
        id: row.celeb_id,
        slug: profile?.slug ?? null,
        nickname: profile?.nickname ?? '',
        nickname_en: profile?.nickname_en ?? null,
        avatar_url: profile?.avatar_url ?? null,
        influence: inflMapRaw[row.celeb_id] ?? 0,
        stats,
      }
    })
    .filter((p) => p.nickname.length > 0)
}

const getSpectrumDistributionCached = unstable_cache(
  fetchSpectrumDistribution,
  ['spectrum-distribution-v2'],
  // celeb_persona + celeb_influence + 감상 기록 보유 셀럽 명단(celeb_metrics)을 함께 읽는다.
  // 만료는 키마다 어긋나게 잡는다 — 함께 식으면 조회가 몰려 3초 제한에 걸린다
  {
    revalidate: spreadRevalidate(STATIC_REVALIDATE, ['spectrum-distribution-v2']),
    tags: [CACHE_TAGS.SPECTRUM, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS],
  }
)

interface SpectrumDistributionOptions {
  minInfluence?: number
  limit?: number
}

export async function getSpectrumDistribution({
  minInfluence = 0,
  limit = DEFAULT_LIMIT,
}: SpectrumDistributionOptions = {}): Promise<SpectrumPerson[]> {
  return getSpectrumDistributionCached(Math.max(0, minInfluence), Math.max(1, limit))
}

/** 전체 검색 데이터는 서버 캐시에만 두고, 브라우저에는 일치한 소수만 보낸다. */
export async function searchSpectrumPeople(query: string): Promise<SpectrumPerson[]> {
  const normalized = query.trim().slice(0, 80).toLocaleLowerCase()
  if (!normalized) return []

  const people = await getSpectrumDistribution()
  return people
    .filter((person) =>
      person.nickname.toLocaleLowerCase().includes(normalized)
      || (person.nickname_en?.toLocaleLowerCase().includes(normalized) ?? false)
    )
    .slice(0, SPECTRUM_SEARCH_LIMIT)
}
