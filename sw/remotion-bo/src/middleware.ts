import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const segments = url.pathname.split('/').filter(Boolean)
  const [series, name, lang, tab, mode, person, ...cardPath] = segments

  if (series !== 'faction' || mode !== 'card') return NextResponse.next()

  const rewritten = url.clone()
  rewritten.pathname = `/${series}/${name}/${lang}/${tab}`
  rewritten.searchParams.set('cardOpen', '1')
  if (person) rewritten.searchParams.set('cardPerson', decodeURIComponent(person))
  if (cardPath.length) rewritten.searchParams.set('cardPath', cardPath.map(decodeURIComponent).join('/'))
  return NextResponse.rewrite(rewritten)
}

export const config = {
  matcher: '/faction/:path*',
}
