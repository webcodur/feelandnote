import 'server-only'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { hasContemporaries } from '@/actions/celebs/getContemporaries'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'

export interface CelebSidePresence {
  contemporaries: boolean
  influence: boolean
  spectrum: boolean
}

interface CelebSidePresenceInput {
  celebId: string
  tier: string | null | undefined
  birthDate: string | null
  deathDate: string | null
}

interface PresenceRow {
  celeb_id: string
}

const EMPTY_SIDE_PRESENCE: CelebSidePresence = {
  contemporaries: false,
  influence: false,
  spectrum: false,
}

async function fetchInfluencePresence(celebId: string): Promise<boolean> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celeb_influence')
    .select('celeb_id')
    .eq('celeb_id', celebId)
    .maybeSingle()

  throwOnQueryError('getCelebSidePresence/influence', error)
  return Boolean((data as PresenceRow | null)?.celeb_id)
}

function hasInfluenceCached(celebId: string): Promise<boolean> {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['celeb-influence-presence', celebId],
    () => fetchInfluencePresence(celebId),
  )
}

async function fetchSpectrumPresence(celebId: string): Promise<boolean> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select('celeb_id')
    .eq('celeb_id', celebId)
    .maybeSingle()

  throwOnQueryError('getCelebSidePresence/spectrum', error)
  return Boolean((data as PresenceRow | null)?.celeb_id)
}

function hasSpectrumCached(celebId: string): Promise<boolean> {
  return cachedDetail(
    CACHE_TAGS.SPECTRUM,
    celebId,
    ['celeb-spectrum-presence', celebId],
    () => fetchSpectrumPresence(celebId),
    { extraTags: [CACHE_TAGS.CELEBS] },
  )
}

/** 페이지의 고정 목차용 존재 여부. 클라이언트가 직접 호출할 공개 Action이 아니다. */
export async function getCelebSidePresence({
  celebId,
  tier,
  birthDate,
  deathDate,
}: CelebSidePresenceInput): Promise<CelebSidePresence> {
  if (tier === 'fiction') return EMPTY_SIDE_PRESENCE

  const [influence, spectrum, contemporaries] = await Promise.all([
    hasInfluenceCached(celebId),
    hasSpectrumCached(celebId),
    birthDate
      ? hasContemporaries(celebId, birthDate, deathDate)
      : Promise.resolve(false),
  ])

  return { contemporaries, influence, spectrum }
}
