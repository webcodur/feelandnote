'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages, selectInChunks } from '@feelandnote/shared/lib/paginate'
import { TENDENCY_KEYS, type TendencyKey } from '@/lib/persona/constants'

const DEFAULT_LIMIT = 3000
const PERSONA_SEARCH_LIMIT = 8

/** 분포 차트에 찍히는 인물 (성향 4축 수치 + 영향력 점수) — 근거는 별도 조회 */
export interface PersonaPerson {
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

type PersonaScoreRow = {
  celeb_id: string
  profiles: ProfileRow | ProfileRow[] | null
} & Partial<Record<TendencyKey, number | null>>

async function fetchPersonaDistribution(minInfluence: number, limit: number): Promise<PersonaPerson[]> {
  const supabase = createStaticClient()

  // 허브는 실제로 그리는 영향력 임계 이상만 읽는다. 검색은 0으로 호출해 전체 캐시를
  // 서버 안에서만 만들고, 일치한 8명만 클라이언트에 돌려준다.
  const inflData = await selectAllPages<{ celeb_id: string; total_score: number }>((from, to) => {
    let query = supabase.from('celeb_influence').select('celeb_id, total_score')
    if (minInfluence > 0) query = query.gte('total_score', minInfluence)
    return query.order('celeb_id').range(from, to)
  })
  const inflMap = new Map(inflData.map((r) => [r.celeb_id, r.total_score]))

  // 감상 경위(review) 보유 셀럽만 성향 분석 대상에 넣는다.
  // 이 RPC도 1,000행에서 잘린다 — 1,281명 중 281명이 빠져 성향 점수가 멀쩡히 도착해도
  // 이 명단에 없다는 이유로 걸러졌다(실측). 페이징 없이는 필터가 곧 손실이다.
  const reviewIds = await selectAllPages<{ celeb_id: string }>((from, to) =>
    supabase.rpc('get_review_celeb_ids').order('celeb_id').range(from, to)
  )
  const reviewers = new Set(reviewIds.map((r) => r.celeb_id))

  const eligibleIds = (minInfluence > 0
    ? inflData.map((row) => row.celeb_id).filter((id) => reviewers.has(id))
    : reviewIds.map((row) => row.celeb_id)
  ).slice(0, limit)

  // 대상 UUID만 200개씩 묶어 조회한다. 허브 진입 때 1,000명 넘는 persona를 읽고
  // 클라이언트에서 버리던 비용과 단일 대형 RSC 응답을 함께 없앤다.
  const data = await selectInChunks<PersonaScoreRow>(eligibleIds, (chunk) =>
      supabase
        .from('celeb_persona')
        .select(`
          celeb_id, ${SCORE_SELECT},
          profiles!celeb_persona_celeb_id_fkey (
            slug, nickname, nickname_en, avatar_url
          )
        `)
        .in('celeb_id', chunk)
        .order('celeb_id')
        .overrideTypes<PersonaScoreRow[], { merge: false }>() as unknown as PromiseLike<{
        data: PersonaScoreRow[] | null
        error: { message: string } | null
      }>
  )

  return data
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const stats = Object.fromEntries(
        TENDENCY_KEYS.map((k) => [k, row[k] ?? 0])
      ) as Record<TendencyKey, number>
      return {
        id: row.celeb_id,
        slug: profile?.slug ?? null,
        nickname: profile?.nickname ?? '',
        nickname_en: profile?.nickname_en ?? null,
        avatar_url: profile?.avatar_url ?? null,
        influence: inflMap.get(row.celeb_id) ?? 0,
        stats,
      }
    })
    .filter((p) => p.nickname.length > 0)
}

const getPersonaDistributionCached = unstable_cache(
  fetchPersonaDistribution,
  ['persona-distribution-v2'],
  // celeb_persona + celeb_influence + 감상문 보유 셀럽 목록(user_contents)을 함께 읽는다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.PERSONA, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

interface PersonaDistributionOptions {
  minInfluence?: number
  limit?: number
}

export async function getPersonaDistribution({
  minInfluence = 0,
  limit = DEFAULT_LIMIT,
}: PersonaDistributionOptions = {}): Promise<PersonaPerson[]> {
  return getPersonaDistributionCached(Math.max(0, minInfluence), Math.max(1, limit))
}

/** 전체 검색 데이터는 서버 캐시에만 두고, 브라우저에는 일치한 소수만 보낸다. */
export async function searchPersonaPeople(query: string): Promise<PersonaPerson[]> {
  const normalized = query.trim().slice(0, 80).toLocaleLowerCase()
  if (!normalized) return []

  const people = await getPersonaDistribution()
  return people
    .filter((person) =>
      person.nickname.toLocaleLowerCase().includes(normalized)
      || (person.nickname_en?.toLocaleLowerCase().includes(normalized) ?? false)
    )
    .slice(0, PERSONA_SEARCH_LIMIT)
}
