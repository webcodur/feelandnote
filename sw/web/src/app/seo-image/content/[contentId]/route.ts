import { NextRequest } from 'next/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { createSeoImageFailureResponse, createSeoImageResponse, createSquareSeoImage } from '@/lib/seoImage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 604800

interface ContentImageLocaleRow {
  locale: string
  thumbnail_url: string | null
}

interface ContentImageRow {
  content_locales: ContentImageLocaleRow[] | null
}

async function fetchContentImage(contentId: string, locale: 'ko' | 'en'): Promise<string | null> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('contents')
    .select('content_locales(locale, thumbnail_url)')
    .eq('id', contentId)
    .maybeSingle()

  if (error) throw error

  const rows = (data as ContentImageRow | null)?.content_locales ?? []
  const primary = rows.find((row) => row.locale === locale)
  const fallback = rows.find((row) => row.locale === (locale === 'en' ? 'ko' : 'en'))
  return primary?.thumbnail_url ?? fallback?.thumbnail_url ?? null
}

function getContentImage(contentId: string, locale: 'ko' | 'en') {
  return cachedDetail(
    CACHE_TAGS.CONTENTS,
    contentId,
    ['seo-image-content', contentId, locale],
    () => fetchContentImage(contentId, locale),
    { revalidate },
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await params
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ko'

  try {
    const sourceUrl = await getContentImage(contentId, locale)
    const image = await createSquareSeoImage(sourceUrl, 'content')
    return createSeoImageResponse(image)
  } catch (error) {
    console.error('[SEO 이미지] 작품 이미지 처리 실패:', contentId, error)
    return createSeoImageFailureResponse('content')
  }
}
