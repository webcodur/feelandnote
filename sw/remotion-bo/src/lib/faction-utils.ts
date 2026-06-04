/**
 * 세력도(Faction) 데이터·이미지 IO — 서버 전용.
 *
 * 데이터는 sw/remotion/public/factions/{name}/data.{locale}.json,
 * 이미지는 sw/remotion/public/factions/{name}/images/ 에 둔다.
 * BookRecommend(episodes/)와 완전히 분리된 경로다.
 */

import { readFile, readdir, writeFile, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { FactionScript, FactionEpisodeListItem } from './faction-types'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
export const FACTIONS_DIR = path.join(REMOTION_ROOT, 'public', 'factions')
export const MUSIC_DIR = path.join(REMOTION_ROOT, 'public', 'music')

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i

/** 파일명 안전화 — 경로 이탈·특수문자 차단 */
export function safeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
}

function dataPath(name: string, locale = 'ko'): string {
  return path.join(FACTIONS_DIR, safeFilename(name), `data.${locale}.json`)
}

function imagesDir(name: string): string {
  return path.join(FACTIONS_DIR, safeFilename(name), 'images')
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
      })
    } catch { /* 손상 파일 건너뜀 */ }
  }
  items.sort((a, b) => a.id.localeCompare(b.id))
  return items
}

export async function loadFactionEpisode(name: string, locale = 'ko'): Promise<FactionScript> {
  const raw = await readFile(dataPath(name, locale), 'utf-8')
  return JSON.parse(raw) as FactionScript
}

export async function saveFactionEpisode(name: string, data: FactionScript, locale = 'ko'): Promise<void> {
  const fp = dataPath(name, locale)
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

export async function deleteFactionImage(name: string, filename: string): Promise<void> {
  await rm(path.join(imagesDir(name), safeFilename(filename)), { force: true })
}

export function factionImageAbsPath(name: string, filename: string): string {
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
