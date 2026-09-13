import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getCelebSlugById } from '@/actions/celebs/getCelebSlugById'
import { getCelebBySlug } from '@/actions/user/getCelebBySlug'
import { getUserProfile } from '@/actions/user/getUserProfile'
import { redirect } from '@/i18n/navigation'
import { getCelebProfileUrl, isProfileId } from '@/lib/url'

// 메타데이터·레이아웃·본문이 같은 요청에서 같은 진입 판단을 공유한다.
export const getCelebRouteProfile = cache(async (
  slugOrId: string,
  locale: string,
  suffix = '',
) => {
  if (isProfileId(slugOrId)) {
    const slug = await getCelebSlugById(slugOrId)
    if (!slug) notFound()
    redirect({ href: getCelebProfileUrl({ id: slugOrId, slug }) + suffix, locale })
  }

  const result = await getCelebBySlug(slugOrId, locale)
  if (!result.success) {
    if (result.error === 'NOT_FOUND') notFound()
    throw new Error(result.message)
  }
  return result.data
})

// 회원 화면은 회원만 렌더하고, 외부에 남은 옛 인물 ID 주소는 정본으로 넘긴다.
export const getMemberRouteProfile = cache(async (userId: string, locale: string) => {
  const result = await getUserProfile(userId)
  if (result.success) return result.data
  if (result.error !== 'NOT_FOUND') throw new Error(result.message)

  const slug = await getCelebSlugById(userId)
  if (slug) redirect({ href: getCelebProfileUrl({ id: userId, slug }), locale })
  notFound()
})
