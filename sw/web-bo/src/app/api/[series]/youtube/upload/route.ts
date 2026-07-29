import { NextResponse } from 'next/server'
import { queueTask, cancelTask } from '@feelandnote/shared/bo/task-queue'
import { getSeriesById } from '@/features/book-recommend/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series: seriesId } = await params
  const series = getSeriesById(seriesId)
  if (!series) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, lang, type, shortsIndex, bookIndex, dry } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  // 업로드 CLI 진입점이 없는 계열 — 책 기반 업로드로 조용히 새지 않게 막는다.
  // 다른 라우트(render·youtube/status·youtube/sync)와 같은 형태로 맞춘다.
  if (series.dataModel !== 'book') {
    return NextResponse.json({ error: `youtube upload not implemented: ${series.dataModel}` }, { status: 501 })
  }

  const args = ['youtube:upload', '--', '--episode', episode]
  if (lang) args.push('--lang', lang)
  if (type) args.push('--type', type)
  if (typeof shortsIndex === 'number') args.push('--shorts-index', String(shortsIndex))
  // 1권 모드 — solo type일 때 bookIndex 전달
  if (typeof bookIndex === 'number') args.push('--book-index', String(bookIndex))
  if (dry) args.push('--dry')

  const task = queueTask('youtube-upload', seriesId, episode, args)
  return NextResponse.json({ taskId: task.id })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const ok = cancelTask(taskId)
  if (!ok) return NextResponse.json({ error: 'task not found or not cancellable' }, { status: 404 })
  return NextResponse.json({ cancelled: taskId })
}
