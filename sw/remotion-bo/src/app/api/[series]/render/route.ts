import { NextResponse } from 'next/server'
import { runTask, loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById, isFactionSeries } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series: seriesId } = await params
  const series = getSeriesById(seriesId)
  if (!series) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, only, bookIndex } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  // 세력도 — 한 에피소드 = 세로 영상 1편(쇼츠). 책/쇼츠 슬롯/솔로 갈래 없음.
  // 컴포지션 ID 규약은 Root.tsx 세력도 등록과 일치: `Faction-{KEY 대문자}`.
  if (isFactionSeries(seriesId)) {
    const compId = `Faction-${episode.toUpperCase().replace(/[^A-Z0-9-]/g, '-')}`
    const t = runTask('render-faction', seriesId, episode, [
      'render', '--', compId, `out/Faction/${episode}.mp4`, '--codec', series.render.codec,
    ])
    return NextResponse.json({ taskIds: [t.id] })
  }

  const label = toPascal(episode)
  // episode 이름에서 KO/EN 구분 — '-en'로 끝나면 EN
  const baseName: string = episode.endsWith('-en') ? episode.slice(0, -3) : episode
  const baseLabel = toPascal(baseName)
  const lang = episode.endsWith('-en') ? 'EN' : 'KO'
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

  // 1권 모드(SOLO) — 책별 컴포지션 1편씩. bookIndex 지정 시 그 책만, 미지정 시 books 배열 전부.
  // 솔로는 별도 데이터 없이 책 본문에서 자동 변환된다.
  if (only === 'solo' || only === 'solos') {
    const ep = await loadEpisode(seriesId, episode)
    const booksArr: any[] = Array.isArray(ep.books) ? ep.books : []
    const indices = typeof bookIndex === 'number'
      ? (booksArr[bookIndex] ? [bookIndex] : [])
      : booksArr.map((_, i) => i)
    for (const idx of indices) {
      const num = String(idx + 1).padStart(2, '0')
      // 솔로 컴포지션 ID 규약: `{Pascal(person)}-{LANG}-B{NN}-VID` (Root.tsx 등록과 일치)
      const compId = `${baseLabel}-${lang}-B${num}-VID`
      // 출력 경로 — 롱폼·쇼츠와 동일 디렉토리 규약: out/{Pascal}/{LANG}/B{NN}-VID.mp4
      const outPath = `out/${baseLabel}/${lang}/B${num}-VID.mp4`
      const t = runTask('render-solo', seriesId, episode, [
        'render', '--', compId, outPath,
        '--codec', series.render.codec,
        ...(series.render.proresProfile ? ['--prores-profile', series.render.proresProfile] : []),
      ])
      taskIds.push(t.id)
    }
  }

  return NextResponse.json({ taskIds })
}
