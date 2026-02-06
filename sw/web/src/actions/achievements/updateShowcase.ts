'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import { TITLES } from '@/constants/titles'
import { getUserStats } from './getAchievementData'

const MAX_SHOWCASE = 3

export async function updateShowcaseTitles(titleCodes: string[]): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return failure('UNAUTHORIZED', '로그인이 필요하다')

  if (titleCodes.length > MAX_SHOWCASE) {
    return failure('VALIDATION_ERROR', `진열대는 최대 ${MAX_SHOWCASE}개까지 가능하다`)
  }

  // 해금 여부 검증
  if (titleCodes.length > 0) {
    const stats = await getUserStats(supabase, user.id)
    for (const code of titleCodes) {
      const title = TITLES.find(t => t.code === code)
      if (!title) return failure('NOT_FOUND', `존재하지 않는 칭호: ${code}`)
      if (stats[title.condition.type] < title.condition.value) {
        return failure('FORBIDDEN', '해금되지 않은 칭호는 진열할 수 없다')
      }
    }
  }

  // showcase_titles + selected_title(첫 번째 항목) 동시 업데이트
  const selectedTitle = titleCodes[0] || null

  const { error } = await supabase
    .from('profiles')
    .update({ showcase_titles: titleCodes, selected_title: selectedTitle })
    .eq('id', user.id)

  if (error) return handleSupabaseError(error, { logPrefix: '[updateShowcase]' })

  revalidatePath(`/${user.id}`)
  revalidatePath(`/${user.id}/merits`)

  return success(undefined)
}
