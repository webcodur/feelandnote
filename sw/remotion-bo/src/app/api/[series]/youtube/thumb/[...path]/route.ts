import { NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { path: segments } = await params

  // path traversal 방지
  const joined = segments.join('/')
  if (joined.includes('..') || segments.some(s => s.includes('..'))) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const filePath = path.join(REMOTION_ROOT, 'out', ...segments)
  if (!existsSync(filePath) || !filePath.endsWith('.png')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const stream = createReadStream(filePath)
  const webStream = Readable.toWeb(stream) as ReadableStream

  return new Response(webStream, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
