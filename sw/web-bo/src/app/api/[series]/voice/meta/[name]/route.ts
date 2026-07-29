import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'
import {
  findEpisodeDir,
  isNewLayout,
  listBookFolders,
  loadEpisode,
  parseEpisodeId,
} from '@/features/book-recommend/lib/server-utils'

// ── Path parser (dot/bracket notation) ──

type Segment = string | number

function parsePath(p: string): Segment[] {
  const out: Segment[] = []
  let i = 0
  while (i < p.length) {
    if (p[i] === '.') { i++; continue }
    if (p[i] === '[') {
      const close = p.indexOf(']', i)
      if (close < 0) throw new Error(`unclosed bracket at ${i}`)
      const idx = p.slice(i + 1, close)
      const n = Number(idx)
      if (!Number.isInteger(n) || n < 0) throw new Error(`invalid array index: ${idx}`)
      out.push(n)
      i = close + 1
      continue
    }
    let j = i
    while (j < p.length && p[j] !== '.' && p[j] !== '[') j++
    const key = p.slice(i, j)
    if (!key) throw new Error(`empty key at ${i}`)
    out.push(key)
    i = j
  }
  return out
}

// ── 들여쓰기 폭 감지 ──

function detectIndent(raw: string): number {
  // 첫 들여쓴 라인의 leading space 길이를 반환. 기본 4.
  const m = raw.match(/^\n? *\{[\r\n]+( +)/)
  if (m) return m[1].length
  const lines = raw.split('\n')
  for (const ln of lines) {
    const lead = ln.match(/^( +)\S/)
    if (lead) return lead[1].length
  }
  return 4
}

// ── 깊은 set/unset ──

function setDeep(root: unknown, segs: Segment[], value: unknown): void {
  let cur: unknown = root
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i]
    if (cur === null || typeof cur !== 'object') throw new Error(`path traverses non-object at ${segs.slice(0, i).join('.')}`)
    const c = cur as Record<string | number, unknown>
    if (c[s] === undefined || c[s] === null) {
      // 빈 단계 자동 생성 — 다음 segment가 number면 배열, 그 외엔 객체
      const nextIsNum = typeof segs[i + 1] === 'number'
      c[s] = nextIsNum ? [] : {}
    }
    cur = c[s]
  }
  const last = segs[segs.length - 1]
  if (cur === null || typeof cur !== 'object') throw new Error('cannot set on non-object')
  ;(cur as Record<string | number, unknown>)[last] = value
}

function unsetDeep(root: unknown, segs: Segment[]): void {
  let cur: unknown = root
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i]
    if (cur === null || typeof cur !== 'object') return
    cur = (cur as Record<string | number, unknown>)[s]
    if (cur === undefined) return
  }
  if (cur && typeof cur === 'object') {
    const last = segs[segs.length - 1]
    delete (cur as Record<string | number, unknown>)[last]
  }
}

// ── 파일 위치 결정 ──

async function resolveJsonTarget(
  series: string,
  name: string,
  locale: 'ko' | 'en',
  segs: Segment[],
): Promise<{ filePath: string; innerSegs: Segment[] } | null> {
  const { person } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (!found) return null

  if (!isNewLayout(found.dir)) {
    const isShorts = segs[0] === 'shorts' && typeof segs[1] === 'number'
    return {
      filePath: isShorts
        ? path.join(found.dir, 'shorts', `${locale}-${(segs[1] as number) + 1}.json`)
        : path.join(found.dir, `${locale}.json`),
      innerSegs: isShorts ? segs.slice(2) : segs,
    }
  }

  const folders = await listBookFolders(found.dir)
  if (segs[0] === 'books' && typeof segs[1] === 'number') {
    const folder = folders[segs[1]]
    if (!folder) return null
    return {
      filePath: path.join(found.dir, 'books', folder, `book.${locale}.json`),
      innerSegs: segs.slice(2),
    }
  }

  if (segs[0] === 'shorts' && typeof segs[1] === 'number') {
    const localeEpisode = locale === 'en' ? `${person}-en` : person
    const episode = await loadEpisode(series, localeEpisode).catch(() => null) as {
      shorts?: Array<{ featuredBookIndex?: number }>
    } | null
    const shorts = Array.isArray(episode?.shorts) ? episode.shorts : []
    const bookIndex = shorts[segs[1]]?.featuredBookIndex
    if (typeof bookIndex !== 'number' || !folders[bookIndex]) return null
    return {
      filePath: path.join(found.dir, 'books', folders[bookIndex], `shorts.${locale}.json`),
      innerSegs: segs.slice(2),
    }
  }

  return {
    filePath: path.join(found.dir, `meta.${locale}.json`),
    innerSegs: segs,
  }
}

// ── 메타가 비었는지 ──
type VoiceMeta = {
  tags?: string[]
  trail?: boolean
  emphasis?: Array<{ wordIndex: number[]; type: 'bold' | 'italic' }>
}

function isEmptyMeta(m: VoiceMeta): boolean {
  if (m.tags && m.tags.length > 0) return false
  if (typeof m.trail === 'boolean') return false
  if (m.emphasis && m.emphasis.length > 0) return false
  return true
}

// ── 한 파일 갱신 ──

async function patchFile(
  filePath: string,
  innerSegs: Segment[],
  value: VoiceMeta,
  emphasisOnly: boolean,
): Promise<void> {
  if (!existsSync(filePath)) {
    const err = new Error(`file not found: ${filePath}`) as Error & { status?: number }
    err.status = 404
    throw err
  }
  const raw = await readFile(filePath, 'utf-8')
  const indent = detectIndent(raw)
  const data = JSON.parse(raw)

  if (emphasisOnly) {
    // emphasis만 갱신: 기존 voice 메타 보존 + emphasis 덮어쓰기
    let cur: unknown = data
    for (let i = 0; i < innerSegs.length - 1; i++) {
      const s = innerSegs[i]
      if (cur === null || typeof cur !== 'object') throw new Error('path traverses non-object')
      cur = (cur as Record<string | number, unknown>)[s]
      if (cur === undefined) cur = null
    }
    const parent = cur as Record<string | number, unknown> | null
    if (parent && typeof parent === 'object') {
      const last = innerSegs[innerSegs.length - 1]
      const existing = (parent[last] as VoiceMeta | undefined) ?? {}
      const merged: VoiceMeta = { ...existing }
      if (value.emphasis && value.emphasis.length > 0) merged.emphasis = value.emphasis
      else delete merged.emphasis
      if (isEmptyMeta(merged)) delete parent[last]
      else parent[last] = merged
    }
  } else if (isEmptyMeta(value)) {
    unsetDeep(data, innerSegs)
  } else {
    setDeep(data, innerSegs, value)
  }

  const trailing = raw.endsWith('\n') ? '\n' : ''
  await writeFile(filePath, JSON.stringify(data, null, indent) + trailing, 'utf-8')
}

// ── PATCH ──

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ series: string; name: string }> },
) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  type Body = { path: string; value: VoiceMeta; locale?: 'ko' | 'en' | 'both' }
  const body = (await req.json()) as Body
  if (!body || typeof body.path !== 'string' || typeof body.value !== 'object' || body.value === null) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  let segs: Segment[]
  try {
    segs = parsePath(body.path)
  } catch (e) {
    return NextResponse.json({ error: `path parse failed: ${String(e)}` }, { status: 400 })
  }
  if (segs.length === 0) return NextResponse.json({ error: 'empty path' }, { status: 400 })

  const { person } = parseEpisodeId(name)
  if (!findEpisodeDir(person)) {
    return NextResponse.json({ error: `episode not found: ${person}` }, { status: 404 })
  }
  if (segs[0] === 'shorts' && segs.length <= 2) {
    return NextResponse.json({ error: 'shorts path must include inner key' }, { status: 400 })
  }
  if (segs[0] === 'books' && segs.length <= 2) {
    return NextResponse.json({ error: 'book path must include inner key' }, { status: 400 })
  }

  const emphasisOnly = body.locale === 'ko' || body.locale === 'en'
  const locales: Array<'ko' | 'en'> = emphasisOnly ? [body.locale as 'ko' | 'en'] : ['ko', 'en']

  const written: string[] = []
  try {
    for (const loc of locales) {
      const target = await resolveJsonTarget(series, name, loc, segs)
      if (!target) continue
      // en/ko 한쪽 파일이 없는 경우(예: shorts/ko-3.json만 존재)는 건너뛴다.
      if (!existsSync(target.filePath)) continue
      await patchFile(target.filePath, target.innerSegs, body.value, emphasisOnly)
      written.push(path.basename(target.filePath))
    }
  } catch (e) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: String(err.message ?? err) }, { status: err.status ?? 500 })
  }

  if (written.length === 0) {
    return NextResponse.json({ error: 'no target file existed' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    path: body.path,
    locale: body.locale ?? 'both',
    files: written,
  })
}
