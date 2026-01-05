'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_PINNED = 10

interface TogglePinParams {
  userContentId: string
  isPinned: boolean
}

interface TogglePinResult {
  success: boolean
  error?: 'MAX_PINNED_EXCEEDED' | 'UNAUTHORIZED' | 'UPDATE_FAILED'
}

export async function togglePin({ userContentId, isPinned }: TogglePinParams): Promise<TogglePinResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  // 핀 추가 시 개수 체크
  if (isPinned) {
    const { count } = await supabase
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_pinned', true)

    if ((count ?? 0) >= MAX_PINNED) {
      return { success: false, error: 'MAX_PINNED_EXCEEDED' }
    }
  }

  const { error } = await supabase
    .from('user_contents')
    .update({
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null,
    })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('핀 상태 변경 에러:', error)
    return { success: false, error: 'UPDATE_FAILED' }
  }

  revalidatePath('/archive')

  return { success: true }
}

export async function getPinnedCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { count } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_pinned', true)

  return count ?? 0
}
