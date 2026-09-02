'use server'

import { unstable_cache } from 'next/cache'
import { NO_ROWS_CODE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createClient } from '@/lib/db/server'
import { createStaticClient } from '@/lib/db/static'
import type { NoticeWithAuthor } from '@/types/database'
import type { Locale } from '@/types/locale'
import { localizeNotice } from '@/lib/board/localizeNotice'
import { attachMemberAuthor } from '@/lib/board/memberProfiles'

async function fetchNoticeData(id: string, locale: Locale): Promise<NoticeWithAuthor | null> {
  const db = createStaticClient()

  const { data, error } = await db
    .from('notices')
    .select('*')
    .eq('id', id)
    .single()

  // 그 밖의 오류는 던져 캐시에 남기지 않는다.
  throwOnQueryError('[공지사항 상세]', error, { ignoreCodes: [NO_ROWS_CODE] })
  // 여기 오는 오류는 "글이 없다" 하나뿐이다.
  if (error?.code === NO_ROWS_CODE) return null

  const notice = await attachMemberAuthor(db, data)
  return localizeNotice(notice as NoticeWithAuthor, locale)
}

const getNoticeDataCached = unstable_cache(
  fetchNoticeData,
  ['notice-data'],
  { revalidate: 3600, tags: ['notices'] }
)

export async function getNotice(id: string, locale: Locale, incrementView = true) {
  // 조회수 증가는 캐시 외부에서 fire-and-forget
  if (incrementView) {
    const db = await createClient()
    await db.rpc('increment_notice_view_count', { notice_id: id })
  }

  return withQueryFallback('getNotice', () => getNoticeDataCached(id, locale), null)
}
