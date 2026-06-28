/**
 * 세력도(Faction) 데이터·이미지 IO — 서버 전용.
 *
 * 데이터는 sw/remotion/public/factions/{name}/data.json (한국어 + 영문 *En 병기),
 * 이미지는 sw/remotion/public/factions/{name}/images/ 에 둔다.
 * BookRecommend(episodes/)와 완전히 분리된 경로다.
 */

import { readFile, readdir, writeFile, mkdir, rm, rename } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { FactionScript, FactionEpisodeListItem, FactionStatus } from './faction-types'

const VALID_STATUSES: FactionStatus[] = ['todo', 'live', 'done']

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
export const FACTIONS_DIR = path.join(REMOTION_ROOT, 'public', 'factions')
export const MUSIC_DIR = path.join(REMOTION_ROOT, 'public', 'music')
export const SFX_DIR = path.join(REMOTION_ROOT, 'public', 'common', 'sfx')

const MEDIA_RE = /\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v)$/i

/** 등록 에피소드 화이트리스트(_episodes.json) — 있으면 그 목록만 노출, 없으면 전체(하위호환) */
const REGISTRY_PATH = path.join(FACTIONS_DIR, '_episodes.json')
async function readRegistry(): Promise<Set<string> | null> {
  try { return new Set(JSON.parse(await readFile(REGISTRY_PATH, 'utf-8')) as string[]) }
  catch { return null }
}

/** 파일명 안전화 — 경로 이탈·특수문자 차단 (업로드 이미지·음성 파일명용) */
export function safeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
}

/** 에피소드 폴더명 안전화 — 한글 허용, 경로 이탈만 차단 */
export function safeDirName(name: string): string {
  return path.basename(name).replace(/[/\\]/g, '')
}

function dataPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'data.json')
}

function imagesDir(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'images')
}

function statusPath(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), '_status.json')
}

/* ── 진행 상태 ── */

/** 세력도 진행 상태 읽기 — _status.json 없으면 'todo' */
export async function readFactionStatus(name: string): Promise<FactionStatus> {
  try {
    const raw = await readFile(statusPath(name), 'utf-8')
    const s = (JSON.parse(raw) as { status?: string }).status
    return VALID_STATUSES.includes(s as FactionStatus) ? (s as FactionStatus) : 'todo'
  } catch {
    return 'todo'
  }
}

/** 세력도 진행 상태 저장 */
export async function writeFactionStatus(name: string, status: FactionStatus): Promise<void> {
  if (!VALID_STATUSES.includes(status)) throw new Error('invalid status')
  const fp = statusPath(name)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify({ status }, null, 2) + '\n', 'utf-8')
}

/* ── 에피소드 ── */

export async function listFactionEpisodes(): Promise<FactionEpisodeListItem[]> {
  let entries
  try { entries = await readdir(FACTIONS_DIR, { withFileTypes: true }) }
  catch { return [] }

  const allow = await readRegistry()
  const items: FactionEpisodeListItem[] = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('_')) continue
    if (allow && !allow.has(e.name)) continue // 등록 목록에 없는 폴더는 숨김(파일은 보존)
    const fp = dataPath(e.name)
    if (!existsSync(fp)) continue
    try {
      const data = JSON.parse(await readFile(fp, 'utf-8')) as FactionScript
      // 인물은 묶음(clusters)으로 나뉘면 cluster.people 에, 아니면 group.people 에 담긴다. 둘 다 합산해야 누락이 없다.
      const personCount = (data.groups ?? []).reduce((s, g) => {
        const ppl = g.clusters?.length ? g.clusters.flatMap(c => c.people ?? []) : (g.people ?? [])
        return s + ppl.length
      }, 0)
      items.push({
        id: e.name,
        title: data.title ?? e.name,
        groupCount: data.groups?.length ?? 0,
        personCount,
        hasMusic: !!data.music,
        status: await readFactionStatus(e.name),
      })
    } catch { /* 손상 파일 건너뜀 */ }
  }
  items.sort((a, b) => a.id.localeCompare(b.id))
  return items
}

export async function loadFactionEpisode(name: string): Promise<FactionScript> {
  const raw = await readFile(dataPath(name), 'utf-8')
  return JSON.parse(raw) as FactionScript
}

export async function saveFactionEpisode(name: string, data: FactionScript): Promise<void> {
  const fp = dataPath(name)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export async function createFactionEpisode(name: string, init: Partial<FactionScript>): Promise<FactionScript> {
  const safe = safeDirName(name)
  if (!safe) throw new Error('invalid episode name')
  if (existsSync(dataPath(safe))) throw new Error('episode already exists')
  const data: FactionScript = {
    title: init.title?.trim() || safe,
    music: init.music,
    groups: init.groups ?? [],
  }
  await saveFactionEpisode(safe, data)
  await writeFactionStatus(safe, 'todo')
  return data
}

export async function deleteFactionEpisode(name: string): Promise<void> {
  await rm(path.join(FACTIONS_DIR, safeDirName(name)), { recursive: true, force: true })
}

export async function duplicateFactionEpisode(src: string, dst: string): Promise<FactionScript> {
  const safeDst = safeDirName(dst)
  if (existsSync(dataPath(safeDst))) throw new Error('target episode already exists')
  const data = await loadFactionEpisode(src)
  await saveFactionEpisode(safeDst, data)
  // 이미지도 복사
  const srcImg = imagesDir(src)
  if (existsSync(srcImg)) {
    const dstImg = imagesDir(safeDst)
    await mkdir(dstImg, { recursive: true })
    for (const f of await readdir(srcImg)) {
      if (!MEDIA_RE.test(f)) continue
      await writeFile(path.join(dstImg, f), await readFile(path.join(srcImg, f)))
    }
  }
  return data
}

/* ── 이미지 ── */

export async function saveFactionImage(name: string, filename: string, buf: Buffer): Promise<string> {
  const dir = imagesDir(name)
  await mkdir(dir, { recursive: true })
  const safe = safeFilename(filename)
  await writeFile(path.join(dir, safe), buf)
  return safe
}

export async function listFactionImages(name: string): Promise<string[]> {
  try { return (await readdir(imagesDir(name))).filter(f => MEDIA_RE.test(f)).sort() }
  catch { return [] }
}

/** 트리 스캔 결과 — 에피소드 폴더 하위 이미지 전체 */
export interface FactionImageTreeFile {
  /** 에피소드 폴더 기준 상대경로 (예 '01-pioneers/앨런 튜링.png') */
  path: string
  /** 상위 폴더 상대경로 ('' = 루트) */
  folder: string
  /** 파일명 (예 '앨런 튜링.png') */
  name: string
}

export interface FactionImageTree {
  files: FactionImageTreeFile[]
  /** 폴더 상대경로 목록 — 빈 폴더 포함, 'voice' 제외, '' 제외, 정렬됨 */
  folders: string[]
}

/** 상대 경로 세그먼트 안전화 — 한글·공백 유지, 경로 이탈(.. .)·빈 세그먼트 제거 */
function safeRelSegs(p: string): string[] {
  return (p ?? '').split('/').map(s => s.trim()).filter(s => s && s !== '.' && s !== '..')
}

/**
 * 에피소드 폴더(public/factions/{name}/) 하위를 재귀 스캔해 이미지만 모은다.
 * data.json·md 등 비이미지는 제외. 경로 이탈(..) 차단.
 * 기존 listFactionImages(images/ 단일 배열)와 별개 — picker 호환 위해 그대로 둔다.
 */
export async function listFactionImageTree(name: string): Promise<FactionImageTree> {
  const root = path.join(FACTIONS_DIR, safeDirName(name))
  const files: FactionImageTreeFile[] = []
  const folderSet = new Set<string>()

  async function walk(absDir: string, rel: string): Promise<void> {
    let entries
    try { entries = await readdir(absDir, { withFileTypes: true }) }
    catch { return }
    for (const e of entries) {
      if (e.name === '.' || e.name === '..') continue
      const childRel = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) {
        // 음성 폴더는 이미지 풀과 무관 — 건너뛴다
        if (rel === '' && e.name === 'voice') continue
        folderSet.add(childRel) // 빈 폴더도 폴더 목록에 포함(트리·정리용)
        await walk(path.join(absDir, e.name), childRel)
        continue
      }
      if (!e.isFile() || !MEDIA_RE.test(e.name)) continue
      files.push({ path: childRel, folder: rel, name: e.name })
    }
  }

  await walk(root, '')
  files.sort((a, b) => a.path.localeCompare(b.path))
  return { files, folders: Array.from(folderSet).sort((a, b) => a.localeCompare(b)) }
}

/* ── 이미지 폴더 정리 (풀에서 폴더 만들기·이름변경·삭제·파일 이동) ── */

/** 폴더 생성 (하위 경로 a/b 허용). 반환값은 정규화된 상대경로 */
export async function createFactionFolder(name: string, folder: string): Promise<string> {
  const segs = safeRelSegs(folder)
  if (!segs.length) throw new Error('폴더 경로가 비었습니다')
  await mkdir(path.join(FACTIONS_DIR, safeDirName(name), ...segs), { recursive: true })
  return segs.join('/')
}

/** 폴더 이름변경 (같은 부모 안에서 마지막 토막만 변경). 반환 {from,to} 상대경로 */
export async function renameFactionFolder(name: string, folder: string, newName: string): Promise<{ from: string; to: string }> {
  const segs = safeRelSegs(folder)
  if (!segs.length) throw new Error('폴더 경로가 비었습니다')
  const baseSegs = safeRelSegs(newName)
  if (baseSegs.length !== 1) throw new Error('새 이름은 한 단계여야 합니다')
  const parent = segs.slice(0, -1)
  const fromRel = segs.join('/')
  const toRel = [...parent, baseSegs[0]].join('/')
  if (fromRel === toRel) return { from: fromRel, to: toRel }
  const root = path.join(FACTIONS_DIR, safeDirName(name))
  const toAbs = path.join(root, ...parent, baseSegs[0])
  if (existsSync(toAbs)) throw new Error('같은 이름의 폴더가 이미 있습니다')
  await rename(path.join(root, ...segs), toAbs)
  return { from: fromRel, to: toRel }
}

/** 폴더 삭제 — 비어 있을 때만 */
export async function deleteFactionFolder(name: string, folder: string): Promise<void> {
  const segs = safeRelSegs(folder)
  if (!segs.length) throw new Error('폴더 경로가 비었습니다')
  const dir = path.join(FACTIONS_DIR, safeDirName(name), ...segs)
  const entries = await readdir(dir).catch(() => [] as string[])
  if (entries.length) throw new Error('폴더가 비어 있지 않습니다')
  await rm(dir, { recursive: true, force: true })
}

/** 이미지 파일 이동 — fromPath(파일 상대경로) → toFolder(폴더 상대경로, ''=루트). 반환 {from,to} 상대경로 */
export async function moveFactionImage(name: string, fromPath: string, toFolder: string): Promise<{ from: string; to: string }> {
  const fromSegs = safeRelSegs(fromPath)
  if (!fromSegs.length) throw new Error('원본 경로가 비었습니다')
  const base = fromSegs[fromSegs.length - 1]
  const toSegs = safeRelSegs(toFolder)
  const fromRel = fromSegs.join('/')
  const toRel = [...toSegs, base].join('/')
  if (fromRel === toRel) return { from: fromRel, to: toRel }
  const root = path.join(FACTIONS_DIR, safeDirName(name))
  const toDirAbs = path.join(root, ...toSegs)
  await mkdir(toDirAbs, { recursive: true })
  const toAbs = path.join(toDirAbs, base)
  if (existsSync(toAbs)) throw new Error('대상 폴더에 같은 이름의 파일이 있습니다')
  await rename(path.join(root, ...fromSegs), toAbs)
  return { from: fromRel, to: toRel }
}

export async function deleteFactionImage(name: string, filename: string): Promise<void> {
  await rm(path.join(imagesDir(name), safeFilename(filename)), { force: true })
}

export function factionImageAbsPath(name: string, filename: string): string {
  // 폴더 경로(vanity, 예 '1/앨런 튜링.webp')는 images/ 없이 에피소드 폴더 하위에서 직접 찾는다.
  // 경로 이탈(..)만 차단하고 한글·공백 세그먼트는 그대로 둔다.
  if (filename.includes('/')) {
    const segs = filename.split('/').filter((s) => s && s !== '.' && s !== '..')
    return path.join(FACTIONS_DIR, safeDirName(name), ...segs)
  }
  return path.join(imagesDir(name), safeFilename(filename))
}

/* ── 음성 (인물 대사 TTS) ── */

/** 에피소드 음성 디렉토리 — public/factions/{name}/voice/ */
export function factionVoiceDir(name: string): string {
  return path.join(FACTIONS_DIR, safeDirName(name), 'voice')
}

/** 음성 파일 절대경로 — basename으로 경로 이탈 차단 */
export function factionVoiceFilePath(name: string, file: string): string {
  return path.join(factionVoiceDir(name), safeFilename(file))
}

const WAV_RE = /\.wav$/i

export interface FactionVoiceFile {
  /** 파일명 (예 F01P01-quote.wav) */
  file: string
  /** 파일 크기(바이트) */
  size: number
  /** 음성 길이(초) — WAV 헤더 byteRate 기반 */
  duration: number
}

/** WAV 헤더(byteRate)로 길이(초) 계산. 실패 시 0 */
export function wavDurationSec(buf: Buffer): number {
  if (buf.length < 44 || buf.slice(0, 4).toString('ascii') !== 'RIFF') return 0
  const byteRate = buf.readUInt32LE(28)
  if (byteRate <= 0) return 0
  return +((buf.length - 44) / byteRate).toFixed(2)
}

/** 에피소드 voice/ 디렉토리의 인물 대사 wav 목록 (이름·크기·길이) */
export async function listFactionVoices(name: string): Promise<FactionVoiceFile[]> {
  const dir = factionVoiceDir(name)
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) }
  catch { return [] }
  const out: FactionVoiceFile[] = []
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

/* ── 댓글 (편별 해설 텍스트) ── */

/** 편별 댓글 파일 경로 — public/factions/{name}/comment.p<part>.txt. part 는 정수로 강제해 경로 이탈 차단 */
function commentPath(name: string, part: number): string {
  const p = Math.max(0, Math.floor(Number(part) || 0))
  return path.join(FACTIONS_DIR, safeDirName(name), `comment.p${p}.txt`)
}

/** 편별 댓글 읽기 — 파일 없으면 빈 문자열 */
export async function readFactionComment(name: string, part: number): Promise<string> {
  try { return await readFile(commentPath(name, part), 'utf-8') }
  catch { return '' }
}

/** 편별 댓글 저장 — 내용이 비면 파일 삭제 */
export async function writeFactionComment(name: string, part: number, text: string): Promise<void> {
  const fp = commentPath(name, part)
  if (!text.trim()) { await rm(fp, { force: true }); return }
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, text, 'utf-8')
}

/* ── 음악 ── */

export async function listMusic(): Promise<string[]> {
  try { return (await readdir(MUSIC_DIR)).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort() }
  catch { return [] }
}

export async function saveMusic(filename: string, buf: Buffer): Promise<string> {
  await mkdir(MUSIC_DIR, { recursive: true })
  const safe = safeFilename(filename)
  await writeFile(path.join(MUSIC_DIR, safe), buf)
  return safe
}

/** 효과음(SFX) 파일 목록 — public/common/sfx/ (시리즈 공통) */
export async function listSfx(): Promise<string[]> {
  try { return (await readdir(SFX_DIR)).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort() }
  catch { return [] }
}
