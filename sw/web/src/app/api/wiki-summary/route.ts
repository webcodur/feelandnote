import { NextRequest, NextResponse } from 'next/server'

const CACHE = new Map<string, { data: string | null; ts: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1시간

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  // 메모리 캐시
  const cached = CACHE.get(title)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ summary: cached.data })
  }

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FeelandnoteBot/1.0' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      CACHE.set(title, { data: null, ts: Date.now() })
      return NextResponse.json({ summary: null })
    }

    const data = await res.json()

    if (data.type === 'disambiguation') {
      CACHE.set(title, { data: null, ts: Date.now() })
      return NextResponse.json({ summary: null })
    }

    const summary = data.extract || null
    CACHE.set(title, { data: summary, ts: Date.now() })

    return NextResponse.json({ summary })
  } catch {
    return NextResponse.json({ summary: null })
  }
}
