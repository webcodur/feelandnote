'use server'

import { createClient } from '@/lib/supabase/server'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { revalidateWebCache } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { PersonaJsonb } from './members'

export interface PersonaData {
  id: string
  celeb_id: string
  nickname: string
  profession: string | null
  persona?: PersonaJsonb | null
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
  charm: number
  // 성향 (-50~+50)
  pessimism_optimism: number
  conservative_progressive: number
  individual_social: number
  cautious_bold: number
}

export type StatKey =
  | 'temperance' | 'diligence' | 'reflection' | 'courage'
  | 'loyalty' | 'benevolence' | 'fairness' | 'humility'
  | 'command' | 'martial' | 'intellect' | 'charm'

export type TendencyKey =
  | 'pessimism_optimism' | 'conservative_progressive'
  | 'individual_social' | 'cautious_bold'

export async function saveCelebPersona(
  celebId: string,
  stats: Omit<PersonaData, 'id' | 'celeb_id' | 'nickname' | 'profession' | 'persona'>,
  personaJsonb?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient()

  const payload: Record<string, unknown> = {
    celeb_id: celebId,
    ...stats,
    updated_at: new Date().toISOString(),
  }
  if (personaJsonb) payload.persona = personaJsonb

  const { error } = await supabase
    .from('celeb_persona')
    .upsert(payload, { onConflict: 'celeb_id' })

  if (error) throw error

  // celeb_persona만 수정
  await revalidateWebCache(CACHE_TAGS.PERSONA)
}

interface PersonaQueryRow {
  id: string
  celeb_id: string
  persona: PersonaJsonb | null
  temperance: number; diligence: number; reflection: number; courage: number
  loyalty: number; benevolence: number; fairness: number; humility: number
  command: number; martial: number; intellect: number; charm: number
  pessimism_optimism: number; conservative_progressive: number
  individual_social: number; cautious_bold: number
  profiles: { nickname: string | null; profession: string | null } | null
}

export async function getPersonaVectors(): Promise<PersonaData[]> {
  const supabase = await createClient()

  // 전량 페이징: 정렬 단독으로는 1,000행에서 잘려 페르소나 다수가 목록에서 빠진다.
  // created_at은 동시각 등록이 겹칠 수 있어 고유키 id를 2차 정렬키로 고정한다.
  const data = await selectAllPages<PersonaQueryRow>((from, to) =>
    supabase
      .from('celeb_persona')
      .select(`
        id,
        celeb_id,
        persona,
        temperance, diligence, reflection, courage,
        loyalty, benevolence, fairness, humility,
        command, martial, intellect, charm,
        pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
        profiles!celeb_persona_celeb_id_fkey (nickname, profession)
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
        data: PersonaQueryRow[] | null
        error: { message: string } | null
      }>
  )

  return data.map((row) => ({
    id: row.id,
    celeb_id: row.celeb_id,
    nickname: row.profiles?.nickname ?? '',
    profession: row.profiles?.profession ?? null,
    persona: row.persona ?? null,
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
    charm: row.charm,
    pessimism_optimism: row.pessimism_optimism,
    conservative_progressive: row.conservative_progressive,
    individual_social: row.individual_social,
    cautious_bold: row.cautious_bold,
  }))
}
