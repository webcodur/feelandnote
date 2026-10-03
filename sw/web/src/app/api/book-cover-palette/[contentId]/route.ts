import { NextRequest, NextResponse } from 'next/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { getBookShelfBook } from '@/actions/books/getBookShelfBook'
import { cachedDetail, LIST_REVALIDATE } from '@/lib/cache'
import { readBookCoverPalette } from '@/lib/books/bookCoverPalette.server'
import { COVER_PALETTE_VERSION } from '@/lib/books/coverPalette'

export async function GET(request: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contentId)) {
    return NextResponse.json({ palette: null }, { status: 400 })
  }
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ko'
  const editionParam = request.nextUrl.searchParams.get('edition')
  const editionId = editionParam === null ? undefined : Number(editionParam)
  if (editionId !== undefined && (!Number.isSafeInteger(editionId) || editionId <= 0)) return NextResponse.json({ palette: null }, { status: 400 })
  try {
    const book = await getBookShelfBook(contentId, locale)
    if (!book) return NextResponse.json({ palette: null }, { status: 404 })
    const edition = book.editions.find((item) => item.id === (editionId ?? book.preferredEditionId))
    if (editionId !== undefined && !edition) return NextResponse.json({ palette: null }, { status: 404 })
    const source = edition?.thumbnailUrl ?? book.thumbnailUrl
    if (!source) return NextResponse.json({ palette: null }, { status: 404 })
    const palette = await cachedDetail(CACHE_TAGS.CONTENTS, contentId,
      ['book-cover-palette', COVER_PALETTE_VERSION, contentId, source], () => readBookCoverPalette(source))
    return NextResponse.json({ palette, source }, { headers: { 'Cache-Control': `public, max-age=${LIST_REVALIDATE}` } })
  } catch {
    return NextResponse.json({ palette: null }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
