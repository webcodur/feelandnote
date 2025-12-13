'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface MoveToFolderParams {
  userContentIds: string[]
  folderId: string | null  // null = 미분류로 이동
}

export async function moveToFolder(params: MoveToFolderParams): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 폴더가 지정된 경우 소유권 확인
  if (params.folderId) {
    const { data: folder } = await supabase
      .from('folders')
      .select('id')
      .eq('id', params.folderId)
      .eq('user_id', user.id)
      .single()

    if (!folder) {
      throw new Error('폴더를 찾을 수 없습니다')
    }
  }

  // 콘텐츠 소유권 확인 및 업데이트
  const { error } = await supabase
    .from('user_contents')
    .update({ folder_id: params.folderId })
    .eq('user_id', user.id)
    .in('id', params.userContentIds)

  if (error) {
    console.error('폴더 이동 에러:', error)
    throw new Error('폴더 이동에 실패했습니다')
  }

  revalidatePath('/archive')
}
