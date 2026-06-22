'use server'

import { unstable_cache } from 'next/cache'
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

  const { data } = await supabase
    .from('user_contents')
    .select(`contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`)
    .eq('user_id', celebId)
    .limit(50)

  return (data ?? []).map(row => {
    const c = row.contents as unknown as JsonLdContentRow
    return c
  }).filter(Boolean)
}

export const getCelebJsonLdContents = unstable_cache(
  fetchJsonLdContents,
  ['celeb-jsonld-contents'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
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
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)
