'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdatePlaylistItemsParams {
  playlistId: string
  contentIds: string[]  // 최종 콘텐츠 ID 배열 (순서 포함)
}

export async function updatePlaylistItems(params: UpdatePlaylistItemsParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 소유권 확인
  const { data: playlist } = await supabase
    .from('playlists')
    .select('user_id')
    .eq('id', params.playlistId)
    .single()

  if (!playlist || playlist.user_id !== user.id) {
    throw new Error('수정 권한이 없습니다')
  }

  if (params.contentIds.length === 0) {
    throw new Error('최소 1개 이상의 콘텐츠가 필요합니다')
  }

  // 기존 아이템 모두 삭제
  const { error: deleteError } = await supabase
    .from('playlist_items')
    .delete()
    .eq('playlist_id', params.playlistId)

  if (deleteError) {
    console.error('기존 아이템 삭제 에러:', deleteError)
    throw new Error('재생목록 수정에 실패했습니다')
  }

  // 새 아이템 추가
  const items = params.contentIds.map((contentId, index) => ({
    playlist_id: params.playlistId,
    content_id: contentId,
    sort_order: index
  }))

  const { error: insertError } = await supabase
    .from('playlist_items')
    .insert(items)

  if (insertError) {
    console.error('아이템 추가 에러:', insertError)
    throw new Error('재생목록 수정에 실패했습니다')
  }

  revalidatePath(`/${user.id}/collections`)
  revalidatePath(`/${user.id}/collections/${params.playlistId}`)

  return { success: true }
}

// 단일 아이템 순서 변경
interface ReorderItemsParams {
  playlistId: string
  itemIds: string[]  // 새 순서대로 정렬된 item ID 배열
}

export async function reorderPlaylistItems(params: ReorderItemsParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 소유권 확인
  const { data: playlist } = await supabase
    .from('playlists')
    .select('user_id')
    .eq('id', params.playlistId)
    .single()

  if (!playlist || playlist.user_id !== user.id) {
    throw new Error('수정 권한이 없습니다')
  }

  // 순서 업데이트
  const updates = params.itemIds.map((itemId, index) =>
    supabase
      .from('playlist_items')
      .update({ sort_order: index })
      .eq('id', itemId)
      .eq('playlist_id', params.playlistId)
  )

  await Promise.all(updates)

  revalidatePath(`/${user.id}/collections/${params.playlistId}`)

  return { success: true }
}
