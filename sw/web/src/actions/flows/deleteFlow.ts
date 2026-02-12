'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteFlow(flowId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  // 소유권 확인
  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', flowId)
    .single()

  if (!flow || flow.user_id !== user.id) {
    throw new Error('삭제 권한이 없습니다')
  }

  // 삭제 (CASCADE로 stages, nodes도 함께 삭제됨)
  const { error } = await supabase
    .from('flows')
    .delete()
    .eq('id', flowId)

  if (error) {
    console.error('플로우 삭제 에러:', error)
    throw new Error('플로우 삭제에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading/collections`)

  return { success: true }
}
