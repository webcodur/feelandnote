import { readFile, stat, rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, execSync } from 'child_process'
import path from 'path'
import { findEpisodeDir } from '@/features/book-recommend/lib/server-utils'
import { scanMediaRecursive, VID_EXTS, VID_MIME } from '@/features/book-recommend/lib/media-scan'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

/**
 * videos/ 라우트 — images 라우트와 동일한 시그니처로 에피소드별 videos/ 폴더 관리.
 *   GET    목록 / 파일 서빙
 *   DELETE 휴지통 이동
 *   POST   탐색기 열기
 *   PATCH  파일명 변경
 *   PUT    폴더 이동 (targetFolder)
 */

const scanVideosRecursive = (dir: string) => scanMediaRecursive(dir, VID_EXTS)

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  const episodeName = segments[0]
  const fileParts = segments.slice(1)

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const videosDir = path.join(found.dir, 'videos')

  if (!fileParts.length) {
    const scan = await scanVideosRecursive(videosDir)
    return Response.json({
      files: scan.files,
      folders: scan.folders,
      fileFolders: scan.fileFolders,
      duplicates: scan.duplicates,
      status: found.status,
    })
  }

  // 파일 서빙 — 정확 경로 우선, 없으면 basename으로 재귀 탐색
  let abs = path.join(videosDir, ...fileParts)
  if (!existsSync(abs)) {
    if (fileParts.length === 1) {
      const scan = await scanVideosRecursive(videosDir)
      const hit = scan.fileAbsPaths[fileParts[0]]
      if (hit) abs = hit
      else return Response.json({ error: 'not found' }, { status: 404 })
    } else {
      return Response.json({ error: 'not found' }, { status: 404 })
    }
  }

  const ext = path.extname(abs).toLowerCase()
  const mime = VID_MIME[ext] ?? 'application/octet-stream'

  // Range 요청 지원 — 영상 스트리밍은 <video> 태그가 Range 요청을 보내므로 필수
  const fileStat = await stat(abs)
  const rangeHeader = _req.headers.get('range')
  if (rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : fileStat.size - 1
      if (start < fileStat.size && end < fileStat.size && start <= end) {
        const { createReadStream } = await import('fs')
        const stream = createReadStream(abs, { start, end })
        // Node.js Readable → Web ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            stream.on('data', (chunk) => controller.enqueue(chunk))
            stream.on('end', () => controller.close())
            stream.on('error', (e) => controller.error(e))
          },
          cancel() { stream.destroy() },
        })
        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
  }

  const buf = await readFile(abs)
  return new Response(buf, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(fileStat.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  const episodeName = segments[0]
  const fileParts = segments.slice(1)
  if (!fileParts.length) return Response.json({ error: 'file path required' }, { status: 400 })

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const videosDir = path.join(found.dir, 'videos')
  let abs = path.join(videosDir, ...fileParts)
  if (!existsSync(abs) && fileParts.length === 1) {
    const scan = await scanVideosRecursive(videosDir)
    const hit = scan.fileAbsPaths[fileParts[0]]
    if (hit) abs = hit
  }
  if (!existsSync(abs)) return Response.json({ error: 'not found' }, { status: 404 })

  const psCmd = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${abs.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`
  try {
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 5000 })
    return Response.json({ ok: true, file: fileParts.join('/') })
  } catch {
    return Response.json({ error: 'delete failed' }, { status: 500 })
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  const episodeName = segments[0]
  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  const videosDir = path.join(found.dir, 'videos')
  // 폴더가 없으면 생성 — 처음 탐색기 열 때 UX
  if (!existsSync(videosDir)) await mkdir(videosDir, { recursive: true })
  spawn('explorer.exe', [videosDir], { detached: true, stdio: 'ignore' })
  return Response.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
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

  const videosDir = path.join(found.dir, 'videos')
  let oldPath = path.join(videosDir, oldName)
  let containerDir = videosDir
  if (!existsSync(oldPath)) {
    const scan = await scanVideosRecursive(videosDir)
    const hit = scan.fileAbsPaths[oldName]
    if (!hit) return Response.json({ error: 'File not found' }, { status: 404 })
    oldPath = hit
    containerDir = path.dirname(hit)
  }

  const newPath = path.join(containerDir, newName)
  if (existsSync(newPath)) {
    return Response.json({ error: 'Target name already exists' }, { status: 409 })
  }

  const scan = await scanVideosRecursive(videosDir)
  if (scan.fileFolders[newName] !== undefined && scan.fileFolders[newName] !== path.relative(videosDir, containerDir).replace(/\\/g, '/')) {
    return Response.json({ error: 'Name collision in another folder' }, { status: 409 })
  }

  await rename(oldPath, newPath)
  return Response.json({ ok: true, oldName, newName })
}

export async function PUT(req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: segments } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
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

  const videosDir = path.join(found.dir, 'videos')
  const scan = await scanVideosRecursive(videosDir)
  const srcAbs = scan.fileAbsPaths[fileName]
  if (!srcAbs) return Response.json({ error: 'File not found' }, { status: 404 })

  const dstDir = targetFolder ? path.join(videosDir, ...targetFolder.split('/')) : videosDir
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
