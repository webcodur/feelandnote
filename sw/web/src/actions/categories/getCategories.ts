'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, CategoryWithCount } from '@/types/database'

interface GetCategoriesParams {
  contentType?: ContentType
}

export async function getCategories(params: GetCategoriesParams = {}): Promise<CategoryWithCount[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (params.contentType) {
    query = query.eq('content_type', params.contentType)
  }

  const { data: categories, error } = await query

  if (error) {
    console.error('분류 조회 에러:', error)
    return []
  }

  // 각 분류의 콘텐츠 수 조회
  const categoryIds = categories.map(c => c.id)

  if (categoryIds.length === 0) {
    return []
  }

  const { data: counts } = await supabase
    .from('user_contents')
    .select('category_id')
    .eq('user_id', user.id)
    .in('category_id', categoryIds)

  const countMap: Record<string, number> = {}
  ;(counts || []).forEach(item => {
    if (item.category_id) {
      countMap[item.category_id] = (countMap[item.category_id] || 0) + 1
    }
  })

  return categories.map(category => ({
    ...category,
    content_count: countMap[category.id] || 0,
  }))
}
