'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { parsePersonaJsonbWithReasons } from '@/lib/persona/types'
import type { PersonaJsonb } from '@/lib/persona/types'

export interface PersonaReason {
  ko: string
  en: string
}

async function fetchPersonaReason(celebId: string, axis: string): Promise<PersonaReason | null> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select('persona')
    .eq('celeb_id', celebId)
    .single()

  // 이 인물에게 페르소나 자료가 아직 없는 것은 실패가 아니다(.single()이 0행을 오류로 알린다).
  throwOnQueryError('[getPersonaReason]', error, { ignoreCodes: [NO_ROWS_CODE] })

  if (!data) {
    return null
  }

  const withReasons = parsePersonaJsonbWithReasons((data as { persona: PersonaJsonb }).persona)
  const field = withReasons[axis]
  if (!field) return null
  return { ko: field.reason_ko, en: field.reason_en }
}

const getPersonaReasonCached = unstable_cache(fetchPersonaReason, ['persona-reason'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.PERSONA],
})

export async function getPersonaReason(celebId: string, axis: string): Promise<PersonaReason | null> {
  if (!celebId || !axis) return null
  return withQueryFallback('getPersonaReason', () => getPersonaReasonCached(celebId, axis), null)
}
