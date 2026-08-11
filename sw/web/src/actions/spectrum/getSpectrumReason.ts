'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { parseSpectrumJsonbWithReasons } from '@/lib/spectrum/types'
import type { SpectrumJsonb } from '@/lib/spectrum/types'

export interface SpectrumReason {
  ko: string
  en: string
}

async function fetchSpectrumReason(celebId: string, axis: string): Promise<SpectrumReason | null> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select('spectrum:persona')
    .eq('celeb_id', celebId)
    .single()

  // 이 인물에게 스펙트럼 자료가 아직 없는 것은 실패가 아니다(.single()이 0행을 오류로 알린다).
  throwOnQueryError('[getSpectrumReason]', error, { ignoreCodes: [NO_ROWS_CODE] })

  if (!data) {
    return null
  }

  const withReasons = parseSpectrumJsonbWithReasons((data as { spectrum: SpectrumJsonb }).spectrum)
  const field = withReasons[axis]
  if (!field) return null
  return { ko: field.reason_ko, en: field.reason_en }
}

const getSpectrumReasonCached = unstable_cache(fetchSpectrumReason, ['spectrum-reason'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.SPECTRUM],
})

export async function getSpectrumReason(celebId: string, axis: string): Promise<SpectrumReason | null> {
  if (!celebId || !axis) return null
  return withQueryFallback('getSpectrumReason', () => getSpectrumReasonCached(celebId, axis), null)
}
