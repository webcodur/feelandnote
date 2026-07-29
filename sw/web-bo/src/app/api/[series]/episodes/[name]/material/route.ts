import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { findEpisodeDir, isNewLayout, listBookFolders, parseEpisodeId } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

/**
 * 책 폴더의 「재료.txt」 읽기 — 작가가 책별로 정리해 둔 원자료 메모.
 *
 *   GET /api/[series]/episodes/[name]/material            → 전체 책의 재료 목록
 *   GET /api/[series]/episodes/[name]/material?slug=<slug>→ 한 책의 재료 본문
 *
 * 응답:
 *   - 목록: { ok, books: [{ slug, hasMaterial }] }
 *   - 단건: { ok, slug, content }   (없으면 content='')
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ series: string; name: string }> },
) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { person } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (!found) return NextResponse.json({ error: 'episode not found' }, { status: 404 })
  if (!isNewLayout(found.dir)) {
    return NextResponse.json({ ok: true, books: [], legacy: true })
  }

  const folders = await listBookFolders(found.dir)
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')

  if (slug) {
    if (!folders.includes(slug)) {
      return NextResponse.json({ error: `unknown book slug: ${slug}` }, { status: 404 })
    }
    const fp = path.join(found.dir, 'books', slug, '재료.txt')
    if (!existsSync(fp)) return NextResponse.json({ ok: true, slug, content: '' })
    try {
      const content = await readFile(fp, 'utf-8')
      return NextResponse.json({ ok: true, slug, content })
    } catch (e) {
      return NextResponse.json({ error: `failed to read 재료.txt: ${String(e)}` }, { status: 500 })
    }
  }

  // 목록 — 각 책의 재료.txt 존재 여부
  const books = folders.map(s => ({
    slug: s,
    hasMaterial: existsSync(path.join(found.dir, 'books', s, '재료.txt')),
  }))
  return NextResponse.json({ ok: true, books })
}
