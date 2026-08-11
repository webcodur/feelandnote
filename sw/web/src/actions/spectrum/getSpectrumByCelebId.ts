'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { SpectrumJsonb, SpectrumProfile } from '@/lib/spectrum/types'
import { parseSpectrumJsonb } from '@/lib/spectrum/types'

interface SpectrumRow {
  celeb_id: string
  spectrum: SpectrumJsonb
  celeb:
    | { nickname: string | null; profession: string | null; avatar_url: string | null; birth_date: string | null; death_date: string | null; title: string | null }
    | { nickname: string | null; profession: string | null; avatar_url: string | null; birth_date: string | null; death_date: string | null; title: string | null }[]
    | null
}

async function fetchSpectrumByCelebId(celebId: string): Promise<SpectrumProfile | null> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, spectrum:persona,
      celeb:celebs!celeb_persona_celebs_fkey (
        nickname, profession, avatar_url, birth_date, death_date, title
      )
    `)
    .eq('celeb_id', celebId)
    .single()

  // 이 인물에게 스펙트럼 자료가 아직 없는 것은 실패가 아니다(.single()이 0행을 오류로 알린다).
  throwOnQueryError('[getSpectrumByCelebId]', error, { ignoreCodes: [NO_ROWS_CODE] })

  if (!data) {
    return null
  }

  const row = data as unknown as SpectrumRow
  const profile = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb
  const stats = parseSpectrumJsonb(row.spectrum)

  return {
    celeb_id: row.celeb_id,
    nickname: profile?.nickname ?? '',
    nickname_en: null,
    profession: profile?.profession ?? null,
    avatar_url: profile?.avatar_url ?? null,
    birth_date: profile?.birth_date ?? null,
    death_date: profile?.death_date ?? null,
    title: profile?.title ?? null,
    ...stats,
  }
}

const getSpectrumByCelebIdCached = unstable_cache(
  fetchSpectrumByCelebId,
  ['spectrum-by-celeb'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.SPECTRUM] }
)

export async function getSpectrumByCelebId(celebId: string): Promise<SpectrumProfile | null> {
  if (!celebId) return null
  return withQueryFallback('getSpectrumByCelebId', () => getSpectrumByCelebIdCached(celebId), null)
}
