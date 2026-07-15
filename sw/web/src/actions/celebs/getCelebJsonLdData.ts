'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { CL_SELECT_LIST, type ContentLocaleRow } from '@/lib/utils/content-locale'

export interface JsonLdContentRow {
  id: string
  type: string
  content_locales: ContentLocaleRow[] | null
}

async function fetchJsonLdContents(celebId: string): Promise<JsonLdContentRow[]> {
  const supabase = createStaticClient()

  // limit(50): JSON-LD ItemList 상한. 구조화 데이터는 페이지 대표 항목만 선언하면 되고,
  // 셀럽 1인당 콘텐츠가 수백 건까지 가므로 전수 수신은 egress 낭비다.
  // numberOfItems는 여기서 받은 실제 항목 수로 산출하므로 선언 수와 나열 수는 항상 일치한다.
  // visibility='public'만 선언해야 화면 목록(공개만 노출)과 어긋나지 않는다.
  const { data } = await supabase
    .from('user_contents')
    .select(`contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`)
    .eq('user_id', celebId)
    .eq('visibility', 'public')
    .limit(50)

  return (data ?? []).map(row => {
    const c = row.contents as unknown as JsonLdContentRow
    return c
  }).filter(Boolean)
}

export const getCelebJsonLdContents = unstable_cache(
  fetchJsonLdContents,
  ['celeb-jsonld-contents'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CONTENTS] }
)

export interface CelebDialogueFull {
  lines: Record<string, string[] | string> | null
  lines_en: Record<string, string[] | string> | null
}

async function fetchCelebDialogueFull(celebId: string): Promise<CelebDialogueFull | null> {
  const supabase = createStaticClient()

  const { data } = await supabase
    .from('celeb_dialogues')
    .select('lines, lines_en')
    .eq('celeb_id', celebId)
    .maybeSingle()

  if (!data) return null
  return {
    lines: (data.lines as Record<string, string[] | string> | null) ?? null,
    lines_en: (data.lines_en as Record<string, string[] | string> | null) ?? null,
  }
}

export const getCelebDialogueFull = unstable_cache(
  fetchCelebDialogueFull,
  ['celeb-dialogue-full'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.DIALOGUES] }
)
