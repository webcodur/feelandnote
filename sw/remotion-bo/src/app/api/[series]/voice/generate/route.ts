import { NextResponse } from 'next/server'
import { runTask } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, engine, role, only, force, updateJson, upload, normalizeOnly } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const args = ['voice', '--', '--episode', episode, '--series', series]
  if (normalizeOnly) {
    // 생성 없이 gemini·elevenlabs 모든 wav 라우드니스 일괄 정규화만
    args.push('--normalize-only')
  } else {
    if (engine) args.push('--engine', engine)
    if (role) args.push('--role', role)
    if (only) args.push('--only', only)
    if (force) args.push('--force')
    if (updateJson !== false) args.push('--update-json')
    if (upload) args.push('--upload')
  }

  const task = runTask('voice', series, episode, args)
  return NextResponse.json({ taskId: task.id })
}
