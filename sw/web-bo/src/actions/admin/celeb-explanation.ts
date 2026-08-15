'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateWebItems } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { CelebExplanationReviewStatus } from '@/lib/admin/celeb-explanations'

export interface SaveCelebExplanationInput {
  profileId: string
  slug: string | null
  plainText: string
  interpretiveTitle: string
  interpretiveText: string
  plainTextEn: string | null
  interpretiveTitleEn: string | null
  interpretiveTextEn: string | null
  reviewStatus: CelebExplanationReviewStatus
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

export async function saveCelebExplanation(input: SaveCelebExplanationInput): Promise<void> {
  await requireAdmin()

  const plainText = input.plainText.trim()
  const interpretiveTitle = input.interpretiveTitle.trim()
  const interpretiveText = input.interpretiveText.trim()
  if (!plainText) throw new Error('인물 안내를 입력하세요.')
  if (!interpretiveTitle) throw new Error('인물 탐구 제목을 입력하세요.')
  if (!interpretiveText) throw new Error('인물 탐구 본문을 입력하세요.')

  const supabase = createAdminClient()
  const { error } = await supabase.from('celeb_explanations').upsert(
    {
      profile_id: input.profileId,
      plain_text: plainText,
      interpretive_title: interpretiveTitle,
      interpretive_text: interpretiveText,
      plain_text_en: normalizeNullable(input.plainTextEn),
      interpretive_title_en: normalizeNullable(input.interpretiveTitleEn),
      interpretive_text_en: normalizeNullable(input.interpretiveTextEn),
      review_status: input.reviewStatus,
    },
    { onConflict: 'profile_id' },
  )

  if (error) throw error

  revalidatePath(`/celebs/${input.slug}`, 'page')
  await revalidateWebItems(
    [
      { domain: CACHE_TAGS.CELEBS, id: input.profileId },
      ...(input.slug ? [{ domain: CACHE_TAGS.CELEBS, id: input.slug }] : []),
    ],
  )
}
