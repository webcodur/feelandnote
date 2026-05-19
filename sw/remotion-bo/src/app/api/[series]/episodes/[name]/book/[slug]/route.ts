import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { findEpisodeDir, isNewLayout, listBookFolders, parseEpisodeId } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

/**
 * 책 단위 부분 저장 — 신구조 전용. 충돌 방지를 위해 한 책 파일만 read-modify-write 한다.
 *
 * 라우트:
 *   PATCH /api/[series]/episodes/[name]/book/[slug]
 *
 * body:
 *   { target: 'book' | 'shorts', path: (string|number)[], value: unknown }
 *
 *   target='book'   → books/{slug}/book.{locale}.json
 *   target='shorts' → books/{slug}/shorts.{locale}.json (없으면 새로 생성)
 *
 * path 는 책/쇼츠 객체 루트 기준 상대 경로다.
 *   예: target='book', path=['summary']                     → book.summary 수정
 *       target='book', path=['quotePairs', 0, 'quote']      → 첫 quote 수정
 *       target='shorts', path=['segments', 2, 'image']      → 3번째 segment image 수정
 *
 * slug 는 폴더 prefix 와 정확히 일치해야 한다 (예: '01-춘추좌씨전').
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ series: string; name: string; slug: string }> },
) {
  const { series, name, slug } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (!found) return NextResponse.json({ error: 'episode not found' }, { status: 404 })
  if (!isNewLayout(found.dir)) {
    return NextResponse.json({ error: '레거시 구조 인물은 책 단위 PATCH 미지원 — 마이그레이션 필요' }, { status: 400 })
  }

  // 슬러그 화이트리스트 검증
  const folders = await listBookFolders(found.dir)
  if (!folders.includes(slug)) {
    return NextResponse.json({ error: `unknown book slug: ${slug}` }, { status: 404 })
  }

  let body: { target?: string; path?: Array<string | number>; value?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { target, path: keyPath, value } = body
  if (target !== 'book' && target !== 'shorts') {
    return NextResponse.json({ error: "target must be 'book' or 'shorts'" }, { status: 400 })
  }
  if (!Array.isArray(keyPath)) {
    return NextResponse.json({ error: 'path must be an array' }, { status: 400 })
  }
  if (!keyPath.every(k => typeof k === 'string' || typeof k === 'number')) {
    return NextResponse.json({ error: 'path entries must be string|number' }, { status: 400 })
  }

  const fileName = target === 'book' ? `book.${locale}.json` : `shorts.${locale}.json`
  const fp = path.join(found.dir, 'books', slug, fileName)

  // shorts 는 없으면 새로 생성 가능, book 은 반드시 존재해야 함
  let current: unknown
  if (existsSync(fp)) {
    try { current = JSON.parse(await readFile(fp, 'utf-8')) }
    catch { return NextResponse.json({ error: `failed to parse ${fileName}` }, { status: 500 }) }
  } else if (target === 'shorts') {
    current = {}
  } else {
    return NextResponse.json({ error: `${fileName} 없음` }, { status: 404 })
  }

  const next = setDeep(current, keyPath, value)
  await writeFile(fp, JSON.stringify(next, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ ok: true })
}

/** 중첩 경로에 값 세팅. 배열/객체 얕은 복사 체인으로 불변 갱신. */
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
