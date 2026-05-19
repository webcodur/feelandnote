import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { findEpisodeDir, isNewLayout, parseEpisodeId } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

/**
 * 메타(narrator + host + 에피소드 메타) 부분 저장 — 신구조 전용.
 *
 * 라우트:  PATCH /api/[series]/episodes/[name]/meta
 * body:    { path: (string|number)[], value: unknown }
 *
 *   path 는 meta.{locale}.json 의 루트 기준 상대 경로다.
 *   예: ['narrator', 'serviceGreeting']
 *       ['host', 'philosophy']
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ series: string; name: string }> },
) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (!found) return NextResponse.json({ error: 'episode not found' }, { status: 404 })
  if (!isNewLayout(found.dir)) {
    return NextResponse.json({ error: '레거시 구조 — 메타 PATCH 미지원' }, { status: 400 })
  }

  let body: { path?: Array<string | number>; value?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const { path: keyPath, value } = body
  if (!Array.isArray(keyPath) || keyPath.length === 0) {
    return NextResponse.json({ error: 'path(non-empty array) required' }, { status: 400 })
  }
  if (!keyPath.every(k => typeof k === 'string' || typeof k === 'number')) {
    return NextResponse.json({ error: 'path entries must be string|number' }, { status: 400 })
  }

  const fp = path.join(found.dir, `meta.${locale}.json`)
  if (!existsSync(fp)) return NextResponse.json({ error: `meta.${locale}.json 없음` }, { status: 404 })

  let current: unknown
  try { current = JSON.parse(await readFile(fp, 'utf-8')) }
  catch { return NextResponse.json({ error: 'failed to parse meta' }, { status: 500 }) }

  const next = setDeep(current, keyPath, value)
  await writeFile(fp, JSON.stringify(next, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ ok: true })
}

function setDeep(obj: unknown, keyPath: Array<string | number>, value: unknown): unknown {
  if (keyPath.length === 0) return value
  const [head, ...rest] = keyPath
  const isIdx = typeof head === 'number'
  if (isIdx) {
    const arr = Array.isArray(obj) ? [...obj] : []
    arr[head as number] = setDeep(arr[head as number], rest, value)
    return arr
  }
  const base = (obj && typeof obj === 'object' && !Array.isArray(obj))
    ? { ...(obj as Record<string, unknown>) } : {}
  base[head as string] = setDeep((base as Record<string, unknown>)[head as string], rest, value)
  return base
}
