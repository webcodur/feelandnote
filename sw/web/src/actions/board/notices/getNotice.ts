'use server'

import { createClient } from '@/lib/supabase/server'
import type { NoticeWithAuthor } from '@/types/database'

export async function getNotice(id: string) {
  const supabase = await createClient()

  // 조회수 증가
  await supabase.rpc('increment_notice_view_count', { notice_id: id })

  const { data, error } = await supabase
    .from('notices')
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[공지사항 상세] Error:', error)
    return null
  }

  return data as NoticeWithAuthor
}
