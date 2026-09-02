import { NextResponse } from 'next/server'

export const revalidate = 3600

const BASE_URL = 'https://feelandnote.com'

interface CelebRow {
  slug: string
  nickname: string
  nickname_en: string | null
  bio: string | null
  created_at: string
}

async function fetchRecentCelebs(): Promise<CelebRow[]> {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  if (!url || !key) return []

  const params = new URLSearchParams({
    select: 'slug,nickname,nickname_en,bio,created_at',
    publication_status: 'eq.active',
    slug: 'not.is.null',
    order: 'created_at.desc',
    limit: '100',
  })

  const res = await fetch(`${url}/rest/v1/celebs?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) return []
  return res.json()
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const celebs = await fetchRecentCelebs()
  const now = new Date().toUTCString()

  const items = celebs.map((celeb) => {
    const title = celeb.nickname_en
      ? `${celeb.nickname} (${celeb.nickname_en})`
      : celeb.nickname
    const description = celeb.bio
      ? escapeXml(celeb.bio.slice(0, 200))
      : `${escapeXml(celeb.nickname)}의 감상 아카이브`
    const pubDate = new Date(celeb.created_at).toUTCString()

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${BASE_URL}/celeb/${celeb.slug}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/celeb/${celeb.slug}</guid>
    </item>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Feel&amp;Note - 셀럽 감상 아카이브</title>
    <link>${BASE_URL}</link>
    <description>역사 속 위인들의 책, 영화, 음악, 게임 감상 기록을 탐색하는 문화 아카이브</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
