import { NextRequest, NextResponse } from 'next/server'

const CACHE = new Map<string, { data: string | null; ts: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1시간

async function fetchWikiSummary(title: string, lang: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FeelandnoteBot/1.0' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.type === 'disambiguation') return null
  return data.extract || null
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const locale = req.nextUrl.searchParams.get('locale') || 'en'
  const cacheKey = `${locale}:${title}`

  // 메모리 캐시
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ summary: cached.data })
  }

  try {
    let summary: string | null = null

    if (locale === 'ko') {
      // ko 우선 시도 → 없으면 en fallback
      summary = await fetchWikiSummary(title, 'ko')
      if (!summary) {
        summary = await fetchWikiSummary(title, 'en')
      }
    } else {
      summary = await fetchWikiSummary(title, 'en')
    }

    CACHE.set(cacheKey, { data: summary, ts: Date.now() })
    return NextResponse.json({ summary }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ summary: null })
  }
}
