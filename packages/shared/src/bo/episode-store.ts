/**
 * 폴더형 에피소드 시리즈의 서버 공용 IO — 서버 전용.
 *
 * 세력도(factions/)와 가상 담화(discourses/)는 저장 구조가 같다:
 *   <뿌리>/<에피소드>/faction-data.json | discourse-data.json
 *   <뿌리>/<에피소드>/images/…  <뿌리>/<에피소드>/<임의 폴더>/…
 *   <뿌리>/<에피소드>/voice/*.wav      <뿌리>/<에피소드>/_status.json
 *   <뿌리>/_episodes.json (노출 목록)
 * 그래서 폴더 스캔·사진 정리·음원 목록·진행 상태·노출 목록 규칙이 모두 같다.
 * **시리즈마다 복제하지 않고 뿌리 디렉토리만 인자로 받는다** — `series === 'faction'` 류 분기를 두지 않는다.
 *
 * 시리즈별 껍데기(faction-utils / discourse-utils)와 「시리즈 이름 → 뿌리 폴더」 대응표는 앱 쪽에 얇게 남고,
 * 실제 동작은 이 파일 한 곳에만 있다. 이 파일은 시리즈 이름을 모른다 — 뿌리 폴더만 인자로 받는다.
 * 파일명 규칙(imageSrc)만 클라이언트도 쓰므로 media-src.ts 에 따로 둔다(이 파일은 fs 를 쓰므로 클라이언트에서 못 읽는다).
 */

import { readFile, readdir, writeFile, mkdir, rm, rename, stat, open } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { REMOTION_ROOT } from './remotion-root'

/* ── 시리즈 뿌리 ── */

/** 세력도 뿌리 — public/factions/ */
export const FACTIONS_DIR = path.join(REMOTION_ROOT, 'public', 'factions')
/** 가상 담화 뿌리 — public/discourses/ */
export const DISCOURSES_DIR = path.join(REMOTION_ROOT, 'public', 'discourses')

/* ── 이름·경로 안전화 ── */

/** 이미지·영상 확장자 — 이 목록에 없는 파일은 목록에 잡히지 않는다 */
export const MEDIA_RE = /\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v)$/i

/** 파일명 안전화 — 경로 이탈·특수문자 차단 (업로드 파일명용) */
export function safeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
}

/** 파일·폴더 한 토막 안전화 — 한글 허용, 경로 이탈만 차단 */
export function safeDirName(name: string): string {
  return path.basename(name).replace(/[/\\]/g, '')
}

/**
 * 에피소드 키를 폴더 토막들로 쪼갠다.
 *
 * 아이디어 뱅크는 `not-using/<분류>/<이름>` 처럼 두 단 아래에 있어서 키에 슬래시가 들어간다.
 * 한 토막만 남기면(예전 `safeDirName`) 뿌리 바로 아래를 가리켜 엉뚱한 폴더를 만들거나 읽는다.
 * 위로 올라가는 토막(`..`)과 빈 토막은 버려 뿌리 밖으로 못 나가게 한다.
 */
export function safeDirSegs(name: string): string[] {
  return (name ?? '').split(/[/\\]/).map(s => s.trim()).filter(s => s && s !== '.' && s !== '..')
}

/** 상대 경로 세그먼트 안전화 — 한글·공백 유지, 경로 이탈(.. .)·빈 세그먼트 제거 */
export function safeRelSegs(p: string): string[] {
  return (p ?? '').split('/').map(s => s.trim()).filter(s => s && s !== '.' && s !== '..')
}

/** 에피소드 폴더 절대경로 */
export function episodeDirOf(root: string, name: string): string {
  return path.join(root, ...safeDirSegs(name))
}

/** 기본 이미지 폴더 — 업로드는 항상 여기로 떨어진다 */
export function imagesDirOf(root: string, name: string): string {
  return path.join(episodeDirOf(root, name), 'images')
}

/* ── 목록 ── */

export interface MediaTreeFile {
  /** 에피소드 폴더 기준 상대경로 (예 'cast/peter-thiel/01.png') */
  path: string
  /** 상위 폴더 상대경로 ('' = 루트) */
  folder: string
  /** 파일명 (예 '01.png') */
  name: string
}

export interface MediaTree {
  files: MediaTreeFile[]
  /** 폴더 상대경로 목록 — 빈 폴더 포함, 'voice' 제외, '' 제외, 정렬됨 */
  folders: string[]
}

/** images/ 직속 파일명 목록 — 이미지 선택 모달의 기본 목록 */
export async function listImages(root: string, name: string): Promise<string[]> {
  try { return (await readdir(imagesDirOf(root, name))).filter(f => MEDIA_RE.test(f)).sort() }
  catch { return [] }
}

/**
 * 에피소드 폴더 하위를 재귀 스캔해 이미지·영상만 모은다.
 * 데이터 파일(json·md 등)은 제외하고, 음성 폴더(voice/)는 이미지 풀과 무관하므로 건너뛴다.
 */
export async function listImageTree(root: string, name: string): Promise<MediaTree> {
  const base = episodeDirOf(root, name)
  const files: MediaTreeFile[] = []
  const folderSet = new Set<string>()

  async function walk(absDir: string, rel: string): Promise<void> {
    let entries
    try { entries = await readdir(absDir, { withFileTypes: true }) }
    catch { return }
    for (const e of entries) {
      if (e.name === '.' || e.name === '..') continue
      const childRel = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (rel === '' && e.name === 'voice') continue
        folderSet.add(childRel) // 빈 폴더도 포함(트리·정리용)
        await walk(path.join(absDir, e.name), childRel)
        continue
      }
      if (!e.isFile() || !MEDIA_RE.test(e.name)) continue
      files.push({ path: childRel, folder: rel, name: e.name })
    }
  }

  await walk(base, '')
  files.sort((a, b) => a.path.localeCompare(b.path))
  return { files, folders: Array.from(folderSet).sort((a, b) => a.localeCompare(b)) }
}

/* ── 파일 ── */

/** 업로드 저장 — 항상 images/ 직속. 저장된 파일명 반환 */
export async function saveImage(root: string, name: string, filename: string, buf: Buffer): Promise<string> {
  const dir = imagesDirOf(root, name)
  await mkdir(dir, { recursive: true })
  const safe = safeFilename(filename)
  await writeFile(path.join(dir, safe), buf)
  return safe
}

/**
 * 삭제 — 하위 폴더 파일도 지운다.
 * 팩션 원본은 images/ 직속만 지웠으나(하위 폴더 파일은 지울 방법이 없었다),
 * 담화는 인물별 폴더(cast/<slug>/)에 사진을 두므로 상대경로 삭제가 필요하다.
 */
export async function deleteImage(root: string, name: string, relPath: string): Promise<void> {
  const segs = safeRelSegs(relPath)
  if (!segs.length) throw new Error('경로가 비었습니다')
  const abs = segs.length === 1
    ? path.join(imagesDirOf(root, name), safeFilename(segs[0]))
    : path.join(episodeDirOf(root, name), ...segs)
  await rm(abs, { force: true })
}

/**
 * 이미지 파일 절대경로 — 슬래시가 있으면 에피소드 폴더 하위, 파일명만이면 images/ 하위.
 * 편집기 표시 경로(imageSrc)와 같은 규칙이다.
 */
export function imageAbsPath(root: string, name: string, relPath: string): string {
  if (relPath.includes('/')) {
    return path.join(episodeDirOf(root, name), ...safeRelSegs(relPath))
  }
  return path.join(imagesDirOf(root, name), safeFilename(relPath))
}

/* ── 폴더 정리 ── */

/** 폴더 생성 (하위 경로 a/b 허용). 정규화된 상대경로 반환 */
export async function createFolder(root: string, name: string, folder: string): Promise<string> {
  const segs = safeRelSegs(folder)
  if (!segs.length) throw new Error('폴더 경로가 비었습니다')
  await mkdir(path.join(episodeDirOf(root, name), ...segs), { recursive: true })
  return segs.join('/')
}

/** 폴더 이름변경 — 같은 부모 안에서 마지막 토막만 바꾼다 */
export async function renameFolder(root: string, name: string, folder: string, newName: string): Promise<{ from: string; to: string }> {
  const segs = safeRelSegs(folder)
  if (!segs.length) throw new Error('폴더 경로가 비었습니다')
  const baseSegs = safeRelSegs(newName)
  if (baseSegs.length !== 1) throw new Error('새 이름은 한 단계여야 합니다')
  const parent = segs.slice(0, -1)
  const fromRel = segs.join('/')
  const toRel = [...parent, baseSegs[0]].join('/')
  if (fromRel === toRel) return { from: fromRel, to: toRel }
  const base = episodeDirOf(root, name)
  const toAbs = path.join(base, ...parent, baseSegs[0])
  if (existsSync(toAbs)) throw new Error('같은 이름의 폴더가 이미 있습니다')
  await rename(path.join(base, ...segs), toAbs)
  return { from: fromRel, to: toRel }
}

/** 폴더 삭제 — 비어 있을 때만 */
export async function deleteFolder(root: string, name: string, folder: string): Promise<void> {
  const segs = safeRelSegs(folder)
  if (!segs.length) throw new Error('폴더 경로가 비었습니다')
  const dir = path.join(episodeDirOf(root, name), ...segs)
  const entries = await readdir(dir).catch(() => [] as string[])
  if (entries.length) throw new Error('폴더가 비어 있지 않습니다')
  await rm(dir, { recursive: true, force: true })
}

/** 파일 이동 — fromPath(파일 상대경로) → toFolder(폴더 상대경로, ''=루트) */
export async function moveImage(root: string, name: string, fromPath: string, toFolder: string): Promise<{ from: string; to: string }> {
  const fromSegs = safeRelSegs(fromPath)
  if (!fromSegs.length) throw new Error('원본 경로가 비었습니다')
  const base = fromSegs[fromSegs.length - 1]
  const toSegs = safeRelSegs(toFolder)
  const fromRel = fromSegs.join('/')
  const toRel = [...toSegs, base].join('/')
  if (fromRel === toRel) return { from: fromRel, to: toRel }
  const epDir = episodeDirOf(root, name)
  const toDirAbs = path.join(epDir, ...toSegs)
  await mkdir(toDirAbs, { recursive: true })
  const toAbs = path.join(toDirAbs, base)
  if (existsSync(toAbs)) throw new Error('대상 폴더에 같은 이름의 파일이 있습니다')
  await rename(path.join(epDir, ...fromSegs), toAbs)
  return { from: fromRel, to: toRel }
}

/** 외부 URL 이미지를 내려받아 images/ 에 저장 — 저장된 파일명 반환 */
export async function saveImageFromUrl(root: string, name: string, url: string, basename: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`이미지를 가져오지 못했습니다 (${res.status})`)
  const ct = res.headers.get('content-type') ?? ''
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : 'jpg'
  const buf = Buffer.from(await res.arrayBuffer())
  return saveImage(root, name, `${safeFilename(basename) || 'image'}.${ext}`, buf)
}

/** 파일 하나 읽기 — 서빙용. 없으면 null */
export async function readImageFile(abs: string): Promise<Buffer | null> {
  try { return await readFile(abs) }
  catch { return null }
}

/* ── 음원 ── */

const WAV_RE = /\.wav$/i

/** 음원 파일 한 개 — 편집기가 존재·길이 표시와 자리 검증에 쓴다 */
export interface VoiceFile {
  /** 파일명 (예 F01P01-quote.wav) */
  file: string
  /** 파일 크기(바이트) */
  size: number
  /** 음성 길이(초) — WAV 헤더 byteRate 기반. 해석 실패 시 0 */
  duration: number
}

/** WAV 헤더(byteRate)로 길이(초) 계산. 실패 시 0 */
export function wavDurationSec(buf: Buffer): number {
  if (buf.length < 44 || buf.slice(0, 4).toString('ascii') !== 'RIFF') return 0
  const byteRate = buf.readUInt32LE(28)
  if (byteRate <= 0) return 0
  return +((buf.length - 44) / byteRate).toFixed(2)
}

/** 에피소드 음원 폴더 — <뿌리>/<에피소드>/voice/ */
export function voiceDirOf(root: string, name: string): string {
  return path.join(episodeDirOf(root, name), 'voice')
}

/** 에피소드 voice/ 폴더의 wav 목록 (이름·크기·길이). 손상 파일은 건너뛴다 */
export async function listVoices(root: string, name: string): Promise<VoiceFile[]> {
  const dir = voiceDirOf(root, name)
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) }
  catch { return [] }
  const out: VoiceFile[] = []
  for (const e of entries) {
    if (!e.isFile() || !WAV_RE.test(e.name)) continue
    try {
      const buf = await readFile(path.join(dir, e.name))
      out.push({ file: e.name, size: buf.length, duration: wavDurationSec(buf) })
    } catch { /* 손상 파일 건너뜀 */ }
  }
  out.sort((a, b) => a.file.localeCompare(b.file))
  return out
}

/**
 * wav 한 개 스트리밍(재생·미리듣기). Range 요청은 206 + Content-Range, 그 외는 200 전체.
 * 같은 파일명에 새 음원을 덮어써도 브라우저가 옛 음성을 캐시해 내보내지 않도록 캐시를 금지한다.
 * 시리즈와 무관한 순수 파일 전송이라 세력도·담화·서재 탐방이 모두 이 함수를 쓴다.
 */
export async function streamWav(req: Request, abs: string): Promise<Response> {
  try {
    const fileSize = (await stat(abs)).size
    const match = req.headers.get('range')?.match(/bytes=(\d+)-(\d*)/)

    const start = match ? parseInt(match[1]) : 0
    const end = match && match[2] ? parseInt(match[2]) : fileSize - 1
    const chunkSize = end - start + 1

    const fh = await open(abs, 'r')
    const buf = Buffer.alloc(chunkSize)
    try { await fh.read(buf, 0, chunkSize, start) }
    finally { await fh.close() }

    return new Response(new Uint8Array(buf), {
      status: match ? 206 : 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(chunkSize),
        ...(match ? { 'Content-Range': `bytes ${start}-${end}/${fileSize}` } : {}),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
}

/* ── 진행 상태 ── */

/** 세력도·담화 공통 진행 상태 어휘 */
export type EpisodeFolderStatus = 'todo' | 'live' | 'done'

const VALID_STATUSES: EpisodeFolderStatus[] = ['todo', 'live', 'done']

function statusPathOf(root: string, name: string): string {
  return path.join(episodeDirOf(root, name), '_status.json')
}

/** 진행 상태 읽기 — _status.json 이 없거나 값이 이상하면 'todo' */
export async function readStatus(root: string, name: string): Promise<EpisodeFolderStatus> {
  try {
    const raw = await readFile(statusPathOf(root, name), 'utf-8')
    const s = (JSON.parse(raw) as { status?: string }).status
    return VALID_STATUSES.includes(s as EpisodeFolderStatus) ? (s as EpisodeFolderStatus) : 'todo'
  } catch {
    return 'todo'
  }
}

/** 진행 상태 저장 */
export async function writeStatus(root: string, name: string, status: EpisodeFolderStatus): Promise<void> {
  if (!VALID_STATUSES.includes(status)) throw new Error('invalid status')
  const fp = statusPathOf(root, name)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify({ status }, null, 2) + '\n', 'utf-8')
}

/* ── 에피소드 폴더 목록 ── */

/** 등록 에피소드 화이트리스트(_episodes.json) — 있으면 그 목록만 노출, 없으면 null(전체, 하위호환) */
export async function readRegistry(root: string): Promise<Set<string> | null> {
  try { return new Set(JSON.parse(await readFile(path.join(root, '_episodes.json'), 'utf-8')) as string[]) }
  catch { return null }
}

/**
 * 노출 대상 에피소드 폴더명 목록 — 이름순.
 * `_` 로 시작하는 관리용 폴더는 빼고, 등록 목록이 있으면 그 목록만 남긴다(등록 밖 폴더는 숨김, 파일은 보존).
 * 본문 파일 존재 확인·파싱은 시리즈마다 다르므로 호출자가 한다.
 */
export async function listEpisodeDirs(root: string): Promise<string[]> {
  let entries
  try { entries = await readdir(root, { withFileTypes: true }) }
  catch { return [] }
  const allow = await readRegistry(root)
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && (!allow || allow.has(e.name)))
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b))
}
