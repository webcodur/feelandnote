'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateRecommendationParams {
  userContentId: string
  isRecommended: boolean
}

export async function updateRecommendation({ userContentId, isRecommended }: UpdateRecommendationParams) {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('user_contents')
    .update({ is_recommended: isRecommended })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('추천 상태 변경 에러:', error)
    throw new Error('추천 상태 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  return { success: true }
}
