'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'

export interface CelebDialogueFull {
  lines: Record<string, string[] | string> | null
  lines_en: Record<string, string[] | string> | null
}

async function fetchCelebDialogueFull(celebId: string): Promise<CelebDialogueFull | null> {
  const db = createStaticClient()

  const { data, error } = await db
    .from('celeb_dialogues')
    .select('lines, lines_en')
    .eq('celeb_id', celebId)
    .maybeSingle()

  throwOnQueryError('getCelebDialogueFull', error)
  if (!data) return null
  return {
    lines: (data.lines as Record<string, string[] | string> | null) ?? null,
    lines_en: (data.lines_en as Record<string, string[] | string> | null) ?? null,
  }
}

/* 인물 한 명의 대사 — 대사 도메인도 함께 달아 대사 일괄 작업에서 쓸려 나가게 둔다 */
export async function getCelebDialogueFull(celebId: string): Promise<CelebDialogueFull | null> {
  return cachedDetail(CACHE_TAGS.CELEBS, celebId, ['celeb-dialogue-full-v2-query-guards', celebId], () => fetchCelebDialogueFull(celebId), {
    extraTags: [CACHE_TAGS.DIALOGUES],
  })
}
