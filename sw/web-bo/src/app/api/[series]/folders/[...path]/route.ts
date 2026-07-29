import { mkdir, rename, rmdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { findEpisodeDir, isNewLayout } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

/**
 * 이미지/영상 서브폴더 CRUD.
 * 경로: /api/{series}/folders/{episode}/{...folderPath}
 *   - 세그먼트[0] = episode
 *   - 세그먼트[1:] = 대상 폴더 상대경로
 *   - ?root=images (기본) | videos — 루트 선택
 *
 *   POST   폴더 생성
 *   PATCH  폴더 이름 변경 (body: { newName } — 마지막 세그먼트만 교체)
 *   DELETE 폴더 삭제 (비어있을 때만)
 */

function sanitizeName(name: string): string | null {
  if (!name || /[\\/:*?"<>|]/.test(name)) return null
  if (name === '.' || name === '..') return null
  return name
}

function parseRoot(req: Request): 'images' | 'videos' {
  const u = new URL(req.url)
  const r = u.searchParams.get('root')
  return r === 'videos' ? 'videos' : 'images'
}

async function resolveEpisode(episodeName: string, root: 'images' | 'videos') {
  const found = findEpisodeDir(episodeName)
  if (!found) return null
  return { ...found, rootDir: path.join(found.dir, root), newLayout: isNewLayout(found.dir) && root === 'images' }
}

type FolderResolve =
  | { ok: true; abs: string; isBookRoot: boolean }
  | { ok: false; error: string }

/** 입력 폴더 경로를 디스크 절대 경로로 변환.
 *  신구조 + images 루트인 경우: 첫 세그먼트 = 책 폴더명. 두 번째부터가 책 폴더 안 images/ 의 하위 경로.
 *    parts=['01-foo'] → books/01-foo/images (책 자체 images 루트 — isBookRoot)
 *    parts=['01-foo', 'sub'] → books/01-foo/images/sub
 *  옛 구조 / videos 루트: rootDir 직속.
 */
function resolveFolderAbs(rootDir: string, parts: string[], newLayout: boolean, baseDir?: string): FolderResolve {
  for (const p of parts) {
    if (!sanitizeName(p)) return { ok: false, error: 'invalid folder name' }
  }
  if (!newLayout || !baseDir) {
    return { ok: true, abs: path.join(rootDir, ...parts), isBookRoot: false }
  }
  const [book, ...rest] = parts
  if (!book) return { ok: false, error: 'invalid folder path' }
  const bookImagesDir = path.join(baseDir, 'books', book, 'images')
  return { ok: true, abs: path.join(bookImagesDir, ...rest), isBookRoot: rest.length === 0 }
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  if (segments.length < 2) return Response.json({ error: 'folder path required' }, { status: 400 })
  const [episodeName, ...folderParts] = segments
  const root = parseRoot(req)

  const ep = await resolveEpisode(episodeName, root)
  if (!ep) return Response.json({ error: 'episode not found' }, { status: 404 })

  const res = resolveFolderAbs(ep.rootDir, folderParts, ep.newLayout, ep.dir)
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 })
  if (res.isBookRoot) return Response.json({ error: '책 폴더 자체는 별도 API 로 생성' }, { status: 400 })
  if (existsSync(res.abs)) return Response.json({ error: 'folder already exists' }, { status: 409 })

  await mkdir(res.abs, { recursive: true })
  return Response.json({ ok: true, folder: folderParts.join('/') })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  if (segments.length < 2) return Response.json({ error: 'folder path required' }, { status: 400 })
  const [episodeName, ...folderParts] = segments
  const root = parseRoot(req)
  const body = await req.json() as { newName?: string }
  const newName = sanitizeName((body.newName ?? '').trim())
  if (!newName) return Response.json({ error: 'invalid new name' }, { status: 400 })

  const ep = await resolveEpisode(episodeName, root)
  if (!ep) return Response.json({ error: 'episode not found' }, { status: 404 })

  const oldRes = resolveFolderAbs(ep.rootDir, folderParts, ep.newLayout, ep.dir)
  if (!oldRes.ok) return Response.json({ error: oldRes.error }, { status: 400 })
  if (oldRes.isBookRoot) return Response.json({ error: '책 폴더 자체는 이름 변경 불가' }, { status: 400 })
  if (!existsSync(oldRes.abs)) return Response.json({ error: 'folder not found' }, { status: 404 })

  const newParts = [...folderParts.slice(0, -1), newName]
  const newRes = resolveFolderAbs(ep.rootDir, newParts, ep.newLayout, ep.dir)
  if (!newRes.ok) return Response.json({ error: newRes.error }, { status: 400 })
  if (existsSync(newRes.abs)) return Response.json({ error: 'target folder already exists' }, { status: 409 })

  await rename(oldRes.abs, newRes.abs)
  return Response.json({ ok: true, from: folderParts.join('/'), to: newParts.join('/') })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  if (segments.length < 2) return Response.json({ error: 'folder path required' }, { status: 400 })
  const [episodeName, ...folderParts] = segments
  const root = parseRoot(req)

  const ep = await resolveEpisode(episodeName, root)
  if (!ep) return Response.json({ error: 'episode not found' }, { status: 404 })

  const res = resolveFolderAbs(ep.rootDir, folderParts, ep.newLayout, ep.dir)
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 })
  if (res.isBookRoot) return Response.json({ error: '책 폴더 자체는 삭제 불가 — 책 단위 API 로 처리' }, { status: 400 })
  if (!existsSync(res.abs)) return Response.json({ error: 'folder not found' }, { status: 404 })

  // 비어있는지 확인 (파일 또는 하위 폴더 전혀 없어야 함)
  const entries = await readdir(res.abs)
  if (entries.length > 0) {
    return Response.json({ error: 'folder not empty — 먼저 내부 파일을 옮겨주세요' }, { status: 409 })
  }

  await rmdir(res.abs)
  return Response.json({ ok: true, folder: folderParts.join('/') })
}
