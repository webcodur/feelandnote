'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface BatchRemoveParams {
  userContentIds: string[]
}

export async function batchRemoveContents({ userContentIds }: BatchRemoveParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다')
  if (userContentIds.length === 0) throw new Error('선택된 콘텐츠가 없습니다')

  // 삭제 전 content_id 목록 조회
  const { data: existingContents } = await supabase
    .from('user_contents')
    .select('content_id')
    .eq('user_id', user.id)
    .in('id', userContentIds)

  const contentIds = existingContents?.map(c => c.content_id).filter(Boolean) || []

  // 사용자의 재생목록에서 해당 콘텐츠들 삭제
  if (contentIds.length > 0) {
    const { data: userPlaylists } = await supabase
      .from('playlists')
      .select('id')
      .eq('user_id', user.id)

    if (userPlaylists && userPlaylists.length > 0) {
      const playlistIds = userPlaylists.map(p => p.id)
      await supabase
        .from('playlist_items')
        .delete()
        .in('content_id', contentIds)
        .in('playlist_id', playlistIds)
    }
  }

  // user_contents 삭제
  const { error } = await supabase
    .from('user_contents')
    .delete()
    .eq('user_id', user.id)
    .in('id', userContentIds)

  if (error) {
    console.error('일괄 삭제 에러:', error)
    throw new Error('일괄 삭제에 실패했습니다')
  }

  revalidatePath('/archive')
  revalidatePath('/archive/playlists')
  return { success: true, count: userContentIds.length }
}
