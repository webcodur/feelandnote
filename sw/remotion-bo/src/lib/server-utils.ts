import { readFile, readdir, stat, writeFile, mkdir, unlink, cp, rm, rename } from 'fs/promises'
import { existsSync, readFileSync, readdirSync, type Dirent } from 'fs'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import { isFactionSeries } from './series-registry'
import { listFactionEpisodes, loadFactionEpisode, saveFactionEpisode } from './faction-utils'
import type { FactionScript } from './faction-types'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const EPISODES_DIR = path.join(REMOTION_ROOT, 'public', 'episodes')
const COMMON_VOICE_DIR = path.join(REMOTION_ROOT, 'public', 'common', 'voice')
export const VOICE_ARCHIVE = path.join(REMOTION_ROOT, 'voice-archive')

/**
 * 작업 완료된 인물 보관소 — D:\done_people
 *
 * 사용자가 작업을 끝낸 셀럽 폴더를 통째로 이 경로로 옮긴다. 표준 episodes 디렉토리와
 * 동일한 구조({person}/{ko,en}.json …)이며, findEpisodeDir/listEpisodes 가 이 경로도
 * 폴백으로 스캔한다. 메타 푸시·로드는 정상 동작하고, status는 'done' 으로 노출된다.
 */
const ARCHIVED_EPISODES_DIR = process.env.REMOTION_ARCHIVED_EPISODES_DIR || 'D:/done_people'

/** export — API 라우트에서 직접 사용 */
export { EPISODES_DIR, COMMON_VOICE_DIR, ARCHIVED_EPISODES_DIR }

// --- 상태 정책 ---
//
// 신구조: episodes/<person>/_status (JSON 한 줄) 가 진척도 SSoT.
// 폴더 위치는 그룹 축으로 자유롭게 사용 가능 (예: episodes/three-kingdoms/).
//
// 마이그레이션 호환: episodes/<status>/<person>/ 옛 위치도 인식한다.
const STATUSES = ['todo', 'live', 'done'] as const
export type EpisodeStatus = (typeof STATUSES)[number]
const STATUS_FILE = '_status.json'

function readStatusFile(personDir: string): EpisodeStatus | null {
  const fp = path.join(personDir, STATUS_FILE)
  if (!existsSync(fp)) return null
  try {
    // BOM(0xFEFF) 선두 제거
    const raw = readFileSync(fp, 'utf-8').replace(/^﻿/, '').trim()
    const parsed = JSON.parse(raw)
    const value = typeof parsed === 'string' ? parsed : parsed?.status
    if ((STATUSES as readonly string[]).includes(value)) return value as EpisodeStatus
  } catch { /* ignore */ }
  return null
}

/** 인물 폴더 후보인지 — _status 파일이 있거나 ko.json/en.json 직속이면 인물 폴더 */
function isPersonDir(dir: string): boolean {
  if (existsSync(path.join(dir, STATUS_FILE))) return true
  if (existsSync(path.join(dir, 'ko.json')) || existsSync(path.join(dir, 'en.json'))) return true
  // 신구조(책 단위 분할) 인물 — meta.{locale}.json 직속
  if (existsSync(path.join(dir, 'meta.ko.json')) || existsSync(path.join(dir, 'meta.en.json'))) return true
  return false
}

type PersonHit = { name: string; dir: string; status: EpisodeStatus; group: string }

/** episodes/ 루트부터 재귀 스캔하여 인물 폴더 목록을 모은다.
 *  - 인물 폴더 = _status 파일 보유 또는 ko/en/meta JSON 직속 (재귀 중단)
 *  - 그 외 디렉토리 = 그룹 폴더 (자식 재귀, 경로를 group 으로 누적)
 *  - 스킵: `_` 접두 폴더, 루트의 옛 status 폴더(todo/live/done), 루트의 pre-todo
 *  - group 은 '/' 로 연결한 그룹 경로 ('' = 루트). 예: 'three-kingdoms' */
function scanPersonFoldersSync(root: string): PersonHit[] {
  const hits: PersonHit[] = []
  function walk(dir: string, depth: number, group: string) {
    let entries: Dirent[]
    try { entries = readdirSync(dir, { withFileTypes: true }) as Dirent[] } catch { return }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (e.name.startsWith('_')) continue
      // 루트 레벨에서만 옛 status/candidates 폴더를 스킵 (legacy compat).
      if (depth === 0 && ((STATUSES as readonly string[]).includes(e.name) || e.name === 'pre-todo')) continue
      const sub = path.join(dir, e.name)
      if (isPersonDir(sub)) {
        const status = readStatusFile(sub) ?? 'todo'
        hits.push({ name: e.name, dir: sub, status, group })
      } else {
        const nextGroup = group ? `${group}/${e.name}` : e.name
        walk(sub, depth + 1, nextGroup) // 그룹 폴더로 간주, 재귀
      }
    }
  }
  walk(root, 0, '')
  return hits
}

/**
 * Episode ID ↔ person/locale 변환
 *
 *   elon-musk      → person: elon-musk, locale: ko
 *   elon-musk-en   → person: elon-musk, locale: en
 *
 * 동일 인물 다편(alt 에피소드) 패턴은 폐기됨. 이제 같은 인물의 복수 쇼츠는
 * shorts 배열로 표현한다.
 */
export function parseEpisodeId(episodeId: string): { person: string; locale: string } {
  if (episodeId.endsWith('-en')) return { person: episodeId.slice(0, -3), locale: 'en' }
  return { person: episodeId, locale: 'ko' }
}

/** person 이름(또는 episode ID)으로 인물 폴더를 찾는다.
 *  신구조(루트 또는 그룹 폴더 안 인물) → 옛 status 폴더 → 아카이브 순. */
export function findEpisodeDir(personOrId: string): { status: EpisodeStatus; dir: string; group?: string } | null {
  const { person } = parseEpisodeId(personOrId)
  // 1. 신구조 — 루트 직속 인물
  const rootDir = path.join(EPISODES_DIR, person)
  if (isPersonDir(rootDir)) {
    return { status: readStatusFile(rootDir) ?? 'todo', dir: rootDir, group: '' }
  }
  // 2. 신구조 — 그룹 폴더 안 (전체 재귀 탐색). 한 번 스캔하므로 비용 허용 범위.
  for (const hit of scanPersonFoldersSync(EPISODES_DIR)) {
    if (hit.name === person) return { status: hit.status, dir: hit.dir, group: hit.group }
  }
  // 3. 옛 status 폴더 폴백 (legacy)
  for (const s of STATUSES) {
    const dir = path.join(EPISODES_DIR, s, person)
    if (existsSync(dir)) return { status: s, dir }
  }
  // 4. 아카이브 폴백 — D:/done_people/{person}. status 는 'done' 으로 통일.
  const archivedDir = path.join(ARCHIVED_EPISODES_DIR, person)
  if (existsSync(archivedDir)) return { status: 'done', dir: archivedDir }
  return null
}

/**
 * Episode 파일 경로: public/episodes/{status}/{person}/{locale}.json
 */
function episodeFilePath(episodeId: string): string {
  const { person, locale } = parseEpisodeId(episodeId)
  const found = findEpisodeDir(person)
  const base = found ? found.dir : path.join(EPISODES_DIR, 'todo', person)
  return path.join(base, `${locale}.json`)
}

/**
 * Timing 파일 경로: public/episodes/{status}/{person}/{locale}.timing.json
 */
function timingFilePath(episodeId: string): string {
  const { person, locale } = parseEpisodeId(episodeId)
  const found = findEpisodeDir(person)
  const base = found ? found.dir : path.join(EPISODES_DIR, 'todo', person)
  return path.join(base, `${locale}.timing.json`)
}

/**
 * Voice 디렉토리 경로: public/episodes/{status}/{person}/voice/{locale}/
 */
export function voiceDir(episodeId: string): string {
  const { person, locale } = parseEpisodeId(episodeId)
  const found = findEpisodeDir(person)
  const base = found ? found.dir : path.join(EPISODES_DIR, 'todo', person)
  return path.join(base, 'voice', locale)
}

function buildEpisodeId(personDir: string, filename: string): string {
  const base = filename.replace('.json', '')
  if (base === 'ko') return personDir
  if (base === 'en') return `${personDir}-en`
  return personDir
}

export type EpisodeListItem = { id: string; status: EpisodeStatus; group: string }

/** 한 인물 폴더에서 ko / en 에피소드 ID 목록을 추출. 신구조(meta.{locale}.json) · 옛 구조(ko.json) 둘 다 인식. */
async function listPersonEpisodes(personName: string, personDir: string): Promise<string[]> {
  let files: string[]
  try { files = await readdir(personDir) } catch { return [] }
  const ids: string[] = []
  // 신구조: meta.{ko,en}.json
  if (files.includes('meta.ko.json')) ids.push(buildEpisodeId(personName, 'ko.json'))
  if (files.includes('meta.en.json')) ids.push(buildEpisodeId(personName, 'en.json'))
  // 옛 구조: ko.json / en.json (신구조와 동시 존재해도 dedup)
  for (const f of files) {
    if (!f.endsWith('.json') || f.endsWith('.timing.json')) continue
    const base = f.replace('.json', '')
    if (!/^(ko|en)$/.test(base)) continue
    const id = buildEpisodeId(personName, f)
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

export async function listEpisodes(series?: string): Promise<EpisodeListItem[]> {
  // 세력도: factions/ 디렉토리만 본다. episodes/ 스캔(책 인물) 섞이지 않게 분리.
  if (isFactionSeries(series ?? '')) {
    const fx = await listFactionEpisodes()
    return fx.map(f => ({ id: f.id, status: f.status as EpisodeStatus, group: '' }))
  }

  const items: EpisodeListItem[] = []
  const seen = new Set<string>()

  // 1. 신구조 — episodes/ 루트 및 그룹 폴더
  for (const hit of scanPersonFoldersSync(EPISODES_DIR)) {
    const ids = await listPersonEpisodes(hit.name, hit.dir)
    if (ids.length === 0) {
      // 작업 시작 안 한 인물 폴더(_status 만 있음) — 기본 ko 식별자로 카드 한 장
      if (!seen.has(hit.name)) {
        seen.add(hit.name)
        items.push({ id: hit.name, status: hit.status, group: hit.group })
      }
      continue
    }
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      items.push({ id, status: hit.status, group: hit.group })
    }
  }

  // 2. 옛 status 폴더 폴백 — 마이그레이션 안 끝난 인물들 (legacy)
  for (const s of STATUSES) {
    const statusDir = path.join(EPISODES_DIR, s)
    let entries
    try { entries = await readdir(statusDir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue
      const personDir = path.join(statusDir, e.name)
      const ids = await listPersonEpisodes(e.name, personDir)
      for (const id of ids) {
        if (seen.has(id)) continue
        seen.add(id)
        items.push({ id, status: s, group: '' })
      }
    }
  }

  // 3. 아카이브 폴더 스캔 — 작업 완료된 인물들 (status: 'done' · group: '_archive')
  try {
    const archivedEntries = await readdir(ARCHIVED_EPISODES_DIR, { withFileTypes: true })
    for (const e of archivedEntries) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue
      const personDir = path.join(ARCHIVED_EPISODES_DIR, e.name)
      const ids = await listPersonEpisodes(e.name, personDir)
      for (const id of ids) {
        if (seen.has(id)) continue
        seen.add(id)
        items.push({ id, status: 'done', group: '_archive' })
      }
    }
  } catch { /* 아카이브 디렉토리가 없으면 무시 */ }

  return items
}

/** Candidate 디렉토리 (public/episodes/pre-todo/) */
function candidatesDir(_series?: string): string {
  return path.join(EPISODES_DIR, 'pre-todo')
}

export async function listCandidates(series: string): Promise<string[]> {
  const dir = candidatesDir(series)
  try {
    const entries = await readdir(dir)
    return entries.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  } catch {
    return []
  }
}

// 신구조(책 단위 분할) 헬퍼 재export — 호출부에서 server-utils 단일 import 로 끝낼 수 있게 한다.
export { isNewLayout, listBookFolders, loadNewLayoutEpisode, saveNewLayoutEpisode } from './episode-new-layout'
export type { SaveScope } from './episode-new-layout'
import { isNewLayout, loadNewLayoutEpisode, saveNewLayoutEpisode, type SaveScope } from './episode-new-layout'

export async function loadCandidate(series: string, name: string) {
  const raw = await readFile(path.join(candidatesDir(series), `${name}.json`), 'utf-8')
  return JSON.parse(raw)
}

export async function promoteCandidate(series: string, name: string) {
  const src = path.join(candidatesDir(series), `${name}.json`)
  const dstDir = path.join(EPISODES_DIR, 'todo', name)
  await mkdir(dstDir, { recursive: true })
  const raw = await readFile(src, 'utf-8')
  await writeFile(path.join(dstDir, 'ko.json'), raw, 'utf-8')
  await unlink(src)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 옵션 2: 외부 쇼츠 파일 로드 — shorts/{locale}-{N}.json 및
 * shorts/{locale}-{N}.timing.json 을 읽어 1-based 오름차순 배열로 반환.
 */
async function loadExternalShorts(episodeDir: string, locale: string): Promise<any[]> {
  const shortsDir = path.join(episodeDir, 'shorts')
  if (!existsSync(shortsDir)) return []
  let files: string[]
  try {
    files = await readdir(shortsDir)
  } catch {
    return []
  }

  const contentRe = new RegExp(`^${locale}-(\\d+)\\.json$`)
  const timingRe = new RegExp(`^${locale}-(\\d+)\\.timing\\.json$`)

  const contents = new Map<number, any>()
  const timings = new Map<number, any>()

  for (const f of files) {
    if (f.endsWith('.timing.json')) {
      const m = f.match(timingRe)
      if (m) {
        try {
          timings.set(parseInt(m[1], 10), JSON.parse(await readFile(path.join(shortsDir, f), 'utf-8')))
        } catch { /* corrupt timing → skip */ }
      }
    } else {
      const m = f.match(contentRe)
      if (m) {
        try {
          contents.set(parseInt(m[1], 10), JSON.parse(await readFile(path.join(shortsDir, f), 'utf-8')))
        } catch { /* corrupt content → skip */ }
      }
    }
  }

  return [...contents.keys()]
    .sort((a, b) => a - b)
    .map((idx) => {
      const c = contents.get(idx)
      const t = timings.get(idx)
      if (!t?.segments || !Array.isArray(c?.segments)) return c
      return {
        ...c,
        segments: c.segments.map((seg: any, i: number) => ({ ...seg, ...(t.segments[i] ?? {}) })),
      }
    })
}

export async function loadEpisode(series: string, name: string) {
  if (isFactionSeries(series)) {
    const { person } = parseEpisodeId(name)
    return loadFactionEpisode(person)
  }
  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  const episodeDir = found ? found.dir : path.join(EPISODES_DIR, 'todo', person)

  // 신구조(책 단위 분할): books/ 폴더가 있으면 분할 파일을 합쳐 한 episode 객체로 반환한다.
  if (isNewLayout(episodeDir)) {
    const merged = await loadNewLayoutEpisode(name)
    // 외부 shorts 파일은 신구조에서는 책 폴더 안 shorts.{locale}.json 으로 이미 흡수됨.
    // 기존 episodes/{person}/shorts/{locale}-N.json 도 있다면 추가 흡수 (이중 호환).
    const extraShorts = await loadExternalShorts(episodeDir, locale)
    if (extraShorts.length > 0) {
      merged.shorts = Array.isArray(merged.shorts) ? [...merged.shorts, ...extraShorts] : extraShorts
    }
    return merged
  }

  // 옛 구조 — {locale}.json + {locale}.timing.json + shorts/{locale}-N.json
  const fp = episodeFilePath(name)
  const raw = await readFile(fp, 'utf-8')
  const content: any = JSON.parse(raw)

  const shortsArr = await loadExternalShorts(episodeDir, locale)
  if (shortsArr.length > 0) content.shorts = shortsArr

  const tp = timingFilePath(name)
  let timing: Record<string, unknown> | null = null
  try {
    const tRaw = await readFile(tp, 'utf-8')
    timing = JSON.parse(tRaw)
  } catch { /* timing 파일 없으면 content만 반환 */ }

  return mergeEpisodeFiles(content, timing)
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 옵션 2: 외부 쇼츠 파일로 저장 — shorts/{locale}-{N}.json 쓰기.
 * segment.duration은 {locale}-{N}.timing.json으로 분리.
 * 입력 배열보다 작아진 경우 잉여 파일을 정리한다.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function saveShorts(_series: string, name: string, shortsArr: any[]) {
  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  const baseDir = found ? found.dir : path.join(EPISODES_DIR, 'todo', person)
  const shortsDir = path.join(baseDir, 'shorts')
  await mkdir(shortsDir, { recursive: true })

  const contentRe = new RegExp(`^${locale}-(\\d+)\\.json$`)
  let existingFiles: string[] = []
  try {
    existingFiles = (await readdir(shortsDir)).filter(f => contentRe.test(f))
  } catch { /* empty */ }

  const writtenFiles = new Set<string>()
  for (let i = 0; i < shortsArr.length; i++) {
    const idx = i + 1 // 1-based
    const fileName = `${locale}-${idx}.json`
    writtenFiles.add(fileName)

    const shortsContent = JSON.parse(JSON.stringify(shortsArr[i]))
    const segDurations: Array<Record<string, unknown>> = []
    if (Array.isArray(shortsContent.segments)) {
      shortsContent.segments.forEach((s: any) => {
        const d: Record<string, unknown> = {}
        if (s.duration != null) { d.duration = s.duration; delete s.duration }
        segDurations.push(d)
      })
    }

    await writeFile(path.join(shortsDir, fileName), JSON.stringify(shortsContent, null, 2) + '\n', 'utf-8')

    // 타이밍 파일 (segment duration이 하나라도 있을 때만)
    const timingFile = `${locale}-${idx}.timing.json`
    const timingPath = path.join(shortsDir, timingFile)
    if (segDurations.some(d => Object.keys(d).length > 0)) {
      let existing: any = {}
      if (existsSync(timingPath)) {
        try { existing = JSON.parse(await readFile(timingPath, 'utf-8')) } catch { /* ignore */ }
      }
      existing.segments = segDurations
      await writeFile(timingPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8')
    }
  }

  // 잉여 파일 정리 — 새 배열에 없으면 content + timing 모두 제거
  for (const ef of existingFiles) {
    if (!writtenFiles.has(ef)) {
      await unlink(path.join(shortsDir, ef)).catch(() => {})
      const timingFile = ef.replace(/\.json$/, '.timing.json')
      await unlink(path.join(shortsDir, timingFile)).catch(() => {})
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function saveEpisode(series: string, name: string, data: unknown, scope: SaveScope = 'all', bookIndices?: number[]) {
  if (isFactionSeries(series)) {
    const { person } = parseEpisodeId(name)
    await saveFactionEpisode(person, data as FactionScript)
    return
  }
  // 신구조: meta + 책별 + 쇼츠별 파일을 한꺼번에 분해 저장. 외부 shorts/{locale}-N.json 폴백 경로는 사용 안 함.
  const { person } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (found && isNewLayout(found.dir)) {
    await saveNewLayoutEpisode(name, data, scope, bookIndices)
    return
  }

  // 레거시 통짜 구조 — scope 에 맞춰 본문(meta+books)·쇼츠를 선택 기록
  const writeMainContent = scope === 'all' || scope === 'longform'
  const writeShortsPart = scope === 'all' || scope === 'shorts'

  if (writeMainContent) {
    const fp = episodeFilePath(name)
    await mkdir(path.dirname(fp), { recursive: true })

    // content와 timing을 분리해 각각 {locale}.json / {locale}.timing.json에 저장.
    // 프론트는 loadEpisode의 merge 결과(= timing.json 전체 포함)를 유지한 채 PUT하므로
    // SYNC 모드의 수동 교정이 유실되지 않도록 timing도 덮어써 기록한다.
    const { content, timing } = splitEpisodeData(data)
    await writeFile(fp, JSON.stringify(content, null, 2) + '\n', 'utf-8')

    if (timing && Object.keys(timing).length > 0) {
      const tp = timingFilePath(name)
      await mkdir(path.dirname(tp), { recursive: true })
      await writeFile(tp, JSON.stringify(timing, null, 2) + '\n', 'utf-8')
    }
  }

  // 옵션 2: 쇼츠는 외부 파일로 분리 저장
  if (writeShortsPart) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalShorts = (data as any)?.shorts
    if (Array.isArray(originalShorts) && originalShorts.length > 0) {
      await saveShorts(series, name, originalShorts)
    } else if (originalShorts && !Array.isArray(originalShorts)) {
      // 유예 호환: 객체로 들어온 경우 1-based 단일 배열로 취급
      await saveShorts(series, name, [originalShorts])
    }
  }
}

/** 인물 폴더를 물리적으로 다른 상태 폴더로 이동 */
export async function moveEpisode(person: string, toStatus: EpisodeStatus): Promise<void> {
  const found = findEpisodeDir(person)
  if (!found) throw new Error(`episode not found: ${person}`)
  if (found.status === toStatus) return
  const dst = path.join(EPISODES_DIR, toStatus, person)
  await mkdir(path.dirname(dst), { recursive: true })
  await rename(found.dir, dst)
}

/** episode의 현재 상태를 반환 */
export function getEpisodeStatus(personOrId: string): EpisodeStatus | null {
  const found = findEpisodeDir(personOrId)
  return found ? found.status : null
}

export async function scanLocalWavs(episodeName: string): Promise<{ relPath: string; absPath: string; size: number }[]> {
  const baseDir = voiceDir(episodeName)
  const results: { relPath: string; absPath: string; size: number }[] = []
  async function walk(dir: string, prefix: string) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'node_modules') {
        await walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name)
      } else if (e.isFile() && e.name.endsWith('.wav')) {
        const abs = path.join(dir, e.name)
        const s = await stat(abs)
        const rel = prefix ? `${prefix}/${e.name}` : e.name
        results.push({ relPath: rel, absPath: abs, size: s.size })
      }
    }
  }
  await walk(baseDir, '')

  // 공통 음성 파일 포함 (common/voice/{locale}/)
  const { locale } = parseEpisodeId(episodeName)
  const commonDir = path.join(COMMON_VOICE_DIR, locale)
  try {
    const entries = await readdir(commonDir, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.wav')) continue
      const abs = path.join(commonDir, e.name)
      const s = await stat(abs)
      const seen = results.some(r => r.relPath.endsWith('/' + e.name) || r.relPath === e.name)
      if (!seen) results.push({ relPath: `common/${e.name}`, absPath: abs, size: s.size })
    }
  } catch { /* common dir may not exist */ }

  return results
}


// --- Task Queue (globalThis로 dev HMR 생존) ---
export type TaskStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'
export type Task = { id: string; type: string; series: string; episode: string; status: TaskStatus; log: string[]; startedAt: string; finishedAt?: string }

const g = globalThis as unknown as {
  __tasks?: Map<string, Task>
  __taskCounter?: number
  __uploadQueue?: { task: Task; args: string[] }[]
  __uploadRunning?: boolean
  __childProcesses?: Map<string, ChildProcess>
}
if (!g.__tasks) g.__tasks = new Map()
if (!g.__taskCounter) g.__taskCounter = 0
if (!g.__uploadQueue) g.__uploadQueue = []
if (g.__uploadRunning == null) g.__uploadRunning = false
if (!g.__childProcesses) g.__childProcesses = new Map()
const tasks = g.__tasks
function nextTaskId() { return ++g.__taskCounter! }

export function getTasks(limit = 20): Task[] {
  return [...tasks.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id)
}

/** 즉시 실행 태스크 (렌더 등 — 기존 동작) */
export function runTask(type: string, series: string, episode: string, args: string[]): Task {
  const id = `${type}-${nextTaskId()}`
  const task: Task = { id, type, series, episode, status: 'running', log: [], startedAt: new Date().toISOString() }
  tasks.set(id, task)
  spawnTask(task, args)
  return task
}

/** FIFO 업로드 큐 — 한 번에 하나, 누른 순서대로 */
export function queueTask(type: string, series: string, episode: string, args: string[]): Task {
  const id = `${type}-${nextTaskId()}`
  const queuePos = g.__uploadQueue!.length + (g.__uploadRunning ? 1 : 0)
  const task: Task = { id, type, series, episode, status: 'queued', log: [], startedAt: new Date().toISOString() }
  if (queuePos > 0) task.log.push(`[queue] 대기 ${queuePos}번째`)
  tasks.set(id, task)
  g.__uploadQueue!.push({ task, args })
  drainUploadQueue()
  return task
}

function drainUploadQueue() {
  if (g.__uploadRunning || g.__uploadQueue!.length === 0) return
  const { task, args } = g.__uploadQueue!.shift()!
  g.__uploadRunning = true
  task.status = 'running'
  task.log.push(`[queue] 시작`)
  spawnTask(task, args, () => {
    g.__uploadRunning = false
    drainUploadQueue()
  })
}

function spawnTask(task: Task, args: string[], onDone?: () => void) {
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const child = spawn(cmd, args, { cwd: REMOTION_ROOT, shell: true })
  g.__childProcesses!.set(task.id, child)

  child.stdout?.on('data', (d: Buffer) => {
    task.log.push(...d.toString().split('\n').filter(Boolean))
  })
  child.stderr?.on('data', (d: Buffer) => {
    task.log.push(...d.toString().split('\n').filter(Boolean))
  })
  child.on('close', (code) => {
    g.__childProcesses!.delete(task.id)
    if (task.status !== 'cancelled') {
      task.status = code === 0 ? 'done' : 'error'
    }
    task.finishedAt = new Date().toISOString()
    onDone?.()
  })
  child.on('error', (err) => {
    g.__childProcesses!.delete(task.id)
    if (task.status !== 'cancelled') {
      task.status = 'error'
      task.log.push(`Error: ${err.message}`)
    }
    task.finishedAt = new Date().toISOString()
    onDone?.()
  })
}

export function cancelTask(id: string): boolean {
  const task = tasks.get(id)
  if (!task) return false
  if (task.status !== 'queued' && task.status !== 'running') return false

  task.status = 'cancelled'
  task.finishedAt = new Date().toISOString()
  task.log.push('[cancelled] 사용자 중단')

  // 큐에서 제거 (queued 상태)
  const qIdx = g.__uploadQueue!.findIndex(q => q.task.id === id)
  if (qIdx >= 0) g.__uploadQueue!.splice(qIdx, 1)

  // 실행 중이면 프로세스 종료 — 자식 트리까지(pnpm → node → remotion-cli → chrome)
  const child = g.__childProcesses!.get(id)
  if (child) {
    killProcessTree(child)
    g.__childProcesses!.delete(id)
    g.__uploadRunning = false
    drainUploadQueue()
  }

  return true
}

/**
 * 프로세스를 자식 트리까지 강제 종료한다.
 *
 * `child.kill()`은 spawn한 최상위 셸(Windows: cmd.exe)만 죽인다. 렌더는
 * pnpm → node → remotion-cli → chrome-headless-shell 로 손자·증손자가 이어져
 * 셸만 죽이면 나머지가 고아로 살아남아 CPU·메모리를 계속 점유한다.
 *   - Windows: `taskkill /PID <pid> /T /F` 로 트리 전체 종료(/T = 자식 포함).
 *     인자를 배열로 넘기므로 한국어 로케일 파싱 문제 없음.
 *   - POSIX: 프로세스 그룹(-pid) 전체에 SIGKILL.
 */
function killProcessTree(child: ChildProcess) {
  if (child.pid == null) { child.kill('SIGKILL'); return }
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'])
  } else {
    try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
  }
}

export function toPascal(name: string) {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

/** 파일 버퍼 헤더에서 오디오 길이(초) 계산 — WAV / MP3 자동 판별.
 *  WAV: byte rate로 정확 계산. MP3: 첫 프레임 CBR 기반 추정. */
export function getAudioDuration(buf: Buffer, fileSize: number): number {
  if (buf.length >= 44 && buf.slice(0, 4).toString('ascii') === 'RIFF') {
    const byteRate = buf.readUInt32LE(28)
    if (byteRate > 0) return +((fileSize - 44) / byteRate).toFixed(2)
  }
  // MP3 — ID3v2 태그 건너뛰고 첫 프레임 bitrate 추출
  let offset = 0
  if (buf.length > 10 && buf.slice(0, 3).toString('ascii') === 'ID3') {
    const tagSize = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]
    offset = 10 + tagSize
  }
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
  while (offset < buf.length - 4) {
    if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) {
      const br = bitrates[(buf[offset + 2] >> 4) & 0x0F]
      if (br > 0) return +((fileSize - offset) / (br * 125)).toFixed(2)
      break
    }
    offset++
  }
  return 0
}

// --- Voice Storage (load/unload archive) ---

type VoiceStorageStatus = 'loaded' | 'unloaded' | 'partial' | 'none'

export type VoiceEpisodeStorage = {
  name: string
  status: VoiceStorageStatus
  fileCount: number
  sizeBytes: number
  sizeLabel: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function dirStats(dir: string): Promise<{ fileCount: number; sizeBytes: number }> {
  let fileCount = 0
  let sizeBytes = 0
  async function walk(d: string) {
    let entries
    try { entries = await readdir(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) { await walk(full) }
      else if (e.isFile()) {
        fileCount++
        try { sizeBytes += (await stat(full)).size } catch { /* skip */ }
      }
    }
  }
  await walk(dir)
  return { fileCount, sizeBytes }
}

/** voice 디렉토리가 있는 에피소드를 스캔하여 episode ID 목록 반환 (3단 구조) */
async function collectVoiceEpisodeIds(): Promise<string[]> {
  const ids: string[] = []
  for (const s of STATUSES) {
    const statusDir = path.join(EPISODES_DIR, s)
    let persons
    try { persons = await readdir(statusDir, { withFileTypes: true }) } catch { continue }
    for (const p of persons) {
      if (!p.isDirectory() || p.name.startsWith('_')) continue
      const voiceBase = path.join(statusDir, p.name, 'voice')
      let locales
      try { locales = await readdir(voiceBase, { withFileTypes: true }) } catch { continue }
      for (const loc of locales) {
        if (!loc.isDirectory()) continue
        const locName = loc.name
        if (locName !== 'ko' && locName !== 'en') continue
        const id = locName === 'en' ? `${p.name}-en` : p.name
        ids.push(id)
      }
    }
  }
  return ids.sort()
}

export async function getVoiceStorageStatus(): Promise<{
  episodes: VoiceEpisodeStorage[]
  totalLoaded: { count: number; sizeBytes: number; sizeLabel: string }
  totalArchived: { count: number; sizeBytes: number; sizeLabel: string }
}> {
  const namesSet = new Set<string>()

  // public/episodes/{person}/voice/{locale}/ 스캔
  const voiceIds = await collectVoiceEpisodeIds()
  for (const id of voiceIds) namesSet.add(id)

  // voice-archive 에피소드들 (기존 episode-name 형태)
  try {
    const entries = await readdir(VOICE_ARCHIVE, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) namesSet.add(e.name)
    }
  } catch { /* empty */ }

  const names = [...namesSet].sort()
  const episodes: VoiceEpisodeStorage[] = []
  let totalLoaded = { count: 0, sizeBytes: 0 }
  let totalArchived = { count: 0, sizeBytes: 0 }

  await Promise.all(names.map(async (name) => {
    const loadedDir = voiceDir(name)
    const archivedDir = path.join(VOICE_ARCHIVE, name)

    const [loaded, archived] = await Promise.all([
      dirStats(loadedDir),
      dirStats(archivedDir),
    ])

    let status: VoiceStorageStatus
    if (loaded.fileCount > 0 && archived.fileCount > 0) status = 'partial'
    else if (loaded.fileCount > 0) status = 'loaded'
    else if (archived.fileCount > 0) status = 'unloaded'
    else status = 'none'

    const fileCount = loaded.fileCount + archived.fileCount
    const sizeBytes = loaded.sizeBytes + archived.sizeBytes

    episodes.push({ name, status, fileCount, sizeBytes, sizeLabel: formatSize(sizeBytes) })

    totalLoaded.count += loaded.fileCount
    totalLoaded.sizeBytes += loaded.sizeBytes
    totalArchived.count += archived.fileCount
    totalArchived.sizeBytes += archived.sizeBytes
  }))

  episodes.sort((a, b) => a.name.localeCompare(b.name))

  return {
    episodes,
    totalLoaded: { ...totalLoaded, sizeLabel: formatSize(totalLoaded.sizeBytes) },
    totalArchived: { ...totalArchived, sizeLabel: formatSize(totalArchived.sizeBytes) },
  }
}

export async function unloadVoiceFiles(episodeNames: string[]): Promise<string[]> {
  const results: string[] = []
  for (const name of episodeNames) {
    const src = voiceDir(name)
    const dst = path.join(VOICE_ARCHIVE, name)
    try {
      await stat(src)
    } catch {
      results.push(`${name}: skipped (not loaded)`)
      continue
    }
    await mkdir(dst, { recursive: true })
    await cp(src, dst, { recursive: true })
    await rm(src, { recursive: true, force: true })
    results.push(`${name}: unloaded`)
  }
  return results
}

export async function loadVoiceFiles(episodeNames: string[]): Promise<string[]> {
  const results: string[] = []
  for (const name of episodeNames) {
    const src = path.join(VOICE_ARCHIVE, name)
    const dst = voiceDir(name)
    try {
      await stat(src)
    } catch {
      results.push(`${name}: skipped (not archived)`)
      continue
    }
    await mkdir(dst, { recursive: true })
    await cp(src, dst, { recursive: true })
    await rm(src, { recursive: true, force: true })
    results.push(`${name}: loaded`)
  }
  return results
}

// --- Episode content/timing 분리·병합 ---

const NARRATOR_DURATION_KEYS = [
  'serviceGreetingDuration', 'serviceIntroDuration', 'celebIntroDuration',
  'bridgeDuration', 'outroDuration', 'labelSummaryDuration', 'labelContextDuration',
  'returnIntroDuration', 'prevRecapDuration', 'interludeDuration',
] as const

const HOST_DURATION_KEYS = ['featuredQuoteDuration', 'voiceDuration'] as const

const BOOK_DURATION_KEYS = [
  'titleDuration', 'summaryDuration', 'contextDuration',
] as const

/* eslint-disable @typescript-eslint/no-explicit-any */
function mergeEpisodeFiles(content: any, timing: any): any {
  if (!timing || Object.keys(timing).length === 0) return content
  // 옵션 2: shorts는 외부 파일에서 이미 주입됨 (segments[].duration 포함).
  // 본체 timing.json은 더 이상 shorts 블록을 관리하지 않는다.
  return {
    ...content,
    voiceTimings: timing.voiceTimings ?? content.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books?.map((b: any, i: number) => {
      const tb = timing.books?.[i] ?? {}
      const merged = { ...b, ...tb }
      // quotePairDurations → quotePairs 내부에 병합
      if (tb.quotePairDurations && merged.quotePairs) {
        merged.quotePairs = merged.quotePairs.map((p: any, pi: number) => ({
          ...p, ...(tb.quotePairDurations[pi] ?? {}),
        }))
        delete merged.quotePairDurations
      }
      return merged
    }),
    shorts: content.shorts,
  }
}

function splitEpisodeData(data: unknown): { content: any; timing: any } {
  const timing: any = {}
  const content = JSON.parse(JSON.stringify(data))

  // voiceTimings
  if (content.voiceTimings) {
    timing.voiceTimings = content.voiceTimings
    delete content.voiceTimings
  }

  // narrator duration fields
  const nd: any = {}
  for (const k of NARRATOR_DURATION_KEYS) {
    if (content.narrator?.[k] != null) { nd[k] = content.narrator[k]; delete content.narrator[k] }
  }
  if (Object.keys(nd).length > 0) timing.narrator = nd

  // host duration fields
  const hd: any = {}
  for (const k of HOST_DURATION_KEYS) {
    if (content.host?.[k] != null) { hd[k] = content.host[k]; delete content.host[k] }
  }
  if (Object.keys(hd).length > 0) timing.host = hd

  // books duration fields
  if (content.books) {
    const bd = content.books.map((b: any) => {
      const d: any = {}
      for (const k of BOOK_DURATION_KEYS) {
        if (b[k] != null) { d[k] = b[k]; delete b[k] }
      }
      // quotePairs 내부 duration 분리
      if (b.quotePairs?.length) {
        d.quotePairDurations = b.quotePairs.map((p: any) => {
          const pd: any = {}
          if (p.quoteDuration != null) { pd.quoteDuration = p.quoteDuration; delete p.quoteDuration }
          if (p.afterDuration != null) { pd.afterDuration = p.afterDuration; delete p.afterDuration }
          return pd
        })
      }
      return d
    })
    if (bd.some((d: any) => Object.keys(d).length > 0)) timing.books = bd
  }

  // 옵션 2: shorts는 외부 파일(shorts/{locale}-{N}.json)로 분리 저장.
  // 본체 저장 시 shorts 필드는 배제한다. 외부 파일 쓰기는 saveShorts 전담.
  if (content.shorts !== undefined) delete content.shorts

  return { content, timing }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
