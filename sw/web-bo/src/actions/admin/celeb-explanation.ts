'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/db/admin'
import { revalidateWebItems } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'

export interface SaveCelebExplanationInput {
  profileId: string
  slug: string | null
  plainText: string
  plainTextEn: string | null
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

export async function saveCelebExplanation(input: SaveCelebExplanationInput): Promise<void> {
  await requireAdmin()

  const plainText = input.plainText.trim()
  if (!plainText) throw new Error('인물 안내를 입력하세요.')

  const db = createAdminClient()
  const explanationResult = await db.from('celeb_explanations')
    .select('updated_at').eq('profile_id', input.profileId).maybeSingle()
  if (explanationResult.error) throw explanationResult.error

  const values = {
    plain_text: plainText,
    plain_text_en: normalizeNullable(input.plainTextEn),
  }

  if (explanationResult.data) {
    const { data, error } = await db.from('celeb_explanations')
      .update(values)
      .eq('profile_id', input.profileId)
      .eq('updated_at', explanationResult.data.updated_at)
      .select('profile_id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('인물 안내가 다른 작업에서 변경되었습니다. 새로고침 후 다시 저장하세요.')
  } else {
    const { error } = await db.from('celeb_explanations').insert({
      profile_id: input.profileId,
      ...values,
      interpretive_title: '미작성',
      interpretive_text: '미작성',
      interpretive_title_en: null,
      interpretive_text_en: null,
    })
    if (error) throw error
  }

  revalidatePath(`/celebs/${input.slug}`, 'page')
  await revalidateWebItems(
    [
      { domain: CACHE_TAGS.CELEBS, id: input.profileId },
      ...(input.slug ? [{ domain: CACHE_TAGS.CELEBS, id: input.slug }] : []),
    ],
  )
}
