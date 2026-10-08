import { NextRequest } from 'next/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { createSeoImageResponse, createSquareSeoImage } from '@/lib/seoImage'

export const runtime = 'nodejs'
export const revalidate = 604800

interface CelebImageRow {
  id: string
  avatar_url: string | null
  portrait_url: string | null
}

interface CelebImageSource {
  url: string | null
  variant: 'person' | 'avatar'
}

async function fetchCelebImage(slug: string): Promise<CelebImageSource> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celebs')
    .select('id, avatar_url, portrait_url')
    .eq('slug', slug)
    .eq('publication_status', 'active')
    .maybeSingle()

  if (error) throw error

  const celeb = data as CelebImageRow | null
  if (!celeb) return { url: null, variant: 'person' }
  if (celeb.portrait_url) return { url: celeb.portrait_url, variant: 'person' }

  // 상세 페이지와 같은 공개 소속·정렬을 사용한다. 대표사진이 없을 때만 화보를 조회한다.
  const { data: members, error: membersError } = await db
    .from('faction_member_rows')
    .select('lv2_id, image_url')
    .eq('celeb_id', celeb.id)
    .eq('hidden', false)
    .not('image_url', 'is', null)
    .order('sort_order', { ascending: true })
  if (membersError) throw membersError
  if (!members?.length) return { url: celeb.avatar_url, variant: 'avatar' }

  const { data: factions, error: factionsError } = await db
    .from('faction_lv2')
    .select('id, slug')
    .in('id', [...new Set(members.map(member => member.lv2_id))])
    .eq('is_featured', true)
  if (factionsError) throw factionsError

  const visibleIds = new Set(factions?.filter(faction => faction.slug).map(faction => faction.id))
  const artwork = members.find(member => visibleIds.has(member.lv2_id) && member.image_url)?.image_url
  return artwork ? { url: artwork, variant: 'person' } : { url: celeb.avatar_url, variant: 'avatar' }
}

function getCelebImage(slug: string) {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    slug,
    ['seo-image-celeb-v3-avatar-texture', slug],
    () => fetchCelebImage(slug),
    { revalidate, extraTags: [CACHE_TAGS.FACTIONS] },
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  let source: CelebImageSource = { url: null, variant: 'person' }
  try {
    source = await getCelebImage(slug)
  } catch (error) {
    console.error('[SEO 이미지] 인물 이미지 조회 실패:', slug, error)
  }

  const image = await createSquareSeoImage(source.url, source.variant)
  return createSeoImageResponse(image)
}
