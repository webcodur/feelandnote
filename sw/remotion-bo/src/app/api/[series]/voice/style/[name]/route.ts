import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { isValidSeries } from '@/lib/series-registry'
import { EPISODES_DIR, parseEpisodeId } from '@/lib/server-utils'

// 롱폼 구간별 발화 스타일 저장 — episode.voiceStyles[sectionKey] = string.
// 빈 입력/null은 키 삭제(= role 기반 폴백). 빈 문자열 옵트아웃은 JSON 직접 편집으로만 다룬다.
// ko/en 두 파일 모두 동기화한다(파이프라인이 locale별로 같은 키를 읽음).

const STAGES = ['live', 'done', 'todo', 'pre-todo'] as const

function resolvePersonDir(person: string): string | null {
  for (const st of STAGES) {
    const d = path.join(EPISODES_DIR, st, person)
    if (existsSync(d)) return d
  }
  return null
}

function detectIndent(raw: string): number {
  const m = raw.match(/^\n? *\{[\r\n]+( +)/)
  if (m) return m[1].length
  const lines = raw.split('\n')
  for (const ln of lines) {
    const lead = ln.match(/^( +)\S/)
    if (lead) return lead[1].length
  }
  return 4
}

async function patchStyleFile(filePath: string, sectionKey: string, value: string | null): Promise<void> {
  const raw = await readFile(filePath, 'utf-8')
  const indent = detectIndent(raw)
  const data = JSON.parse(raw) as { voiceStyles?: Record<string, string> }
  if (value === null || value === '') {
    if (data.voiceStyles && typeof data.voiceStyles === 'object') {
      delete data.voiceStyles[sectionKey]
      if (Object.keys(data.voiceStyles).length === 0) delete data.voiceStyles
    }
  } else {
    if (!data.voiceStyles || typeof data.voiceStyles !== 'object') data.voiceStyles = {}
    data.voiceStyles[sectionKey] = value
  }
  const trailing = raw.endsWith('\n') ? '\n' : ''
  await writeFile(filePath, JSON.stringify(data, null, indent) + trailing, 'utf-8')
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ series: string; name: string }> },
) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  type Body = { sectionKey?: string; value?: string | null }
  const body = (await req.json()) as Body
  if (!body || typeof body.sectionKey !== 'string' || !body.sectionKey) {
    return NextResponse.json({ error: 'sectionKey required' }, { status: 400 })
  }
  const value = typeof body.value === 'string' ? body.value : null

  const { person } = parseEpisodeId(name)
  const dir = resolvePersonDir(person)
  if (!dir) return NextResponse.json({ error: `episode not found: ${person}` }, { status: 404 })

  const written: string[] = []
  try {
    for (const loc of ['ko', 'en'] as const) {
      const fp = path.join(dir, `${loc}.json`)
      if (!existsSync(fp)) continue
      await patchStyleFile(fp, body.sectionKey, value)
      written.push(`${loc}.json`)
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  if (written.length === 0) return NextResponse.json({ error: 'no target file existed' }, { status: 404 })
  return NextResponse.json({ success: true, sectionKey: body.sectionKey, value, files: written })
}
