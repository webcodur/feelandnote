'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface MoveToCategoryParams {
  userContentIds: string[]
  categoryId: string | null  // null = 미분류로 이동
}

export async function moveToCategory(params: MoveToCategoryParams): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 분류가 지정된 경우 소유권 확인
  if (params.categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', params.categoryId)
      .eq('user_id', user.id)
      .single()

    if (!category) {
      throw new Error('분류를 찾을 수 없습니다')
    }
  }

  // 콘텐츠 소유권 확인 및 업데이트
  const { error } = await supabase
    .from('user_contents')
    .update({ category_id: params.categoryId })
    .eq('user_id', user.id)
    .in('id', params.userContentIds)

  if (error) {
    console.error('분류 이동 에러:', error)
    throw new Error('분류 이동에 실패했습니다')
  }

  revalidatePath('/archive')
}
