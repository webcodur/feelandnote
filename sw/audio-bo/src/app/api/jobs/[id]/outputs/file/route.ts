import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { getJob } from '@/lib/jobs'
import { resolveOutputFile } from '@/lib/output-files'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Context) {
  const id = (await params).id
  if (!await getJob(id)) return NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
  const file = resolveOutputFile(id, new URL(request.url).searchParams.get('path') ?? '')
  if (!file) return NextResponse.json({ message: '지원하지 않는 파일 경로입니다.' }, { status: 400 })
  try {
    const info = await stat(file)
    const range = request.headers.get('range')
    if (!range) return stream(file, 0, info.size - 1, 200, info.size)
    const [startText, endText] = range.replace('bytes=', '').split('-')
    const start = Number(startText)
    const end = endText ? Number(endText) : Math.min(start + 2_000_000, info.size - 1)
    if (!Number.isFinite(start) || start < 0 || end >= info.size) return new Response(null, { status: 416 })
    return stream(file, start, end, 206, info.size)
  } catch {
    return NextResponse.json({ message: '음성 파일을 읽지 못했습니다.' }, { status: 404 })
  }
}

function stream(file: string, start: number, end: number, status: number, total: number) {
  const headers = new Headers({
    'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
    'Content-Length': String(end - start + 1), 'Content-Type': 'audio/wav',
  })
  if (status === 206) headers.set('Content-Range', `bytes ${start}-${end}/${total}`)
  return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status, headers })
}
