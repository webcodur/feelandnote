'use server'

import { createClient } from '@/lib/db/server'
import type { InfluenceCategoryField } from '@feelandnote/influence-constants/core'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

export interface InfluenceData {
  celeb_id: string
  nickname: string
  profession: string | null
  political: number
  strategic: number
  tech: number
  social: number
  economic: number
  cultural: number
  transhistoricity: number
  total_score: number
  political_exp: string | null
  strategic_exp: string | null
  tech_exp: string | null
  social_exp: string | null
  economic_exp: string | null
  cultural_exp: string | null
  transhistoricity_exp: string | null
  political_exp_en: string | null
  strategic_exp_en: string | null
  tech_exp_en: string | null
  social_exp_en: string | null
  economic_exp_en: string | null
  cultural_exp_en: string | null
  transhistoricity_exp_en: string | null
}

export type InfluenceAxis = InfluenceCategoryField

interface InfluenceQueryRow {
  celeb_id: string
  political: number | null; political_exp: string | null; political_exp_en: string | null
  strategic: number | null; strategic_exp: string | null; strategic_exp_en: string | null
  tech: number | null; tech_exp: string | null; tech_exp_en: string | null
  social: number | null; social_exp: string | null; social_exp_en: string | null
  economic: number | null; economic_exp: string | null; economic_exp_en: string | null
  cultural: number | null; cultural_exp: string | null; cultural_exp_en: string | null
  transhistoricity: number | null; transhistoricity_exp: string | null; transhistoricity_exp_en: string | null
  total_score: number | null
  celeb: { nickname: string | null; profession: string | null } | null
}

export async function getInfluenceList(): Promise<InfluenceData[]> {
  const db = await createClient()

  // 전량 페이징: 정렬 단독으로는 1,000행에서 잘려 하위 순위 인물이 통째로 사라진다.
  // total_score는 동점이 많아 페이징 사이 순서가 흔들리므로 celeb_id를 2차 정렬키로 고정한다.
  const data = await selectAllPages<InfluenceQueryRow>((from, to) =>
    db
      .from('celeb_influence')
      .select(`
        celeb_id,
        political, political_exp, political_exp_en,
        strategic, strategic_exp, strategic_exp_en,
        tech, tech_exp, tech_exp_en,
        social, social_exp, social_exp_en,
        economic, economic_exp, economic_exp_en,
        cultural, cultural_exp, cultural_exp_en,
        transhistoricity, transhistoricity_exp, transhistoricity_exp_en,
        total_score,
        celeb:celebs!celeb_influence_celebs_fkey (nickname, profession)
      `)
      .order('total_score', { ascending: false })
      .order('celeb_id', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
        data: InfluenceQueryRow[] | null
        error: { message: string } | null
      }>
  )

  return data.map((row) => ({
    celeb_id: row.celeb_id,
    nickname: row.celeb?.nickname ?? '',
    profession: row.celeb?.profession ?? null,
    political: row.political ?? 0,
    strategic: row.strategic ?? 0,
    tech: row.tech ?? 0,
    social: row.social ?? 0,
    economic: row.economic ?? 0,
    cultural: row.cultural ?? 0,
    transhistoricity: row.transhistoricity ?? 0,
    total_score: row.total_score ?? 0,
    political_exp: row.political_exp,
    strategic_exp: row.strategic_exp,
    tech_exp: row.tech_exp,
    social_exp: row.social_exp,
    economic_exp: row.economic_exp,
    cultural_exp: row.cultural_exp,
    transhistoricity_exp: row.transhistoricity_exp,
    political_exp_en: row.political_exp_en,
    strategic_exp_en: row.strategic_exp_en,
    tech_exp_en: row.tech_exp_en,
    social_exp_en: row.social_exp_en,
    economic_exp_en: row.economic_exp_en,
    cultural_exp_en: row.cultural_exp_en,
    transhistoricity_exp_en: row.transhistoricity_exp_en,
  }))
}
