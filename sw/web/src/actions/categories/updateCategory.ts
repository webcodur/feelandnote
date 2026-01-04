'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Category } from '@/types/database'

interface UpdateCategoryParams {
  id: string
  name: string
}

export async function updateCategory(params: UpdateCategoryParams): Promise<Category | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 해당 카테고리가 본인 것인지 확인
  const { data: category } = await supabase
    .from('categories')
    .select('id, content_type')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!category) {
    throw new Error('분류를 찾을 수 없습니다')
  }

  // 중복 체크 (같은 타입 내에서)
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', params.name)
    .eq('content_type', category.content_type)
    .neq('id', params.id)
    .single()

  if (existing) {
    throw new Error('같은 이름의 분류가 이미 존재합니다')
  }

  const { data, error } = await supabase
    .from('categories')
    .update({ name: params.name })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('분류 수정 에러:', error)
    throw new Error('분류 수정에 실패했습니다')
  }

  revalidatePath('/archive')
  return data
}
