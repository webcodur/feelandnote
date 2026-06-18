/**
 * 세력도(Faction) 데이터·이미지 IO — 서버 전용.
 *
 * 데이터는 sw/remotion/public/factions/{name}/data.json (한국어 + 영문 *En 병기),
 * 이미지는 sw/remotion/public/factions/{name}/images/ 에 둔다.
 * BookRecommend(episodes/)와 완전히 분리된 경로다.
 */

import { readFile, readdir, writeFile, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { FactionScript, FactionEpisodeListItem, FactionStatus } from './faction-types'

const VALID_STATUSES: FactionStatus[] = ['todo', 'live', 'done']

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
export const FACTIONS_DIR = path.join(REMOTION_ROOT, 'public', 'factions')
export const MUSIC_DIR = path.join(REMOTION_ROOT, 'public', 'music')

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i

/** 파일명 안전화 — 경로 이탈·특수문자 차단 */
export function safeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
}

function dataPath(name: string): string {
  return path.join(FACTIONS_DIR, safeFilename(name), 'data.json')
}

function imagesDir(name: string): string {
  return path.join(FACTIONS_DIR, safeFilename(name), 'images')
}

function statusPath(name: string): string {
  return path.join(FACTIONS_DIR, safeFilename(name), '_status.json')
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

  const items: FactionEpisodeListItem[] = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('_')) continue
    const fp = dataPath(e.name)
    if (!existsSync(fp)) continue
    try {
      const data = JSON.parse(await readFile(fp, 'utf-8')) as FactionScript
      const personCount = (data.groups ?? []).reduce((s, g) => s + (g.people?.length ?? 0), 0)
      items.push({
        id: e.name,
        title: data.title ?? e.name,
        subtitle: data.subtitle,
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
  const safe = safeFilename(name)
  if (!safe) throw new Error('invalid episode name')
  if (existsSync(dataPath(safe))) throw new Error('episode already exists')
  const data: FactionScript = {
    title: init.title?.trim() || safe,
    subtitle: init.subtitle,
    music: init.music,
    groups: init.groups ?? [],
  }
  await saveFactionEpisode(safe, data)
  await writeFactionStatus(safe, 'todo')
  return data
}

export async function deleteFactionEpisode(name: string): Promise<void> {
  await rm(path.join(FACTIONS_DIR, safeFilename(name)), { recursive: true, force: true })
}

export async function duplicateFactionEpisode(src: string, dst: string): Promise<FactionScript> {
  const safeDst = safeFilename(dst)
  if (existsSync(dataPath(safeDst))) throw new Error('target episode already exists')
  const data = await loadFactionEpisode(src)
  await saveFactionEpisode(safeDst, data)
  // 이미지도 복사
  const srcImg = imagesDir(src)
  if (existsSync(srcImg)) {
    const dstImg = imagesDir(safeDst)
    await mkdir(dstImg, { recursive: true })
    for (const f of await readdir(srcImg)) {
      if (!IMAGE_RE.test(f)) continue
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
  try { return (await readdir(imagesDir(name))).filter(f => IMAGE_RE.test(f)).sort() }
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
  /** 이미지가 존재하는 폴더 상대경로 목록 ('' 제외, 정렬됨) */
  folders: string[]
}

/**
 * 에피소드 폴더(public/factions/{name}/) 하위를 재귀 스캔해 이미지만 모은다.
 * data.json·md 등 비이미지는 제외. 경로 이탈(..) 차단.
 * 기존 listFactionImages(images/ 단일 배열)와 별개 — picker 호환 위해 그대로 둔다.
 */
export async function listFactionImageTree(name: string): Promise<FactionImageTree> {
  const root = path.join(FACTIONS_DIR, safeFilename(name))
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
        await walk(path.join(absDir, e.name), childRel)
        continue
      }
      if (!e.isFile() || !IMAGE_RE.test(e.name)) continue
      files.push({ path: childRel, folder: rel, name: e.name })
      if (rel) folderSet.add(rel)
    }
  }

  await walk(root, '')
  files.sort((a, b) => a.path.localeCompare(b.path))
  return { files, folders: Array.from(folderSet).sort((a, b) => a.localeCompare(b)) }
}

export async function deleteFactionImage(name: string, filename: string): Promise<void> {
  await rm(path.join(imagesDir(name), safeFilename(filename)), { force: true })
}

export function factionImageAbsPath(name: string, filename: string): string {
  // 폴더 경로(vanity, 예 '1/앨런 튜링.webp')는 images/ 없이 에피소드 폴더 하위에서 직접 찾는다.
  // 경로 이탈(..)만 차단하고 한글·공백 세그먼트는 그대로 둔다.
  if (filename.includes('/')) {
    const segs = filename.split('/').filter((s) => s && s !== '.' && s !== '..')
    return path.join(FACTIONS_DIR, safeFilename(name), ...segs)
  }
  return path.join(imagesDir(name), safeFilename(filename))
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
