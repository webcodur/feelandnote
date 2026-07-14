import { getJob, saveJob } from '@/lib/jobs'
import { startWorker } from '@/lib/worker'
import type { JobAction, JobStage } from '@/lib/types'
import { NextResponse } from 'next/server'

const ACTIONS = new Set<JobAction>(['extract', 'clean', 'transcribe', 'train', 'synthesize'])
const START_STAGE: Record<JobAction, JobStage> = { extract: 'extracting', clean: 'cleaning', transcribe: 'transcribing', train: 'training', synthesize: 'synthesizing' }
type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Context) {
  const id = (await params).id
  const job = await getJob(id)
  if (!job) return NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
  if (['extracting', 'cleaning', 'transcribing', 'training', 'synthesizing'].includes(job.stage)) {
    return NextResponse.json({ message: '진행 중인 작업이 끝난 뒤 다시 실행하세요.' }, { status: 409 })
  }
  const body = await request.json() as { action: JobAction }
  if (!ACTIONS.has(body.action)) return NextResponse.json({ message: '지원하지 않는 작업입니다.' }, { status: 400 })
  await saveJob({ ...job, stage: START_STAGE[body.action], message: '작업을 시작하는 중', updatedAt: new Date().toISOString() })
  startWorker(id, body.action)
  return NextResponse.json({ accepted: true }, { status: 202 })
}
