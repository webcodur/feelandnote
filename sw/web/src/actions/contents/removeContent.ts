'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'

export async function removeContent(userContentId: string) {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 삭제 전 content_id 조회
  const { data: existing } = await db
    .from('member_contents')
    .select('content_id')
    .eq('id', userContentId)
    .eq('member_id', user.id)
    .single()

  if (!existing) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  // 사용자의 재생목록에서 해당 콘텐츠 삭제
  const { data: userPlaylists } = await db
    .from('playlists')
    .select('id')
    .eq('user_id', user.id)

  if (userPlaylists && userPlaylists.length > 0) {
    const playlistIds = userPlaylists.map(p => p.id)
    await db
      .from('playlist_items')
      .delete()
      .eq('content_id', existing.content_id)
      .in('playlist_id', playlistIds)
  }

  // 회원 감상 기록 삭제
  const { error } = await db
    .from('member_contents')
    .delete()
    .eq('id', userContentId)
    .eq('member_id', user.id)

  if (error) {
    console.error('콘텐츠 삭제 에러:', error)
    throw new Error('콘텐츠 삭제에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading`)
  revalidatePath(`/${user.id}/reading/collections`)
  revalidatePath(`/${user.id}/reading/interests`)
  revalidatePath(`/content/${existing.content_id}`)
  revalidatePath(`/en/content/${existing.content_id}`)

  // 활동 로그
  await logActivity({
    actionType: 'CONTENT_REMOVE',
    targetType: 'content',
    targetId: userContentId,
    contentId: existing.content_id
  })

  return { success: true }
}
