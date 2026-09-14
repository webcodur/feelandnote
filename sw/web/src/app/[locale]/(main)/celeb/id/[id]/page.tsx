import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getCelebRouteProfile } from '@/lib/profile-route'
import { isProfileId } from '@/lib/url'

// middleware가 UUID 진입만 이곳으로 재작성한다. 정본 slug 페이지의 ISR은 유지한다.
export const dynamic = 'force-dynamic'

export default async function CelebIdEntry({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale, id } = await params
  if (!isProfileId(id)) notFound()
  setRequestLocale(locale)

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, entry)
    }
  }
  await getCelebRouteProfile(id, locale, query.size ? `?${query}` : '')
  return null
}
