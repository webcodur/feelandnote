'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType, Folder } from '@/types/database'

interface CreateFolderParams {
  name: string
  contentType: ContentType
}

export async function createFolder(params: CreateFolderParams): Promise<Folder | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 중복 체크
  const { data: existing } = await supabase
    .from('folders')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', params.name)
    .eq('content_type', params.contentType)
    .single()

  if (existing) {
    throw new Error('같은 이름의 폴더가 이미 존재합니다')
  }

  // 정렬 순서 계산
  const { data: lastFolder } = await supabase
    .from('folders')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('content_type', params.contentType)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (lastFolder?.sort_order || 0) + 1

  const { data, error } = await supabase
    .from('folders')
    .insert({
      user_id: user.id,
      name: params.name,
      content_type: params.contentType,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('폴더 생성 에러:', error)
    throw new Error('폴더 생성에 실패했습니다')
  }

  revalidatePath('/archive')
  return data
}
