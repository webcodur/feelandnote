'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { NoticeWithAuthor } from '@/types/database'
import type { Locale } from '@/types/locale'
import { localizeNotice } from '@/lib/board/localizeNotice'

async function fetchNoticeData(id: string, locale: Locale): Promise<NoticeWithAuthor | null> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('notices')
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[공지사항 상세] Error:', error)
    }
    return null
  }

  return localizeNotice(data as NoticeWithAuthor, locale)
}

const getNoticeDataCached = unstable_cache(
  fetchNoticeData,
  ['notice-data'],
  { revalidate: 3600, tags: ['notices'] }
)

export async function getNotice(id: string, locale: Locale, incrementView = true) {
  // 조회수 증가는 캐시 외부에서 fire-and-forget
  if (incrementView) {
    const supabase = await createClient()
    await supabase.rpc('increment_notice_view_count', { notice_id: id })
  }

  return getNoticeDataCached(id, locale)
}
