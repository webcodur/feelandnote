import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://feelandnote.com'

/** 빌드 타임용 Supabase 클라이언트 (cookies 불필요) */
function createBuildClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/** 셀럽 사이트맵 1개당 최대 URL 수 */
const CELEBS_PER_SITEMAP = 200

/** 각 경로에 대해 ko(기본) + en alternates를 포함하는 sitemap 엔트리 생성 */
function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  const normalizedPath = path === '/' ? '' : path
  return {
    url: `${BASE_URL}${normalizedPath}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ko: `${BASE_URL}${normalizedPath}`,
        en: `${BASE_URL}/en${normalizedPath}`,
      },
    },
  }
}

/**
 * 사이트맵 인덱스 생성 (여러 사이트맵으로 분할)
 * - id=0: 정적 라우트
 * - id=1~N: 셀럽 라우트 (200개씩 분할)
 */
export async function generateSitemaps() {
  const supabase = createBuildClient()
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('slug', 'is', null)

  const celebCount = count ?? 0
  const celebSitemapCount = Math.ceil(celebCount / CELEBS_PER_SITEMAP)

  // id=0 → static, id=1~N → celebs
  return Array.from({ length: 1 + celebSitemapCount }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // id=0: 정적 라우트
  if (id === 0) {
    return [
      entry('/', 'daily', 1),
      entry('/explore', 'daily', 0.8),
      entry('/explore/figures', 'daily', 0.8),
      entry('/explore/people', 'daily', 0.6),
      entry('/scriptures', 'daily', 0.8),
      entry('/scriptures/era', 'weekly', 0.8),
      entry('/scriptures/museum', 'monthly', 0.7),
      entry('/scriptures/academy', 'monthly', 0.7),
      entry('/explore/today', 'daily', 0.7),
      entry('/explore/directory', 'weekly', 0.8),
      entry('/scriptures/profession', 'weekly', 0.7),
      entry('/agora', 'daily', 0.7),
      entry('/explore/feed', 'daily', 0.7),
      entry('/rest', 'monthly', 0.5),
      entry('/about', 'monthly', 0.5),
      entry('/terms', 'yearly', 0.3),
      entry('/privacy', 'yearly', 0.3),
      entry('/contact', 'yearly', 0.3),
    ]
  }

  // id=1~N: 셀럽 라우트 (페이지네이션)
  const celebIndex = id - 1
  const supabase = createBuildClient()
  const { data: celebs } = await supabase
    .from('profiles')
    .select('slug, updated_at')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('slug', 'is', null)
    .order('created_at', { ascending: true })
    .range(celebIndex * CELEBS_PER_SITEMAP, (celebIndex + 1) * CELEBS_PER_SITEMAP - 1)

  return (celebs ?? []).map((celeb) =>
    entry(`/celeb/${celeb.slug}`, 'weekly', 0.7, celeb.updated_at ? new Date(celeb.updated_at) : undefined),
  )
}
