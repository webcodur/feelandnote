'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

// 칭호 선택
export async function selectTitle(titleId: string | null): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('로그인이 필요하다')
  }

  // titleId가 있으면 해당 칭호가 해금되었는지 확인
  if (titleId) {
    const { data: userTitle } = await supabase
      .from('user_titles')
      .select('id')
      .eq('user_id', user.id)
      .eq('title_id', titleId)
      .single()

    if (!userTitle) {
      return failure('해금되지 않은 칭호는 선택할 수 없다')
    }
  }

  // profiles 업데이트
  const { error } = await supabase
    .from('profiles')
    .update({ selected_title_id: titleId })
    .eq('id', user.id)

  if (error) {
    return handleSupabaseError(error, 'selectTitle')
  }

  revalidatePath(`/${user.id}`)
  revalidatePath(`/${user.id}/achievements`)

  return success(undefined)
}

// 사용자의 선택된 칭호 조회
export async function getSelectedTitle(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select(`
      selected_title_id,
      titles:selected_title_id (
        id,
        name,
        grade
      )
    `)
    .eq('id', userId)
    .single()

  if (!data?.titles) return null

  return data.titles as { id: string; name: string; grade: string }
}
