'use server'

import { createClient } from '@/lib/supabase/server'

export interface PersonaData {
  id: string
  celeb_id: string
  nickname: string
  profession: string | null
  // 덕목 (0~100)
  temperance: number
  diligence: number
  reflection: number
  courage: number
  loyalty: number
  benevolence: number
  fairness: number
  humility: number
  // 능력 (0~100)
  command: number
  martial: number
  intellect: number
  charisma: number
  // 성향 (-50~+50)
  pessimism_optimism: number
  conservative_progressive: number
  individual_social: number
  cautious_bold: number
}

export type StatKey =
  | 'temperance' | 'diligence' | 'reflection' | 'courage'
  | 'loyalty' | 'benevolence' | 'fairness' | 'humility'
  | 'command' | 'martial' | 'intellect' | 'charisma'

export type TendencyKey =
  | 'pessimism_optimism' | 'conservative_progressive'
  | 'individual_social' | 'cautious_bold'

export async function getPersonaVectors(): Promise<PersonaData[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_persona')
    .select(`
      id,
      celeb_id,
      temperance, diligence, reflection, courage,
      loyalty, benevolence, fairness, humility,
      command, martial, intellect, charisma,
      pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
      profiles!celeb_persona_celeb_id_fkey (nickname, profession)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    celeb_id: row.celeb_id,
    nickname: row.profiles?.nickname ?? '',
    profession: row.profiles?.profession ?? null,
    temperance: row.temperance,
    diligence: row.diligence,
    reflection: row.reflection,
    courage: row.courage,
    loyalty: row.loyalty,
    benevolence: row.benevolence,
    fairness: row.fairness,
    humility: row.humility,
    command: row.command,
    martial: row.martial,
    intellect: row.intellect,
    charisma: row.charisma,
    pessimism_optimism: row.pessimism_optimism,
    conservative_progressive: row.conservative_progressive,
    individual_social: row.individual_social,
    cautious_bold: row.cautious_bold,
  }))
}
