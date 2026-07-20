'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from '@/lib/persona/constants'

/** 분포 차트에 찍히는 인물 (16축 flat 수치 + 영향력 점수) — 근거는 별도 조회 */
export interface PersonaPerson {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  influence: number // 영향력 total_score (0~100)
  stats: Record<string, number>
}

interface ProfileRow {
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
}

// JSONB에서 score만 JSON path로 수신한다.
// persona 통째 select는 행마다 reason_ko/reason_en/rationale 본문(~4.5KB)을 실어
// 갱신 1회에 수 MB가 나간다. 점수 16개만 받으면 행당 수백 바이트다.
const PERSONA_SCORE_KEYS = [
  ...ABILITY_KEYS,
  ...INNER_VIRTUE_KEYS,
  ...OUTER_VIRTUE_KEYS,
  ...TENDENCY_KEYS,
] as const

const SCORE_SELECT = [
  ...ABILITY_KEYS.map((k) => `${k}:persona->abilities->${k}->score`),
  ...INNER_VIRTUE_KEYS.map((k) => `${k}:persona->inner_virtues->${k}->score`),
  ...OUTER_VIRTUE_KEYS.map((k) => `${k}:persona->outer_virtues->${k}->score`),
  ...TENDENCY_KEYS.map((k) => `${k}:persona->dispositions->${k}->score`),
].join(', ')

type PersonaScoreRow = {
  celeb_id: string
  profiles: ProfileRow | ProfileRow[] | null
} & Partial<Record<(typeof PERSONA_SCORE_KEYS)[number], number | null>>

async function fetchPersonaDistribution(limit: number): Promise<PersonaPerson[]> {
  const supabase = createStaticClient()

  // 영향력 점수 맵 (분포는 일부만 보이고 검색은 전체이므로 점수를 인물마다 싣는다).
  // 이것도 1,000행에서 잘렸다 — 1,581명 중 581명이 맵에 없어 영향력이 조용히 0으로
  // 찍혔다(실측). 점수가 없는 게 아니라 못 받은 것이라 눈에 띄지도 않았다.
  const inflData = await selectAllPages<{ celeb_id: string; total_score: number }>((from, to) =>
    supabase.from('celeb_influence').select('celeb_id, total_score').order('celeb_id').range(from, to)
  )
  const inflMap = new Map(inflData.map((r) => [r.celeb_id, r.total_score]))

  // 감상 경위(review) 보유 셀럽만 성향 분석 대상에 넣는다.
  // 이 RPC도 1,000행에서 잘린다 — 1,281명 중 281명이 빠져 성향 점수가 멀쩡히 도착해도
  // 이 명단에 없다는 이유로 걸러졌다(실측). 페이징 없이는 필터가 곧 손실이다.
  const reviewIds = await selectAllPages<{ celeb_id: string }>((from, to) =>
    supabase.rpc('get_review_celeb_ids').order('celeb_id').range(from, to)
  )
  const reviewers = new Set(reviewIds.map((r) => r.celeb_id))

  // 성향 점수 전체 조회 (score만, 근거 텍스트 미수신).
  // .limit(limit)은 1,000행 상한을 못 뚫는다 — limit을 상한으로 넘겨 페이징한다.
  const data = await selectAllPages<PersonaScoreRow>(
    (from, to) =>
      supabase
        .from('celeb_persona')
        .select(`
          celeb_id, ${SCORE_SELECT},
          profiles!celeb_persona_celeb_id_fkey (
            slug, nickname, nickname_en, avatar_url
          )
        `)
        .order('celeb_id')
        .range(from, to) as unknown as PromiseLike<{
        data: PersonaScoreRow[] | null
        error: { message: string } | null
      }>,
    limit
  )

  return data
    .filter((row) => reviewers.has(row.celeb_id))
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const stats = Object.fromEntries(
        PERSONA_SCORE_KEYS.map((k) => [k, row[k] ?? 0])
      ) as Record<string, number>
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
  ['persona-distribution'],
  // celeb_persona + celeb_influence + 감상문 보유 셀럽 목록(user_contents)을 함께 읽는다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.PERSONA, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getPersonaDistribution(limit: number = 3000): Promise<PersonaPerson[]> {
  return getPersonaDistributionCached(limit)
}
