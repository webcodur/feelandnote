'use server'

import { createClient } from '@/lib/supabase/server'

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
}

export type InfluenceAxis = 'political' | 'strategic' | 'tech' | 'social' | 'economic' | 'cultural'

export async function getInfluenceList(): Promise<InfluenceData[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_influence')
    .select(`
      celeb_id,
      political, political_exp,
      strategic, strategic_exp,
      tech, tech_exp,
      social, social_exp,
      economic, economic_exp,
      cultural, cultural_exp,
      transhistoricity, transhistoricity_exp,
      total_score,
      profiles!celeb_influence_celeb_id_fkey (nickname, profession)
    `)
    .order('total_score', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    celeb_id: row.celeb_id,
    nickname: row.profiles?.nickname ?? '',
    profession: row.profiles?.profession ?? null,
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
  }))
}
