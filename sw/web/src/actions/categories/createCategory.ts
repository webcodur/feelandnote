'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, Category } from '@/types/database'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface CreateCategoryParams {
  name: string
  contentType: ContentType
}

export async function createCategory(params: CreateCategoryParams): Promise<ActionResult<Category>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 중복 체크
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', params.name)
    .eq('content_type', params.contentType)
    .single()

  if (existing) {
    return failure('ALREADY_EXISTS', '같은 이름의 분류가 이미 존재한다.')
  }

  // 정렬 순서 계산
  const { data: lastCategory } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('content_type', params.contentType)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (lastCategory?.sort_order || 0) + 1

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: params.name,
      content_type: params.contentType,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) {
    return handleSupabaseError(error, { context: 'category', logPrefix: '[분류 생성]' })
  }

  revalidatePath('/archive')
  return success(data)
}
