import { NextResponse } from 'next/server'
import { runTask, loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series: seriesId } = await params
  const series = getSeriesById(seriesId)
  if (!series) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, only } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const label = toPascal(episode)
  const taskIds: string[] = []

  if (!only || only === 'longform') {
    const t = runTask('render-longform', seriesId, episode, [
      'render', '--', label, `out/${episode}.mov`, '--codec', series.render.codec,
      ...(series.render.proresProfile ? ['--prores-profile', series.render.proresProfile] : []),
    ])
    taskIds.push(t.id)
  }

  if (!only || only === 'shorts') {
    const ep = await loadEpisode(seriesId, episode)
    if (ep.shorts && series.render.shortsSuffix) {
      const t = runTask('render-shorts', seriesId, episode, [
        'render', '--', `${label}${series.render.shortsSuffix}`, `out/${episode}-short.mov`,
        '--codec', series.render.codec,
        ...(series.render.proresProfile ? ['--prores-profile', series.render.proresProfile] : []),
      ])
      taskIds.push(t.id)
    }
  }

  return NextResponse.json({ taskIds })
}
