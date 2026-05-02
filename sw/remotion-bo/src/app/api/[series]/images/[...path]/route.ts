import { readFile, stat, rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, execSync } from 'child_process'
import path from 'path'
import { findEpisodeDir } from '@/lib/server-utils'
import { scanMediaRecursive, IMG_EXTS, IMG_MIME } from '@/lib/media-scan'

const scanImagesRecursive = (dir: string) => scanMediaRecursive(dir, IMG_EXTS)
const MIME = IMG_MIME

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const fileParts = segments.slice(1)

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const imagesDir = path.join(found.dir, 'images')

  // 파일 경로 없음 → 디렉토리 내 이미지 목록 반환 (재귀 스캔)
  if (!fileParts.length) {
    const scan = await scanImagesRecursive(imagesDir)
    return Response.json({
      files: scan.files,
      folders: scan.folders,
      fileFolders: scan.fileFolders,
      duplicates: scan.duplicates,
      status: found.status,
    })
  }

  // 파일 서빙 — 정확 경로 우선, 없으면 basename으로 재귀 탐색
  let abs = path.join(imagesDir, ...fileParts)
  if (!existsSync(abs)) {
    if (fileParts.length === 1) {
      const scan = await scanImagesRecursive(imagesDir)
      const hit = scan.fileAbsPaths[fileParts[0]]
      if (hit) abs = hit
      else return Response.json({ error: 'not found' }, { status: 404 })
    } else {
      return Response.json({ error: 'not found' }, { status: 404 })
    }
  }

  const ext = path.extname(abs).toLowerCase()
  const mime = MIME[ext] ?? 'application/octet-stream'

  const fileStat = await stat(abs)
  const etag = `"${fileStat.mtime.getTime().toString(16)}"`
  const lastModified = fileStat.mtime.toUTCString()

  if (_req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, 'Last-Modified': lastModified } })
  }

  const buf = await readFile(abs)
  return new Response(buf, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'no-cache',
      ETag: etag,
      'Last-Modified': lastModified,
    },
  })
}

/** DELETE → 이미지 파일을 휴지통으로 이동 (Windows). basename 또는 상대경로 모두 허용 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const fileParts = segments.slice(1)
  if (!fileParts.length) return Response.json({ error: 'file path required' }, { status: 400 })

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const imagesDir = path.join(found.dir, 'images')
  let abs = path.join(imagesDir, ...fileParts)
  if (!existsSync(abs) && fileParts.length === 1) {
    const scan = await scanImagesRecursive(imagesDir)
    const hit = scan.fileAbsPaths[fileParts[0]]
    if (hit) abs = hit
  }
  if (!existsSync(abs)) return Response.json({ error: 'not found' }, { status: 404 })

  // PowerShell로 휴지통 이동
  const psCmd = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${abs.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`
  try {
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 5000 })
    return Response.json({ ok: true, file: fileParts.join('/') })
  } catch {
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

/** PATCH → 이미지 파일 이름 변경 (prefix 추가/제거). 폴더는 유지. */
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
  // 서브폴더 내 파일도 대응 — basename으로 실제 경로 찾기
  let oldPath = path.join(imagesDir, oldName)
  let containerDir = imagesDir
  if (!existsSync(oldPath)) {
    const scan = await scanImagesRecursive(imagesDir)
    const hit = scan.fileAbsPaths[oldName]
    if (!hit) return Response.json({ error: 'File not found' }, { status: 404 })
    oldPath = hit
    containerDir = path.dirname(hit)
  }

  const newPath = path.join(containerDir, newName)
  if (existsSync(newPath)) {
    return Response.json({ error: 'Target name already exists' }, { status: 409 })
  }

  // 에피소드 전역 유일 — 다른 폴더에 이미 같은 이름 있으면 차단
  const scan = await scanImagesRecursive(imagesDir)
  if (scan.fileFolders[newName] !== undefined && scan.fileFolders[newName] !== path.relative(imagesDir, containerDir).replace(/\\/g, '/')) {
    return Response.json({ error: 'Name collision in another folder' }, { status: 409 })
  }

  await rename(oldPath, newPath)
  return Response.json({ ok: true, oldName, newName })
}

/** PUT → 이미지 파일 폴더 이동. body: { targetFolder: string } — 빈 문자열이면 루트 */
export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  if (segments.length !== 2) {
    return Response.json({ error: 'Invalid path (expected /{ep}/{filename})' }, { status: 400 })
  }
  const [episodeName, fileName] = segments
  const body = await req.json() as { targetFolder?: string }
  const targetFolder = (body.targetFolder ?? '').replace(/^\/+|\/+$/g, '').replace(/\\/g, '/')

  if (fileName.includes('/') || fileName.includes('\\')) {
    return Response.json({ error: 'fileName must be basename' }, { status: 400 })
  }
  if (targetFolder && /(^|\/)\.\.($|\/)/.test(targetFolder)) {
    return Response.json({ error: 'Invalid folder path' }, { status: 400 })
  }

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const imagesDir = path.join(found.dir, 'images')
  const scan = await scanImagesRecursive(imagesDir)
  const srcAbs = scan.fileAbsPaths[fileName]
  if (!srcAbs) return Response.json({ error: 'File not found' }, { status: 404 })

  const dstDir = targetFolder ? path.join(imagesDir, ...targetFolder.split('/')) : imagesDir
  const dstAbs = path.join(dstDir, fileName)

  if (path.normalize(srcAbs) === path.normalize(dstAbs)) {
    return Response.json({ ok: true, moved: false })
  }

  if (!existsSync(dstDir)) await mkdir(dstDir, { recursive: true })
  if (existsSync(dstAbs)) {
    return Response.json({ error: 'Target name already exists in target folder' }, { status: 409 })
  }

  await rename(srcAbs, dstAbs)
  return Response.json({ ok: true, moved: true, fileName, targetFolder })
}
