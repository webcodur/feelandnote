import { mkdir, rename, rmdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { findEpisodeDir } from '@/lib/server-utils'

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
  return { ...found, rootDir: path.join(found.dir, root) }
}

function resolveFolderAbs(rootDir: string, parts: string[]): string | null {
  for (const p of parts) {
    if (!sanitizeName(p)) return null
  }
  return path.join(rootDir, ...parts)
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  if (segments.length < 2) return Response.json({ error: 'folder path required' }, { status: 400 })
  const [episodeName, ...folderParts] = segments
  const root = parseRoot(req)

  const ep = await resolveEpisode(episodeName, root)
  if (!ep) return Response.json({ error: 'episode not found' }, { status: 404 })

  const abs = resolveFolderAbs(ep.rootDir, folderParts)
  if (!abs) return Response.json({ error: 'invalid folder name' }, { status: 400 })

  if (existsSync(abs)) return Response.json({ error: 'folder already exists' }, { status: 409 })

  await mkdir(abs, { recursive: true })
  return Response.json({ ok: true, folder: folderParts.join('/') })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  if (segments.length < 2) return Response.json({ error: 'folder path required' }, { status: 400 })
  const [episodeName, ...folderParts] = segments
  const root = parseRoot(req)
  const body = await req.json() as { newName?: string }
  const newName = sanitizeName((body.newName ?? '').trim())
  if (!newName) return Response.json({ error: 'invalid new name' }, { status: 400 })

  const ep = await resolveEpisode(episodeName, root)
  if (!ep) return Response.json({ error: 'episode not found' }, { status: 404 })

  const oldAbs = resolveFolderAbs(ep.rootDir, folderParts)
  if (!oldAbs) return Response.json({ error: 'invalid folder path' }, { status: 400 })
  if (!existsSync(oldAbs)) return Response.json({ error: 'folder not found' }, { status: 404 })

  const newParts = [...folderParts.slice(0, -1), newName]
  const newAbs = resolveFolderAbs(ep.rootDir, newParts)!
  if (existsSync(newAbs)) return Response.json({ error: 'target folder already exists' }, { status: 409 })

  await rename(oldAbs, newAbs)
  return Response.json({ ok: true, from: folderParts.join('/'), to: newParts.join('/') })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  if (segments.length < 2) return Response.json({ error: 'folder path required' }, { status: 400 })
  const [episodeName, ...folderParts] = segments
  const root = parseRoot(req)

  const ep = await resolveEpisode(episodeName, root)
  if (!ep) return Response.json({ error: 'episode not found' }, { status: 404 })

  const abs = resolveFolderAbs(ep.rootDir, folderParts)
  if (!abs) return Response.json({ error: 'invalid folder path' }, { status: 400 })
  if (!existsSync(abs)) return Response.json({ error: 'folder not found' }, { status: 404 })

  // 비어있는지 확인 (파일 또는 하위 폴더 전혀 없어야 함)
  const entries = await readdir(abs)
  if (entries.length > 0) {
    return Response.json({ error: 'folder not empty — 먼저 내부 파일을 옮겨주세요' }, { status: 409 })
  }

  await rmdir(abs)
  return Response.json({ ok: true, folder: folderParts.join('/') })
}
