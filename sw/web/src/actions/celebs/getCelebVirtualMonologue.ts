'use server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail } from '@/lib/cache'

/* ── 인물 가상독백 ──
   인물이 1인칭으로 말하는 글(celebs.virtual_monologue·_en). 인물 상세 「읽어보기」 밖에서도
   — 세력도감 인물 모달, 신화의 세계 인물 상세 — 읽을 수 있도록 인물 한 명 몫만 따로 읽는다.
   명단 캐시(getFeaturedFactions·getMythData)에 싣지 않는 이유는 긴 소개와 같다: 명단이 캐시 상한 2MB를 넘는다. */

interface MonologueRow {
  virtual_monologue: string | null
  virtual_monologue_en: string | null
}

async function fetchMonologue(celebId: string): Promise<MonologueRow | null> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celebs')
    .select('virtual_monologue, virtual_monologue_en')
    .eq('id', celebId)
    .eq('publication_status', 'active')
    .maybeSingle<MonologueRow>()

  // 조용한 폴백 금지 — 조회가 깨지면 「독백 없음」으로 캐시되지 않게 드러낸다
  if (error) throw new Error(`celebs.virtual_monologue 조회 실패: ${error.message}`)
  return data
}

/** 화면 언어의 가상독백. 영문이 없으면 한국어가 온다. 없으면 null */
export async function getCelebVirtualMonologue(celebId: string, locale: string = 'ko'): Promise<string | null> {
  const row = await cachedDetail(CACHE_TAGS.CELEBS, celebId, ['celeb-virtual-monologue', celebId], () =>
    fetchMonologue(celebId),
  )
  const en = row?.virtual_monologue_en?.trim()
  const ko = row?.virtual_monologue?.trim()
  return (locale === 'en' && en) || ko || null
}
