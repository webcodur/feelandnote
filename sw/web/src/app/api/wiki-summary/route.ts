import { NextRequest, NextResponse } from 'next/server'
import { createMetadataCache, fetchMetadataJson, MetadataError, METADATA_LIMITS, metadataErrorStatus } from '@/lib/publicMetadata'

const CACHE_TTL = 1000 * 60 * 60 // 1시간
const readCachedSummary = createMetadataCache<string | null>(CACHE_TTL)

async function fetchWikiSummary(title: string, lang: string, signal: AbortSignal): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const data = await fetchMetadataJson<{ type?: string; extract?: string }>(url, signal).catch(error => {
    if (error instanceof MetadataError && error.status === 404) return null
    throw error
  })
  if (!data) return null
  if (data.type === 'disambiguation') return null
  return data.extract || null
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title || title.length > METADATA_LIMITS.titleLength) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const locale = req.nextUrl.searchParams.get('locale') === 'ko' ? 'ko' : 'en'
  const cacheKey = `${locale}:${title}`

  try {
    const summary = await readCachedSummary(cacheKey, async () => {
      const signal = AbortSignal.timeout(METADATA_LIMITS.timeoutMs)
      const localized = locale === 'ko' ? await fetchWikiSummary(title, 'ko', signal) : null
      return localized ?? await fetchWikiSummary(title, 'en', signal)
    })
    return NextResponse.json({ summary }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    })
  } catch (error) {
    return NextResponse.json({ summary: null }, { status: metadataErrorStatus(error), headers: { 'Cache-Control': 'no-store' } })
  }
}
