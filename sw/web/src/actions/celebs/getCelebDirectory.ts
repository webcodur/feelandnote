'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { STATIC_REVALIDATE } from '@/lib/cache'

export interface CelebDirectoryRow {
  slug: string
  nickname: string
  nickname_en: string | null
  profession: string | null
}

async function fetchCelebDirectory(): Promise<CelebDirectoryRow[]> {
  const supabase = createStaticClient()

  // 1,000행 상한에 걸리므로 나눠 받는다(자르면 명단에서 사람이 조용히 사라진다).
  // nickname은 중복 가능 — 페이지 경계에서 중복·누락이 나지 않도록 id를 2차 정렬키로 둔다.
  return await selectAllPages<CelebDirectoryRow>((from, to) =>
    supabase
      .from('celebs')
      .select('slug, nickname, nickname_en, profession')
      .eq('publication_status', 'active')
      // 신화·관계 인물은 목록에서 제외
      .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
      .not('slug', 'is', null)
      .order('nickname', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
      .overrideTypes<CelebDirectoryRow[], { merge: false }>()
  )
}

export const getCelebDirectory = unstable_cache(
  fetchCelebDirectory,
  ['celeb-directory'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
