import { NextResponse } from 'next/server'
import { readFile, writeFile, readdir } from 'fs/promises'
import path from 'path'
import { factionEpisodeDir } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'
import { paramToFolder } from '@/lib/faction-edit-route'

// ── 세력도감 발화 시각 읽기·쓰기 ──
//
// 산출물은 편별로 나뉘어 있다: public/factions/{에피소드}/data.timing.p<N>.<lang>.json
// (키 = 음원 파일명에서 확장자를 뗀 이름). 인물이 몇 편에 속하는지 화면이 몰라도 되도록,
// 그 이름을 가진 편 파일을 찾아 처리한다.
//   GET  ?stem=F06C01P05&lang=ko → { timings, file } (없으면 timings: null)
//   POST { stem, lang, timings }  → 그 이름을 가진 편 파일에서 해당 항목만 갱신(다른 인물 보존)
//
// 받아쓰기 오차를 손으로 고친 결과를 여기로 저장한다. 렌더가 이 파일을 읽는다.

/** 한 에피소드 폴더의 발화 시각 파일 목록 */
async function timingFiles(epDir: string, lang: string): Promise<string[]> {
  const re = new RegExp(`^data\\.timing(?:\\.p\\d+)?\\.${lang}\\.json$`)
  try { return (await readdir(epDir)).filter(e => re.test(e)) }
  catch { return [] }
}

/** ko|en 만 허용 — 정규식에 그대로 끼워 넣는 값이라 검사가 필요하다 */
const asLang = (v: unknown): 'ko' | 'en' => (v === 'en' ? 'en' : 'ko')

export async function GET(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  const url = new URL(req.url)
  const stem = url.searchParams.get('stem')
  const lang = asLang(url.searchParams.get('lang'))
  if (!stem) return NextResponse.json({ ok: false, error: 'stem required' }, { status: 400 })

  const epDir = factionEpisodeDir(paramToFolder(episode))
  for (const f of await timingFiles(epDir, lang)) {
    try {
      const data = JSON.parse(await readFile(path.join(epDir, f), 'utf8'))
      if (data[stem]) return NextResponse.json({ ok: true, timings: data[stem], file: f })
    } catch { /* 파손 파일 무시 */ }
  }
  return NextResponse.json({ ok: true, timings: null })
}

export async function POST(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  const { stem, lang, timings } = await req.json().catch(() => ({}))
  if (!stem || !Array.isArray(timings)) {
    return NextResponse.json({ ok: false, error: 'stem, timings required' }, { status: 400 })
  }

  const epDir = factionEpisodeDir(paramToFolder(episode))
  for (const f of await timingFiles(epDir, asLang(lang))) {
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
  return NextResponse.json({ ok: false, error: '해당 인물의 발화 시각 파일이 없다 — 받아쓰기·정렬을 먼저 실행' })
}
