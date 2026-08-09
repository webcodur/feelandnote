import { NextResponse } from 'next/server'
import {
  getSitemapEntries,
  serializeSitemap,
  SITEMAP_NAMES,
} from '@/lib/sitemap'

// Next.js route config static analysis requires a literal; keep aligned with lib/sitemap.ts.
export const revalidate = 86400

export function generateStaticParams() {
  return SITEMAP_NAMES.map((name) => ({ name: `${name}.xml` }))
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name: filename } = await context.params
  const name = filename.endsWith('.xml') ? filename.slice(0, -4) : ''
  const entries = await getSitemapEntries(name)

  if (!entries) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(serializeSitemap(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
