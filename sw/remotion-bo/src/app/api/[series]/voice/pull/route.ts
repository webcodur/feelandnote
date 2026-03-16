import { NextResponse } from 'next/server'
import { runTask } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, all } = await req.json()
  const args = ['voice:pull', '--']
  if (all) args.push('--all')
  else if (episode) args.push('--episode', episode)
  else return NextResponse.json({ error: 'episode or all required' }, { status: 400 })
  const task = runTask('pull', series, episode ?? 'all', args)
  return NextResponse.json({ taskId: task.id })
}
