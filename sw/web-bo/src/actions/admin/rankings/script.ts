'use server'

import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { episodeDirOf, RANKINGS_DIR, safeDirName } from '@feelandnote/shared/bo/episode-store'
import { requireAdmin } from '@/lib/admin-auth'
import { assertRemotionLocal } from '@/lib/remotion-local'

const DATA_FILE = 'ranking-data.json'
const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export interface RankingEntry {
  rank: number
  name: string
  line?: string
  note?: string
  image?: string
  avatar?: string
  celebSlug?: string
}

export interface RankingCategory {
  name: string
  entries: RankingEntry[]
}

export interface RankingScript {
  title: string
  logline?: string
  music?: string
  musicVolume?: number
  /** 세력도감 테마 slug. 인물 풀·개인화보는 이 테마를 쓴다 */
  themeSlug?: string
  categories: RankingCategory[]
}

export interface RankingEpisodeSummary {
  folder: string
  title: string
  categoryCount: number
  entryCount: number
}

function assertFolder(folder: string): string {
  const f = (folder ?? '').trim().replace(/\\/g, '/')
  if (!f || !FOLDER_RE.test(f)) {
    throw new Error('폴더명은 영문·숫자·하이픈·밑줄·마침표만 쓸 수 있고 영문이나 숫자로 시작해야 합니다')
  }
  if (f !== safeDirName(f)) throw new Error('폴더명에 경로 문자를 쓸 수 없습니다')
  return f
}

function dataPath(folder: string) {
  return path.join(episodeDirOf(RANKINGS_DIR, folder), DATA_FILE)
}

function asScript(raw: unknown, fallbackTitle: string): RankingScript {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const categories = Array.isArray(o.categories) ? o.categories : []
  return {
    title: typeof o.title === 'string' && o.title.trim() ? o.title : fallbackTitle,
    logline: typeof o.logline === 'string' ? o.logline : '',
    music: typeof o.music === 'string' ? o.music : '',
    musicVolume: typeof o.musicVolume === 'number' ? o.musicVolume : undefined,
    themeSlug: typeof o.themeSlug === 'string' ? o.themeSlug : '',
    categories: categories.map((cat) => {
      const c = cat && typeof cat === 'object' ? cat as Record<string, unknown> : {}
      const entries = Array.isArray(c.entries) ? c.entries : []
      return {
        name: typeof c.name === 'string' ? c.name : '',
        entries: entries.map((row) => {
          const e = row && typeof row === 'object' ? row as Record<string, unknown> : {}
          return {
            rank: typeof e.rank === 'number' ? e.rank : Number(e.rank) || 0,
            name: typeof e.name === 'string' ? e.name : '',
            line: typeof e.line === 'string' ? e.line : '',
            note: typeof e.note === 'string' ? e.note : '',
            image: typeof e.image === 'string' ? e.image : '',
            avatar: typeof e.avatar === 'string' ? e.avatar : '',
            celebSlug: typeof e.celebSlug === 'string' ? e.celebSlug : '',
          }
        }),
      }
    }),
  }
}

async function listRankingFolders(): Promise<string[]> {
  let entries
  try {
    entries = await readdir(RANKINGS_DIR, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && existsSync(dataPath(e.name)))
    .map(e => e.name)
    .toSorted((a, b) => a.localeCompare(b, 'ko'))
}

export async function listRankingEpisodes(): Promise<RankingEpisodeSummary[]> {
  await requireAdmin()
  const folders = await listRankingFolders()
  const rows: RankingEpisodeSummary[] = []
  for (const folder of folders) {
    try {
      const script = asScript(JSON.parse(await readFile(dataPath(folder), 'utf-8')), folder)
      rows.push({
        folder,
        title: script.title.replace(/\n/g, ' ').trim() || folder,
        categoryCount: script.categories.length,
        entryCount: script.categories.reduce((n, c) => n + c.entries.length, 0),
      })
    } catch {
      rows.push({ folder, title: folder, categoryCount: 0, entryCount: 0 })
    }
  }
  return rows
}

export async function loadRankingScript(folder: string): Promise<RankingScript> {
  await requireAdmin()
  assertRemotionLocal()
  const f = assertFolder(folder)
  const raw = JSON.parse(await readFile(dataPath(f), 'utf-8'))
  return asScript(raw, f)
}

export async function saveRankingScript(folder: string, script: RankingScript): Promise<void> {
  await requireAdmin()
  assertRemotionLocal()
  const f = assertFolder(folder)
  if (!script.title?.trim()) throw new Error('영상 제목을 적어주세요')
  const cleaned = asScript(script, f)
  cleaned.title = script.title
  await writeFile(dataPath(f), `${JSON.stringify(cleaned, null, 2)}\n`, 'utf-8')
  revalidatePath('/rankings')
  revalidatePath(`/rankings/${f}`)
}

export async function createRankingEpisode(folder: string, title: string): Promise<string> {
  await requireAdmin()
  assertRemotionLocal()
  const f = assertFolder(folder)
  const dir = episodeDirOf(RANKINGS_DIR, f)
  if (existsSync(dataPath(f))) throw new Error('같은 폴더명의 편이 이미 있습니다')
  await mkdir(dir, { recursive: true })
  const script: RankingScript = { title: title.trim() || f, logline: '', themeSlug: '', categories: [] }
  await writeFile(dataPath(f), `${JSON.stringify(script, null, 2)}\n`, 'utf-8')
  await addRankingRegistry(f)
  revalidatePath('/rankings')
  return f
}

async function addRankingRegistry(folder: string) {
  const registryPath = path.join(RANKINGS_DIR, '_episodes.json')
  let list: string[] = []
  try {
    list = JSON.parse(await readFile(registryPath, 'utf-8')) as string[]
  } catch {
    list = []
  }
  if (list.includes(folder)) return
  list.push(folder)
  await writeFile(registryPath, `${JSON.stringify(list, null, 2)}\n`, 'utf-8')
}
