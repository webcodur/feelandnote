import { NextResponse } from 'next/server'
import { queueTask } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series: seriesId } = await params
  const series = getSeriesById(seriesId)
  if (!series) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, lang, type, dry } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const args = ['youtube:upload', '--', '--episode', episode]
  if (lang) args.push('--lang', lang)
  if (type) args.push('--type', type)
  if (dry) args.push('--dry')

  const task = queueTask('youtube-upload', seriesId, episode, args)
  return NextResponse.json({ taskId: task.id })
}
