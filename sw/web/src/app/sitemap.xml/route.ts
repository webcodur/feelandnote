import { NextResponse } from 'next/server'
import { serializeSitemapIndex } from '@/lib/sitemap'

// Next.js route config static analysis requires a literal; keep aligned with lib/sitemap.ts.
export const revalidate = 86400

export function GET() {
  return new NextResponse(serializeSitemapIndex(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
