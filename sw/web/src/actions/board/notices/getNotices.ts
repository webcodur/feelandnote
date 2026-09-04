'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/db/static'
import type { NoticeWithAuthor } from '@/types/database'
import type { Locale } from '@/types/locale'
import { localizeNotice } from '@/lib/board/localizeNotice'
import { attachMemberAuthors } from '@/lib/board/memberProfiles'
import { currentPublishBoundary } from '@/lib/board/noticeSchedule'

interface GetNoticesParams {
  locale: Locale
  limit?: number
  offset?: number
  /** 발행 시각이 아직 오지 않은 공지까지 본다. 관리자 화면만 켠다. */
  includeScheduled?: boolean
}

async function fetchNotices(
  locale: Locale,
  limit: number,
  offset: number,
  publishBoundary: string | null,
) {
  const db = createStaticClient()

  let query = db
    .from('notices')
    .select('*', { count: 'exact' })

  // 경계를 넘긴 공지는 아직 발행 전이다. count와 페이지 수도 이 필터 뒤에 나와야 맞는다.
  if (publishBoundary) query = query.lte('created_at', publishBoundary)

  const { data, error, count } = await query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[공지사항 목록] Error:', error)
    throw new Error('공지사항을 불러오는데 실패했습니다')
  }

  const hydrated = await attachMemberAuthors(db, data ?? [])
  const notices = (hydrated as NoticeWithAuthor[])
    .map((notice) => localizeNotice(notice, locale))

  if (notices.length > 0) {
    const ids = notices.map(n => n.id)
    const { data: counts } = await db
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
  const { locale, limit = 20, offset = 0, includeScheduled = false } = params

  // 관리자는 예약분까지 보므로 캐시를 타지 않는다 — 방문자 캐시에 미발행 공지를 섞지 않기 위함이다.
  if (includeScheduled) return fetchNotices(locale, limit, offset, null)

  return getNoticesCached(locale, limit, offset, currentPublishBoundary())
}
