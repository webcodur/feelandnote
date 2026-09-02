import { NextRequest } from 'next/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { createSeoImageResponse, createSquareSeoImage } from '@/lib/seoImage'

export const runtime = 'nodejs'
export const revalidate = 604800

interface CelebImageRow {
  avatar_url: string | null
  portrait_url: string | null
}

async function fetchCelebImage(slug: string): Promise<string | null> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celebs')
    .select('avatar_url, portrait_url')
    .eq('slug', slug)
    .eq('publication_status', 'active')
    .maybeSingle()

  if (error) throw error

  const celeb = data as CelebImageRow | null
  return celeb?.avatar_url ?? celeb?.portrait_url ?? null
}

function getCelebImage(slug: string) {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    slug,
    ['seo-image-celeb', slug],
    () => fetchCelebImage(slug),
    { revalidate },
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  let sourceUrl: string | null = null
  try {
    sourceUrl = await getCelebImage(slug)
  } catch (error) {
    console.error('[SEO 이미지] 인물 이미지 조회 실패:', slug, error)
  }

  const image = await createSquareSeoImage(sourceUrl, 'person')
  return createSeoImageResponse(image)
}
