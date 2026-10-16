import { NextRequest, NextResponse } from 'next/server'
import { getTmdbFilmography } from '@/lib/celeb/tmdbFilmography'
import { metadataErrorStatus } from '@/lib/publicMetadata'
import { FILMOGRAPHY_CACHE_TTL_MS } from '@/lib/celeb/filmography'

export async function GET(request: NextRequest) {
  const qid = request.nextUrl.searchParams.get('qid')
  const locale = request.nextUrl.searchParams.get('locale') ?? 'ko'
  if (!qid || !/^Q\d{1,12}$/.test(qid) || (locale !== 'ko' && locale !== 'en')) {
    return NextResponse.json({ error: 'Invalid filmography request' }, { status: 400 })
  }
  try {
    const data = await getTmdbFilmography(qid, locale)
    return NextResponse.json(data, { headers: {
      'Cache-Control': `public, max-age=300, s-maxage=${FILMOGRAPHY_CACHE_TTL_MS / 1000}, stale-while-revalidate=3600`,
    } })
  } catch (error) {
    return NextResponse.json({ error: 'Filmography unavailable' }, {
      status: metadataErrorStatus(error), headers: { 'Cache-Control': 'no-store' },
    })
  }
}
