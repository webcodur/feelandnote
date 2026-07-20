import { getJob, saveJob } from '@/lib/jobs'
import type { MediaSegment } from '@/lib/types'
import { isVoiceDirection } from '@/lib/voice-directions'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Context) {
  const job = await getJob((await params).id)
  return job ? NextResponse.json(job) : NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
}

export async function PATCH(request: Request, { params }: Context) {
  const job = await getJob((await params).id)
  if (!job) return NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
  const body = await request.json() as { transcript?: string; synthesisText?: string; voiceDirections?: unknown[]; segments?: MediaSegment[]; trainingSpeaker?: 'A' | 'B' }
  const voiceDirections = body.voiceDirections
    ? [...new Set(body.voiceDirections.filter(isVoiceDirection))]
    : job.voiceDirections
  const next = {
    ...job,
    transcript: body.transcript?.trim() ?? job.transcript,
    synthesisText: body.synthesisText?.trim() ?? job.synthesisText,
    voiceDirections,
    segments: body.segments ?? job.segments,
    trainingSpeaker: body.trainingSpeaker ?? job.trainingSpeaker,
    updatedAt: new Date().toISOString(),
  }
  await saveJob(next)
  return NextResponse.json(next)
}
