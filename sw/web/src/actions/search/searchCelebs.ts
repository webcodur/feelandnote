'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { SEARCHABLE_CELEB_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/supabase/static'
import { getLocale } from 'next-intl/server'
import { sanitizeSearchTerm } from '@/lib/utils/search-sanitize'

interface CelebSearchResult {
  id: string
  slug: string | null
  nickname: string
  avatar_url: string | null
  profession: string | null
  title: string | null
}

interface SearchCelebsParams {
  query: string
  page?: number
  limit?: number
}

interface SearchCelebsResponse {
  items: CelebSearchResult[]
  total: number
  hasMore: boolean
}

async function fetchSearchCelebs(
  query: string,
  page: number,
  limit: number,
  locale: string,
): Promise<SearchCelebsResponse> {
  const isEn = locale === 'en'
  const supabase = createStaticClient()
  const offset = (page - 1) * limit

  // .or() 필터 보간 인젝션 차단
  const safeQuery = sanitizeSearchTerm(query)
  if (!safeQuery) {
    return { items: [], total: 0, hasMore: false }
  }

  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en', { count: 'exact' })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    // 기본 목록 등급에 픽션 인물을 더해 검색한다.
    .in('celeb_tier', [...SEARCHABLE_CELEB_TIERS])
    .or(`nickname.ilike.%${safeQuery}%,nickname_en.ilike.%${safeQuery}%`)
    .range(offset, offset + limit - 1)
    .order(isEn ? 'nickname_en' : 'nickname', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('셀럽 검색 에러:', error)
    return { items: [], total: 0, hasMore: false }
  }

  const total = count ?? 0

  return {
    items: (data || []).map(row => ({
      id: row.id,
      slug: row.slug,
      nickname: isEn ? (row.nickname_en || row.nickname || '') : (row.nickname || ''),
      avatar_url: row.avatar_url,
      profession: row.profession,
      title: isEn ? (row.title_en || row.title) : row.title,
    })),
    total,
    hasMore: offset + limit < total,
  }
}

const searchCelebsCached = unstable_cache(
  fetchSearchCelebs,
  ['search-celebs'],
  { revalidate: 3600, tags: [CACHE_TAGS.CELEBS] }
)

export async function searchCelebs({
  query,
  page = 1,
  limit = 20,
}: SearchCelebsParams): Promise<SearchCelebsResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }
  const locale = await getLocale()
  return searchCelebsCached(query.trim(), page, limit, locale)
}
