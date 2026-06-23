import { NextResponse } from 'next/server'
import { runTask, loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById, isFactionSeries } from '@/lib/series-registry'
import { loadFactionEpisode } from '@/lib/faction-utils'
import { factionVariants } from '@feelandnote/shared/lib/youtube-faction-meta'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series: seriesId } = await params
  const series = getSeriesById(seriesId)
  if (!series) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, only, bookIndex } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  // 세력도 — 컴포지션 ID·출력 접미사는 factionVariants(에피소드 데이터 기반) 단일원천을 따른다(Root.tsx 등록과 일치).
  // 세로 롱폼(KO-LV) + 세로 쇼츠 N편(진영 part 의 실제 편 수만큼). 가로(LH)·영문(EN)은 Root.tsx에서 주석.
  if (isFactionSeries(seriesId)) {
    const base = `Faction-${episode.toUpperCase().replace(/[^A-Z0-9-]/g, '-')}`
    const factionData = await loadFactionEpisode(episode)
    // only 미지정=전체 / 'longform'·'shorts' 로 거를 수 있다.
    const targets = factionVariants(factionData.groups)
      .filter(v => !only || (only === 'shorts' ? v.isShorts : only === 'longform' ? !v.isShorts : true))
      .map(v => ({ comp: `${base}-${v.fileSuffix}`, out: `out/Faction/${episode}-${v.fileSuffix}.mp4` }))
    const taskIds = targets.map(t =>
      runTask('render-faction', seriesId, episode, ['render', '--', t.comp, t.out, '--codec', series.render.codec]).id,
    )
    // 자막(SRT)도 함께 — 데이터 기반이라 즉시 생성된다(롱폼·쇼츠 1·2편 한 번에).
    taskIds.push(runTask('faction-srt', seriesId, episode, ['faction:srt', '--', '--episode', episode]).id)
    return NextResponse.json({ taskIds })
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
