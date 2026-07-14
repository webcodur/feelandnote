import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { getJob } from '@/lib/jobs'
import { NextResponse } from 'next/server'

type Kind = 'video' | 'source' | 'cleaned' | 'baseVoice' | 'trainedVoice' | 'polishedVoice'
type Context = { params: Promise<{ id: string; kind: string }> }
const KINDS = new Set<Kind>(['video', 'source', 'cleaned', 'baseVoice', 'trainedVoice', 'polishedVoice'])

export async function GET(request: Request, { params }: Context) {
  const { id, kind } = await params
  if (!KINDS.has(kind as Kind)) return NextResponse.json({ message: '지원하지 않는 미디어입니다.' }, { status: 400 })
  const job = await getJob(id)
  const file = job?.files[kind as Kind]
  if (!file) return NextResponse.json({ message: '미디어 파일이 없습니다.' }, { status: 404 })

  try {
    const info = await stat(file)
    const contentType = kind === 'video' ? 'video/mp4' : 'audio/wav'
    const range = request.headers.get('range')
    if (!range) return streamFile(file, 0, info.size - 1, 200, contentType, info.size)
    const [startText, endText] = range.replace('bytes=', '').split('-')
    const start = Number(startText)
    const end = endText ? Number(endText) : Math.min(start + 2_000_000, info.size - 1)
    if (!Number.isFinite(start) || start < 0 || end >= info.size) return new Response(null, { status: 416 })
    return streamFile(file, start, end, 206, contentType, info.size)
  } catch {
    return NextResponse.json({ message: '미디어 파일을 읽지 못했습니다.' }, { status: 404 })
  }
}

function streamFile(file: string, start: number, end: number, status: number, contentType: string, total: number) {
  const nodeStream = createReadStream(file, { start, end })
  const headers = new Headers({
    'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
    'Content-Length': String(end - start + 1), 'Content-Type': contentType,
  })
  if (status === 206) headers.set('Content-Range', `bytes ${start}-${end}/${total}`)
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, { status, headers })
}
