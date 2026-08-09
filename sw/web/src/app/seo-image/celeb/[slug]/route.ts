import { unstable_cache } from 'next/cache'
import { NextRequest } from 'next/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { createSeoImageResponse, createSquareSeoImage } from '@/lib/seoImage'

export const runtime = 'nodejs'
export const revalidate = 604800

interface CelebImageRow {
  avatar_url: string | null
  portrait_url: string | null
}

const getCelebImage = unstable_cache(
  async (slug: string): Promise<string | null> => {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('celebs')
      .select('avatar_url, portrait_url')
      .eq('slug', slug)
      .eq('publication_status', 'active')
      .maybeSingle()

    if (error) throw error

    const celeb = data as CelebImageRow | null
    return celeb?.avatar_url ?? celeb?.portrait_url ?? null
  },
  ['seo-image-celeb'],
  { revalidate, tags: [CACHE_TAGS.CELEBS] },
)

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
