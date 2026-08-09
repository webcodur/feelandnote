'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { NoticeWithAuthor } from '@/types/database'
import type { Locale } from '@/types/locale'
import { localizeNotice } from '@/lib/board/localizeNotice'
import { attachMemberAuthors } from '@/lib/board/memberProfiles'

interface GetNoticesParams {
  locale: Locale
  limit?: number
  offset?: number
}

async function fetchNotices(locale: Locale, limit: number, offset: number) {
  const supabase = createStaticClient()

  const { data, error, count } = await supabase
    .from('notices')
    .select('*', { count: 'exact' })
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[공지사항 목록] Error:', error)
    throw new Error('공지사항을 불러오는데 실패했습니다')
  }

  const hydrated = await attachMemberAuthors(supabase, data ?? [])
  const notices = (hydrated as NoticeWithAuthor[])
    .map((notice) => localizeNotice(notice, locale))

  if (notices.length > 0) {
    const ids = notices.map(n => n.id)
    const { data: counts } = await supabase
      .from('board_comments')
      .select('post_id')
      .eq('board_type', 'NOTICE')
      .eq('locale', locale)
      .in('post_id', ids)

    if (counts) {
      const countMap = counts.reduce<Record<string, number>>((acc, c) => {
        acc[c.post_id] = (acc[c.post_id] || 0) + 1
        return acc
      }, {})
      notices.forEach(n => { n.comment_count = countMap[n.id] || 0 })
    }
  }

  return {
    notices,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit
  }
}

const getNoticesCached = unstable_cache(
  fetchNotices,
  ['notices'],
  { revalidate: 3600, tags: ['notices', 'board-comments'] }
)

export async function getNotices(params: GetNoticesParams) {
  const { locale, limit = 20, offset = 0 } = params
  return getNoticesCached(locale, limit, offset)
}
