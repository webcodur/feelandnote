import type { MetadataRoute } from 'next'
import { INDEXABLE_TIERS } from '@feelandnote/shared/constants/celeb-tiers'

// 사이트맵이 1시간 단위로 신선할 이유가 없다. 재생성 1회가 Supabase에서 약 1MB를 끌어오므로
// (셀럽 1,257행 + user_contents 11,230행 스캔) 주기를 하루로 둔다 — 이론 최대 750MB/월 → 30MB/월
export const revalidate = 86400

const BASE_URL = 'https://feelandnote.com'

// 색인 등급을 PostgREST 필터 문자열로 — 1개면 eq, 여러 개면 in
const INDEXABLE_TIER_FILTER =
  INDEXABLE_TIERS.length === 1
    ? `eq.${INDEXABLE_TIERS[0]}`
    : `in.(${INDEXABLE_TIERS.join(',')})`

/** Supabase REST API로 직접 fetch (supabase-js 의존 제거) */
async function fetchCelebs(): Promise<{ slug: string; created_at: string | null }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const allCelebs: { slug: string; created_at: string | null }[] = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      select: 'slug,created_at',
      profile_type: 'eq.CELEB',
      status: 'eq.active',
      // 색인 등급(full)만 등재한다 — 얇은 등급(light/fiction)은 콘텐츠가 없어
      // noindex 처리되므로 사이트맵 등재가 모순 신호(등재↔색인거부)를 만든다
      celeb_tier: INDEXABLE_TIER_FILTER,
      slug: 'not.is.null',
      order: 'created_at.asc',
      offset: String(offset),
      limit: String(PAGE_SIZE),
    })

    const res = await fetch(`${url}/rest/v1/profiles?${params}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      console.error(`[sitemap] Supabase REST failed: ${res.status} ${res.statusText}`)
      break
    }

    const data = await res.json()
    allCelebs.push(...data)

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allCelebs
}

/**
 * 셀럽 감상문이 1건 이상 달린 콘텐츠의 id 목록.
 *
 * user_contents에는 같은 콘텐츠에 여러 셀럽의 감상문이 달리므로 행 수(약 11,000)와
 * 콘텐츠 수(약 6,700)가 다르다. PostgREST에는 distinct가 없어 전량 받아 Set으로 중복을 없앤다.
 * 감상문이 0건인 콘텐츠는 출판사 소개문만 남아 상세 페이지에서 noindex 처리되므로 등재하지 않는다.
 */
async function fetchReviewedContentIds(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const contentIds = new Set<string>()
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      // profile_type 필터를 걸려면 조인 대상을 select에 넣어야 한다 — 최소 컬럼만 받는다
      select: 'content_id,user:profiles!user_contents_user_id_fkey!inner(profile_type)',
      review: 'not.is.null',
      visibility: 'eq.public',
      'user.profile_type': 'eq.CELEB',
      // content_id는 중복되므로 PK로 정렬해야 페이지 경계에서 행이 밀리거나 겹치지 않는다
      order: 'id.asc',
      offset: String(offset),
      limit: String(PAGE_SIZE),
    })

    const res = await fetch(`${url}/rest/v1/user_contents?${params}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      console.error(`[sitemap] user_contents REST failed: ${res.status} ${res.statusText}`)
      break
    }

    const data: { content_id: string | null }[] = await res.json()
    for (const row of data) {
      if (row.content_id) contentIds.add(row.content_id)
    }

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return [...contentIds]
}

/**
 * 기관 선정 — 선정 주체와 목록의 주소.
 *
 * 목록 화면은 "서울대 권장도서 100선" 같은 검색어와 정면으로 맞는 자리라 개별 등재한다.
 * 규모가 작아(기관 수십·목록 수백) 페이징 없이 한 번에 받는다.
 */
async function fetchCuratedPaths(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const res = await fetch(
    `${url}/rest/v1/curators?select=slug,curated_lists(slug)&is_featured=eq.true&limit=1000`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 86400 } },
  )
  if (!res.ok) {
    console.error(`[sitemap] curators REST failed: ${res.status} ${res.statusText}`)
    return []
  }

  const data: { slug: string; curated_lists: { slug: string }[] | null }[] = await res.json()
  return data.flatMap((c) => [
    `/library/curated/${c.slug}`,
    ...(c.curated_lists ?? []).map((l) => `/library/curated/${c.slug}/${l.slug}`),
  ])
}

function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
  lastModified?: Date,
): MetadataRoute.Sitemap[number][] {
  const normalizedPath = path === '/' ? '' : path
  const langs = {
    ko: `${BASE_URL}${normalizedPath}`,
    en: `${BASE_URL}/en${normalizedPath}`,
    'x-default': `${BASE_URL}${normalizedPath}`,
  }
  // lastModified는 실제 갱신 시각을 알 때만 기록한다.
  // new Date() 폴백은 매 재생성마다 "방금 수정됨"으로 찍혀 구글이 lastmod 신호를 무시하게 만든다
  return [
    { url: langs.ko, ...(lastModified && { lastModified }), changeFrequency, priority, alternates: { languages: langs } },
    { url: langs.en, ...(lastModified && { lastModified }), changeFrequency, priority, alternates: { languages: langs } },
  ]
}

// 리다이렉트 전용 스텁 경로(/explore/celebs·people·figure·celeb-feed·top-by-type, /agora)는
// 등재하지 않는다 — 사이트맵의 리다이렉트 URL은 GSC "알 수 없는 URL" 판정만 만든다(2026-07-14 제거)
const staticPaths: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
  ['/', 'daily', 1],
  // 탐색
  ['/explore', 'daily', 0.8],
  ['/explore/figures', 'daily', 0.8],
  ['/explore/ranking', 'daily', 0.7],
  ['/explore/timeline', 'weekly', 0.7],
  ['/explore/faction', 'daily', 0.7],
  ['/explore/youtube', 'weekly', 0.7],
  ['/explore/persona', 'weekly', 0.6],
  ['/explore/today', 'daily', 0.7],
  ['/explore/directory', 'weekly', 0.8],
  ['/explore/feed', 'daily', 0.7],
  // 서가
  ['/library', 'daily', 0.8],
  ['/library/popular', 'weekly', 0.8],
  ['/library/museum', 'monthly', 0.7],
  ['/library/academy', 'monthly', 0.7],
  ['/library/curated', 'weekly', 0.8],
  // 기타
  ['/rest', 'monthly', 0.5],
  // 홈 첫 화면에서 바로 이어지고 서비스가 무엇을 하는 곳인지 답하는 자리라 상향(2026-08-01)
  ['/about', 'monthly', 0.7],
  ['/terms', 'yearly', 0.3],
  ['/privacy', 'yearly', 0.3],
  ['/account-deletion', 'yearly', 0.3],
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [celebs, reviewedContentIds, curatedPaths] = await Promise.all([
    fetchCelebs(),
    fetchReviewedContentIds(),
    fetchCuratedPaths(),
  ])

  const staticEntries = staticPaths.flatMap(([path, freq, priority]) => entry(path, freq, priority))
  const celebEntries = celebs.flatMap((celeb) =>
    entry(`/celeb/${celeb.slug}`, 'weekly', 0.7, celeb.created_at ? new Date(celeb.created_at) : undefined),
  )
  // 쿼리스트링(?category=book)은 붙이지 않는다 — 상세 페이지는 id만으로 조회되므로 /content/{id}가 정본이다
  const contentEntries = reviewedContentIds.flatMap((id) => entry(`/content/${id}`, 'monthly', 0.6))
  const curatedEntries = curatedPaths.flatMap((path) => entry(path, 'monthly', 0.7))

  return [...staticEntries, ...celebEntries, ...contentEntries, ...curatedEntries]
}
