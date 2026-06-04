import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { findEpisodeDir, isNewLayout, listBookFolders, parseEpisodeId } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

/**
 * 1권 모드(SOLO) 자유섹션 입출력 — 신구조 전용.
 *
 * 라우트:
 *   GET  /api/[series]/episodes/[name]/solo/[index]  → { sections: SoloFreeSection[] }
 *   PUT  /api/[series]/episodes/[name]/solo/[index]    body: { sections: SoloFreeSection[] }
 *
 * index = 책 폴더 순서(0-based). 서버가 listBookFolders 정렬 순서로 폴더를 매칭한다.
 * 책 reorder 시 폴더가 통째 rename 되고 solo.{locale}.json 도 함께 이동하므로 인덱스 기준이 안전하다.
 *
 * 저장 위치: books/{NN-제목}/solo.{locale}.json  (책 본문과 독립된 솔로 전용 데이터)
 * 자유섹션은 추가·삭제·순서변경이 잦아 배열을 통째로 read-replace-write 한다.
 *
 * SoloFreeSection = { id: string; text: string; image?; imageChangeAt?: SoloImageChange[];
 *                     voice?: 'tts'|'actor'; kind?: 'narration'|'quote'; quoteSource? }
 * 검증은 id·text(필수)만 확인하고 나머지 필드(imageChangeAt 등)는 통째로 보존 기록한다.
 */

type Ctx = { params: Promise<{ series: string; name: string; index: string }> }

/** 공통 검증 — series·인물·신구조·책 인덱스. 통과 시 solo 파일 경로 반환. */
async function resolve(series: string, name: string, index: string):
  Promise<{ fp: string } | { error: string; status: number }> {
  if (!isValidSeries(series)) return { error: 'invalid series', status: 404 }
  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (!found) return { error: 'episode not found', status: 404 }
  if (!isNewLayout(found.dir)) return { error: '레거시 구조 인물은 솔로 미지원', status: 400 }
  const folders = await listBookFolders(found.dir)
  const idx = parseInt(index, 10)
  if (!Number.isInteger(idx) || idx < 0 || idx >= folders.length) {
    return { error: `book index out of range: ${index}`, status: 404 }
  }
  return { fp: path.join(found.dir, 'books', folders[idx], `solo.${locale}.json`) }
}

export async function GET(_req: Request, { params }: Ctx) {
  const { series, name, index } = await params
  const r = await resolve(series, name, index)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  if (!existsSync(r.fp)) return NextResponse.json({ sections: [] })
  try {
    const doc = JSON.parse(await readFile(r.fp, 'utf-8'))
    return NextResponse.json({ sections: Array.isArray(doc?.sections) ? doc.sections : [] })
  } catch {
    return NextResponse.json({ error: 'failed to parse solo json' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { series, name, index } = await params
  const r = await resolve(series, name, index)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })

  let body: { sections?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const sections = body?.sections
  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: 'sections must be an array' }, { status: 400 })
  }
  for (const s of sections as Array<Record<string, unknown>>) {
    if (!s || typeof s.id !== 'string' || typeof s.text !== 'string') {
      return NextResponse.json({ error: 'each section needs string id and text' }, { status: 400 })
    }
  }

  await writeFile(r.fp, JSON.stringify({ sections }, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ ok: true })
}
