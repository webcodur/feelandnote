import { readFile, stat, rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, execSync } from 'child_process'
import path from 'path'
import { findEpisodeDir, isNewLayout, listBookFolders } from '@/lib/server-utils'
import { scanMediaRecursive, IMG_EXTS, IMG_MIME, type MediaScanResult } from '@/lib/media-scan'

const MIME = IMG_MIME

/** 신구조면 books/<책>/images 를 한 번에 합쳐서 평면 결과로 돌려준다. 옛 구조면 personDir/images 단순 스캔.
 *  같은 basename 이 여러 책에 있어도 모두 노출되도록 두 번째 이후는 키를 「<책>/basename」 형태로 평탄화한다. */
async function scanEpisodeImages(personDir: string): Promise<MediaScanResult> {
  if (!isNewLayout(personDir)) {
    return scanMediaRecursive(path.join(personDir, 'images'), IMG_EXTS)
  }
  const booksDir = path.join(personDir, 'books')
  const bookFolders = await listBookFolders(personDir)
  const merged: MediaScanResult = { files: [], folders: [], fileFolders: {}, fileAbsPaths: {}, duplicates: [] }
  for (const bf of bookFolders) {
    const imgDir = path.join(booksDir, bf, 'images')
    if (!existsSync(imgDir)) continue
    const scan = await scanMediaRecursive(imgDir, IMG_EXTS)
    if (!merged.folders.includes(bf)) merged.folders.push(bf)
    for (const sub of scan.folders) merged.folders.push(`${bf}/${sub}`)
    for (const f of scan.files) {
      const subFolder = scan.fileFolders[f] ? `${bf}/${scan.fileFolders[f]}` : bf
      // 첫 등장은 basename 그대로(기존 매칭 호환), 충돌 시 두 번째 이후는 「<책>/basename」 평탄 키로
      const key = merged.fileFolders[f] === undefined ? f : `${bf}/${f}`
      merged.files.push(key)
      merged.fileFolders[key] = subFolder
      merged.fileAbsPaths[key] = scan.fileAbsPaths[f]
    }
  }
  merged.files.sort()
  merged.folders.sort()
  return merged
}

/** 책 폴더 접두를 떼낸 "images 루트 기준" 상대경로를 실제 디스크 절대 경로로 변환.
 *  신구조: '01-foo/sub/bar.png' → episodes/{person}/books/01-foo/images/sub/bar.png
 *  옛 구조: 'sub/bar.png' → episodes/{person}/images/sub/bar.png */
function resolveImageAbs(personDir: string, relParts: string[]): string {
  if (!isNewLayout(personDir)) return path.join(personDir, 'images', ...relParts)
  // 첫 세그먼트가 책 폴더 이름이면 books/<bf>/images/ 매핑
  const [first, ...rest] = relParts
  if (first) {
    const candidate = path.join(personDir, 'books', first, 'images', ...rest)
    return candidate
  }
  return path.join(personDir, 'books')
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const fileParts = segments.slice(1)

  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  // 파일 경로 없음 → 디렉토리 내 이미지 목록 반환 (재귀 스캔)
  if (!fileParts.length) {
    const scan = await scanEpisodeImages(found.dir)
    return Response.json({
      files: scan.files,
      folders: scan.folders,
      fileFolders: scan.fileFolders,
      duplicates: scan.duplicates,
      status: found.status,
      newLayout: isNewLayout(found.dir),
    })
  }

  // 파일 서빙 — 신구조/옛 구조 분기 정확 경로 → 없으면 basename 으로 재귀 탐색
  let abs = resolveImageAbs(found.dir, fileParts)
  if (!existsSync(abs)) {
    // 마지막 한 토막(basename)으로 재귀 탐색 — 옛 코드 호환 + prefix 키 fallback
    const scan = await scanEpisodeImages(found.dir)
    const key = fileParts.join('/')
    const hit = scan.fileAbsPaths[key] ?? scan.fileAbsPaths[fileParts[fileParts.length - 1]]
    if (hit) abs = hit
    else return Response.json({ error: 'not found' }, { status: 404 })
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

  let abs = resolveImageAbs(found.dir, fileParts)
  if (!existsSync(abs)) {
    const scan = await scanEpisodeImages(found.dir)
    const key = fileParts.join('/')
    const hit = scan.fileAbsPaths[key] ?? scan.fileAbsPaths[fileParts[fileParts.length - 1]]
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

/** POST → 탐색기에서 이미지 폴더 열기.
 *
 * 경로:
 *   /[name]                           → 루트 (옛: <person>/images, 신: <person>/books)
 *   /[name]/[bookFolder]              → 책의 이미지 루트 (신: books/<책>/images, 옛: images/<sub>)
 *   /[name]/[bookFolder]/[sub...]     → 그 하위 sub 폴더
 */
export async function POST(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path
  const episodeName = segments[0]
  const fileParts = segments.slice(1)
  const found = findEpisodeDir(episodeName)
  if (!found) return Response.json({ error: 'episode not found' }, { status: 404 })

  let target: string
  if (fileParts.length > 0) {
    target = resolveImageAbs(found.dir, fileParts)
  } else if (isNewLayout(found.dir)) {
    target = path.join(found.dir, 'books')
  } else {
    target = path.join(found.dir, 'images')
  }
  if (!existsSync(target)) {
    return Response.json({ error: 'folder not found', target }, { status: 404 })
  }
  spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' })
  return Response.json({ ok: true, opened: target })
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
    const scan = await scanEpisodeImages(found.dir)
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
  const scan = await scanEpisodeImages(found.dir)
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
  const scan = await scanEpisodeImages(found.dir)
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
