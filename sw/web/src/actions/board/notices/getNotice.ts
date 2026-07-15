'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { NoticeWithAuthor } from '@/types/database'

async function fetchNoticeData(id: string): Promise<NoticeWithAuthor | null> {
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

  return data as NoticeWithAuthor
}

const getNoticeDataCached = unstable_cache(
  fetchNoticeData,
  ['notice-data'],
  // 공지(notices)는 web 관리자 화면에서 직접 쓰며 BO에 수정 액션이 없다. 태그를 두지 않는다.
  { revalidate: 3600 }
)

export async function getNotice(id: string) {
  // 조회수 증가는 캐시 외부에서 fire-and-forget
  const supabase = await createClient()
  await supabase.rpc('increment_notice_view_count', { notice_id: id })

  return getNoticeDataCached(id)
}
