'use server'

import { createClient } from '@/lib/supabase/server'
import { STAT_KEYS, TENDENCY_KEYS } from '@/lib/persona/constants'
import { calcDistance, type PersonaVector, type SimilarCeleb } from '@/lib/persona/utils'

export interface SimilarByCelebResult {
  targetPersona: PersonaVector | null
  similarCelebs: SimilarCeleb[]
}

export async function getSimilarByCelebId(
  celebId: string,
  limit: number = 5
): Promise<SimilarByCelebResult> {
  const supabase = await createClient()

  const { data: target, error: targetError } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id,
      temperance, diligence, reflection, courage,
      loyalty, benevolence, fairness, humility,
      command, martial, intellect, charisma,
      pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
      profiles!celeb_persona_celeb_id_fkey (nickname, profession, avatar_url, birth_date, death_date, title)
    `)
    .eq('celeb_id', celebId)
    .single()

  if (targetError || !target) {
    return { targetPersona: null, similarCelebs: [] }
  }

  const targetPersona: PersonaVector = {
    celeb_id: target.celeb_id,
    nickname: (target as any).profiles?.nickname ?? '',
    profession: (target as any).profiles?.profession ?? null,
    avatar_url: (target as any).profiles?.avatar_url ?? null,
    birth_date: (target as any).profiles?.birth_date ?? null,
    death_date: (target as any).profiles?.death_date ?? null,
    title: (target as any).profiles?.title ?? null,
    influence_score: 0,
    temperance: target.temperance,
    diligence: target.diligence,
    reflection: target.reflection,
    courage: target.courage,
    loyalty: target.loyalty,
    benevolence: target.benevolence,
    fairness: target.fairness,
    humility: target.humility,
    command: target.command,
    martial: target.martial,
    intellect: target.intellect,
    charisma: target.charisma,
    pessimism_optimism: target.pessimism_optimism,
    conservative_progressive: target.conservative_progressive,
    individual_social: target.individual_social,
    cautious_bold: target.cautious_bold,
  }

  const { data: all, error: allError } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id,
      temperance, diligence, reflection, courage,
      loyalty, benevolence, fairness, humility,
      command, martial, intellect, charisma,
      pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
      profiles!celeb_persona_celeb_id_fkey (nickname, profession, avatar_url)
    `)
    .neq('celeb_id', celebId)

  if (allError || !all) {
    return { targetPersona, similarCelebs: [] }
  }

  const vectors: SimilarCeleb[] = all.map((row: any) => {
    const vec: PersonaVector = {
      celeb_id: row.celeb_id,
      nickname: row.profiles?.nickname ?? '',
      profession: row.profiles?.profession ?? null,
      avatar_url: row.profiles?.avatar_url ?? null,
      birth_date: null,
      death_date: null,
      title: null,
      influence_score: 0,
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
    }
    return { ...vec, distance: calcDistance(targetPersona, vec) }
  })

  const similarCelebs = vectors
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)

  return { targetPersona, similarCelebs }
}
