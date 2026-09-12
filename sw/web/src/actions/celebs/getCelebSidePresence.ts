import 'server-only'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, throwOnQueryError, withQueryFallback } from '@/lib/cache'
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

  // 이 조회가 정하는 것은 목차에 「영향력」·「성향」 줄을 넣을지뿐이다. 본문은 그 구획이
  // 화면에 다가올 때 브라우저가 따로 불러온다. 줄 하나 때문에 인물 화면 전체를 세우지
  // 못하게 둘 수는 없으므로, 실패하면 이번 요청만 「없음」으로 넘기고 원인을 남긴다.
  // 빈 값이 굳어도 목차 줄 하나가 빠질 뿐이고, 인물을 고치면 태그가 그 장을 비운다.
  return withQueryFallback(
    'getCelebSidePresence',
    async () => {
      const [influence, spectrum] = await Promise.all([
        hasInfluenceCached(celebId),
        hasSpectrumCached(celebId),
      ])
      return { influence, spectrum }
    },
    EMPTY_SIDE_PRESENCE,
  )
}
