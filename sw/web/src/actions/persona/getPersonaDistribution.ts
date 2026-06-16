'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { parsePersonaJsonb } from '@/lib/persona/types'
import type { PersonaJsonb } from '@/lib/persona/types'

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

interface PersonaRow {
  celeb_id: string
  persona: PersonaJsonb
  profiles: ProfileRow | ProfileRow[] | null
}

async function fetchPersonaDistribution(limit: number): Promise<PersonaPerson[]> {
  const supabase = createStaticClient()

  // 영향력 점수 맵 (분포는 일부만 보이고 검색은 전체이므로 점수를 인물마다 싣는다)
  const { data: inflData, error: inflErr } = await supabase
    .from('celeb_influence')
    .select('celeb_id, total_score')

  if (inflErr) {
    console.error('[getPersonaDistribution] influence 조회 실패:', inflErr.message)
  }
  const inflMap = new Map((inflData ?? []).map((r) => [r.celeb_id, r.total_score]))

  // 감상 경위(review) 보유 셀럽만 성향 분석 대상에 넣는다
  const { data: reviewIds, error: reviewErr } = await supabase.rpc('get_review_celeb_ids')
  if (reviewErr || !reviewIds) {
    console.error('[getPersonaDistribution] review id 조회 실패:', reviewErr?.message ?? 'unknown error')
    return []
  }
  const reviewers = new Set((reviewIds as { celeb_id: string }[]).map((r) => r.celeb_id))

  // 성향 전체 조회
  const { data, error } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (
        slug, nickname, nickname_en, avatar_url
      )
    `)
    .limit(limit)

  if (error || !data) {
    console.error('[getPersonaDistribution] failed:', error?.message ?? 'unknown error')
    return []
  }

  return (data as unknown as PersonaRow[])
    .filter((row) => reviewers.has(row.celeb_id))
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const stats = parsePersonaJsonb(row.persona) as unknown as Record<string, number>
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
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getPersonaDistribution(limit: number = 3000): Promise<PersonaPerson[]> {
  return getPersonaDistributionCached(limit)
}
