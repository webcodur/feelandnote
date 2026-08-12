import { NextResponse } from 'next/server'
import { getBookByIsbn } from '@feelandnote/content-search/kakao-books'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = Boolean(process.env.KAKAO_REST_API_KEY)

  try {
    const book = await getBookByIsbn('9788960177567')
    return NextResponse.json(
      {
        configured,
        found: Boolean(book),
        descriptionLength: book?.metadata.description.length ?? 0,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[DEBUG-book-intro-env]', message)
    return NextResponse.json(
      { configured, found: false, descriptionLength: 0, error: message },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
