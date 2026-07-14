import { createJob, listJobs } from '@/lib/jobs'
import { NextResponse } from 'next/server'

type CreateBody = { name: string; sourceUrl: string; speaker: string }
const SPEAKER = /^[a-z0-9-]+$/i

export async function GET() { return NextResponse.json(await listJobs()) }

export async function POST(request: Request) {
  const body = await request.json() as CreateBody
  const validUrl = URL.canParse(body.sourceUrl) && ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(new URL(body.sourceUrl).hostname)
  if (!body.name?.trim() || !SPEAKER.test(body.speaker) || !validUrl) return NextResponse.json({ message: '작업 이름, 유튜브 주소와 영문 저장 이름이 필요합니다.' }, { status: 400 })
  return NextResponse.json(await createJob({ ...body, startSeconds: 0, endSeconds: 0, name: body.name.trim(), speaker: body.speaker.toLowerCase() }), { status: 201 })
}
