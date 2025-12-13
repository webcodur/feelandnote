'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteFolder(folderId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 폴더 소유권 확인
  const { data: folder } = await supabase
    .from('folders')
    .select('id')
    .eq('id', folderId)
    .eq('user_id', user.id)
    .single()

  if (!folder) {
    throw new Error('폴더를 찾을 수 없습니다')
  }

  // 폴더 삭제 (user_contents.folder_id는 ON DELETE SET NULL로 자동 처리)
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)

  if (error) {
    console.error('폴더 삭제 에러:', error)
    throw new Error('폴더 삭제에 실패했습니다')
  }

  revalidatePath('/archive')
}
