'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
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

  if (error || !data) {
    console.error('[getPersonaReason] failed:', error?.message ?? 'unknown error')
    return null
  }

  const withReasons = parsePersonaJsonbWithReasons((data as { persona: PersonaJsonb }).persona)
  const field = withReasons[axis]
  if (!field) return null
  return { ko: field.reason_ko, en: field.reason_en }
}

const getPersonaReasonCached = unstable_cache(fetchPersonaReason, ['persona-reason'], {
  revalidate: STATIC_REVALIDATE,
  tags: ['celebs'],
})

export async function getPersonaReason(celebId: string, axis: string): Promise<PersonaReason | null> {
  if (!celebId || !axis) return null
  return getPersonaReasonCached(celebId, axis)
}
