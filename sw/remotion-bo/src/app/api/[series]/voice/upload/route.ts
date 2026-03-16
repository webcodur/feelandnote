import { NextResponse } from 'next/server'
import { runTask } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, force } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })
  const args = ['voice:upload', '--', '--episode', episode]
  if (force) args.push('--force')
  const task = runTask('upload', series, episode, args)
  return NextResponse.json({ taskId: task.id })
}
