'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 분류 소유권 확인
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('user_id', user.id)
    .single()

  if (!category) {
    throw new Error('분류를 찾을 수 없습니다')
  }

  // 분류 삭제 (user_contents.category_id는 ON DELETE SET NULL로 자동 처리)
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    console.error('분류 삭제 에러:', error)
    throw new Error('분류 삭제에 실패했습니다')
  }

  revalidatePath(`/${user.id}/records`)
}
