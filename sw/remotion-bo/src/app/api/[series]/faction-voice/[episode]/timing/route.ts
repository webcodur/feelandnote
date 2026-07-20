import { NextResponse } from 'next/server'
import { readFile, writeFile, readdir } from 'fs/promises'
import path from 'path'
import { isSeriesModel } from '@/lib/series-registry'
import { FACTIONS_DIR, safeDirName } from '@/lib/faction-utils'

// ── 세력도 발화 시각(voiceTimings) 읽기/쓰기 ──
//
// 산출물은 편별로 분리돼 있다: public/factions/{ep}/data.timing.p<N>.<lang>.json (키 = wav stem).
// 인물의 편(part)을 클라이언트가 몰라도 되도록, stem 으로 모든 편 파일을 검색해 그 stem 을 가진 파일을 찾는다.
//   GET  ?stem=F06C01P05&lang=ko → { timings, file } (없으면 timings: null)
//   POST { stem, lang, timings }  → 그 stem 을 가진 편 파일에서 해당 stem 만 갱신(다른 인물 보존)
//
// SYNC 패널(VoiceTimingEditor)이 whisper 오차를 수동 교정한 결과를 여기로 저장한다. 렌더는 이 파일을 읽는다.

/** 한 에피소드 디렉토리의 발화 시각 파일(data.timing.p<N>.<lang>.json) 목록 */
async function timingFiles(epDir: string, lang: string): Promise<string[]> {
  const re = new RegExp(`^data\\.timing(?:\\.p\\d+)?\\.${lang}\\.json$`)
  try { return (await readdir(epDir)).filter(e => re.test(e)) }
  catch { return [] }
}

export async function GET(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isSeriesModel(series, 'faction')) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }
  const url = new URL(req.url)
  const stem = url.searchParams.get('stem')
  const lang = url.searchParams.get('lang') || 'ko'
  if (!stem) return NextResponse.json({ ok: false, error: 'stem required' }, { status: 400 })

  const epDir = path.join(FACTIONS_DIR, safeDirName(decodeURIComponent(episode)))
  for (const f of await timingFiles(epDir, lang)) {
    try {
      const data = JSON.parse(await readFile(path.join(epDir, f), 'utf8'))
      if (data[stem]) return NextResponse.json({ ok: true, timings: data[stem], file: f })
    } catch { /* 파손 파일 무시 */ }
  }
  return NextResponse.json({ ok: true, timings: null })
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isSeriesModel(series, 'faction')) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }
  const { stem, lang = 'ko', timings } = await req.json().catch(() => ({}))
  if (!stem || !Array.isArray(timings)) {
    return NextResponse.json({ ok: false, error: 'stem, timings required' }, { status: 400 })
  }

  const epDir = path.join(FACTIONS_DIR, safeDirName(decodeURIComponent(episode)))
  for (const f of await timingFiles(epDir, lang)) {
    const p = path.join(epDir, f)
    try {
      const data = JSON.parse(await readFile(p, 'utf8'))
      if (data[stem]) {
        data[stem] = timings
        await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
        return NextResponse.json({ ok: true, file: f })
      }
    } catch { /* 파손 파일 무시 */ }
  }
  return NextResponse.json({ ok: false, error: 'stem 을 가진 발화 시각 파일 없음 — 팩션 sync(전사+align)를 먼저 실행' })
}
