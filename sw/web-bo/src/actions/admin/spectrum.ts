'use server'

import { createClient } from '@/lib/db/server'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { revalidateWebItem } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type {
  AbilityKey,
  DispositionKey,
  InnerVirtueKey,
  OuterVirtueKey,
} from '@feelandnote/shared/constants/celeb-spectrum-scale'
import type { SpectrumJsonb } from './members'

export interface SpectrumData {
  id: string
  celeb_id: string
  nickname: string
  profession: string | null
  spectrum?: SpectrumJsonb | null
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

export type StatKey = AbilityKey | InnerVirtueKey | OuterVirtueKey
export type TendencyKey = DispositionKey

export async function saveCelebSpectrum(
  celebId: string,
  stats: Omit<SpectrumData, 'id' | 'celeb_id' | 'nickname' | 'profession' | 'spectrum'>,
  spectrumJsonb?: Record<string, unknown>,
): Promise<void> {
  const db = await createClient()

  const payload: Record<string, unknown> = {
    celeb_id: celebId,
    ...stats,
    updated_at: new Date().toISOString(),
  }
  if (spectrumJsonb) payload.persona = spectrumJsonb

  const { error } = await db
    .from('celeb_persona')
    .upsert(payload, { onConflict: 'celeb_id' })

  if (error) throw error

  // 한 명의 벡터와, 그 한 명이 비교 후보로 들어가는 목록만 갱신한다.
  await revalidateWebItem(CACHE_TAGS.SPECTRUM, celebId, [CACHE_TAGS.SPECTRUM])
}

interface SpectrumQueryRow {
  id: string
  celeb_id: string
  spectrum: SpectrumJsonb | null
  temperance: number; diligence: number; reflection: number; courage: number
  loyalty: number; benevolence: number; fairness: number; humility: number
  command: number; martial: number; intellect: number; charm: number
  pessimism_optimism: number; conservative_progressive: number
  individual_social: number; cautious_bold: number
  celeb: { nickname: string | null; profession: string | null } | null
}

export async function getSpectrumVectors(): Promise<SpectrumData[]> {
  const db = await createClient()

  // 전량 페이징: 정렬 단독으로는 1,000행에서 잘려 스펙트럼 다수가 목록에서 빠진다.
  // created_at은 동시각 등록이 겹칠 수 있어 고유키 id를 2차 정렬키로 고정한다.
  const data = await selectAllPages<SpectrumQueryRow>((from, to) =>
    db
      .from('celeb_persona')
      .select(`
        id,
        celeb_id,
        spectrum:persona,
        temperance, diligence, reflection, courage,
        loyalty, benevolence, fairness, humility,
        command, martial, intellect, charm,
        pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
        celeb:celebs!celeb_persona_celebs_fkey (nickname, profession)
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
        data: SpectrumQueryRow[] | null
        error: { message: string } | null
      }>
  )

  return data.map((row) => ({
    id: row.id,
    celeb_id: row.celeb_id,
    nickname: row.celeb?.nickname ?? '',
    profession: row.celeb?.profession ?? null,
    spectrum: row.spectrum ?? null,
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
