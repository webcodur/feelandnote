import { readFile, readdir, stat, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, execSync } from 'child_process'
import path from 'path'
import { findEpisodeDir } from '@/lib/server-utils'

const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const fileParts = segments.slice(1)

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const imagesDir = path.join(found.dir, 'images')

  // 파일 경로 없음 → 디렉토리 내 이미지 목록 반환
  if (!fileParts.length) {
    if (!existsSync(imagesDir)) return Response.json({ files: [] })
    const entries = await readdir(imagesDir, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile() && IMG_EXTS.has(path.extname(e.name).toLowerCase()))
      .map(e => e.name)
      .sort()
    return Response.json({ files, status: found.status })
  }

  // 파일 서빙
  const abs = path.join(imagesDir, ...fileParts)
  if (!existsSync(abs)) return Response.json({ error: 'not found' }, { status: 404 })

  const ext = path.extname(abs).toLowerCase()
  const mime = MIME[ext] ?? 'application/octet-stream'

  const fileStat = await stat(abs)
  const buf = await readFile(abs)

  return new Response(buf, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

/** DELETE → 이미지 파일을 휴지통으로 이동 (Windows) */
export async function DELETE(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const fileParts = segments.slice(1)
  if (!fileParts.length) return Response.json({ error: 'file path required' }, { status: 400 })

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const abs = path.join(found.dir, 'images', ...fileParts)
  if (!existsSync(abs)) return Response.json({ error: 'not found' }, { status: 404 })

  // PowerShell로 휴지통 이동
  const psCmd = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${abs.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`
  try {
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 5000 })
    return Response.json({ ok: true, file: fileParts.join('/') })
  } catch (e) {
    return Response.json({ error: 'delete failed' }, { status: 500 })
  }
}

/** POST → 탐색기에서 이미지 폴더 열기 */
export async function POST(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const imagesDir = path.join(found.dir, 'images')
  spawn('explorer.exe', [imagesDir], { detached: true, stdio: 'ignore' })
  return Response.json({ ok: true })
}

/** PATCH → 이미지 파일 이름 변경 (prefix 추가/제거) */
export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  if (segments.length !== 2) {
    return Response.json({ error: 'Invalid path' }, { status: 400 })
  }
  const [episodeName, oldName] = segments
  const { newName } = await req.json() as { newName: string }
  if (!newName || /[/\\]/.test(newName)) {
    return Response.json({ error: 'Invalid new name' }, { status: 400 })
  }

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const imagesDir = path.join(found.dir, 'images')
  const oldPath = path.join(imagesDir, oldName)
  const newPath = path.join(imagesDir, newName)

  if (!existsSync(oldPath)) {
    return Response.json({ error: 'File not found' }, { status: 404 })
  }
  if (existsSync(newPath)) {
    return Response.json({ error: 'Target name already exists' }, { status: 409 })
  }

  await rename(oldPath, newPath)
  return Response.json({ ok: true, oldName, newName })
}
