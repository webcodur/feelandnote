'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import { TITLES } from '@/constants/titles'
import { getUserStats } from './getAchievementData'

// 칭호 선택 (code 기반)
export async function selectTitle(titleCode: string | null): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED', '로그인이 필요하다')
  }

  // titleCode가 있으면 해당 칭호가 해금되었는지 확인
  if (titleCode) {
    const title = TITLES.find(t => t.code === titleCode)
    if (!title) {
      return failure('NOT_FOUND', '존재하지 않는 칭호다')
    }

    const stats = await getUserStats(supabase, user.id)
    const isUnlocked = checkCondition(title.condition, stats)
    if (!isUnlocked) {
      return failure('FORBIDDEN', '해금되지 않은 칭호는 선택할 수 없다')
    }
  }

  // profiles 업데이트
  const { error } = await supabase
    .from('profiles')
    .update({ selected_title: titleCode })
    .eq('id', user.id)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[selectTitle]' })
  }

  revalidatePath(`/${user.id}`)
  revalidatePath(`/${user.id}/merits`)

  return success(undefined)
}

// 사용자의 선택된 칭호 + 진열대 조회
export async function getSelectedTitle(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('selected_title, showcase_titles')
    .eq('id', userId)
    .single()

  const selectedTitle = data?.selected_title
    ? TITLES.find(t => t.code === data.selected_title) || null
    : null

  return {
    selectedTitle,
    showcaseTitles: (data?.showcase_titles as string[]) || [],
  }
}

// 조건 체크 (내부 사용)
function checkCondition(condition: { type: string; value: number }, stats: Record<string, number>): boolean {
  const statValue = stats[condition.type] || 0
  return statValue >= condition.value
}
