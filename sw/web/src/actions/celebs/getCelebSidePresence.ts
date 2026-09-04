import 'server-only'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export interface CelebSidePresence {
  influence: boolean
  spectrum: boolean
}

interface CelebSidePresenceInput {
  celebId: string
  reality: string | null | undefined
}

interface PresenceRow {
  celeb_id: string
}

const EMPTY_SIDE_PRESENCE: CelebSidePresence = {
  influence: false,
  spectrum: false,
}

async function fetchInfluencePresence(celebId: string): Promise<boolean> {
  const db = createStaticClient()
  const { data, error } = await db
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
  const db = createStaticClient()
  const { data, error } = await db
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
  reality,
}: CelebSidePresenceInput): Promise<CelebSidePresence> {
  // FICTION만 끈다 — celeb_influence·celeb_persona는 FICTION 인물에게 절대 만들지 않는다.
  // BOTH는 실존 핵심이 있는 인물이라 값이 실제로 있을 수 있다.
  if (reality === 'FICTION') return EMPTY_SIDE_PRESENCE

  const [influence, spectrum] = await Promise.all([
    hasInfluenceCached(celebId),
    hasSpectrumCached(celebId),
  ])

  return { influence, spectrum }
}
