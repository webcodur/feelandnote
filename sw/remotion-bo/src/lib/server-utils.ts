import { readFile, readdir, stat, writeFile, mkdir, unlink, cp, rm, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import path from 'path'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const EPISODES_DIR = path.join(REMOTION_ROOT, 'public', 'episodes')
const COMMON_VOICE_DIR = path.join(REMOTION_ROOT, 'public', 'common', 'voice')
export const VOICE_ARCHIVE = path.join(REMOTION_ROOT, 'voice-archive')

/** export — API 라우트에서 직접 사용 */
export { EPISODES_DIR, COMMON_VOICE_DIR }

// --- 3단 상태 폴더 ---
const STATUSES = ['todo', 'live', 'done'] as const
export type EpisodeStatus = (typeof STATUSES)[number]

/**
 * Episode ID ↔ person/locale 변환
 *
 *   elon-musk      → person: elon-musk,  locale: ko
 *   elon-musk-en   → person: elon-musk,  locale: en
 *   elon-musk-2    → person: elon-musk,  locale: ko-2
 *   elon-musk-2-en → person: elon-musk,  locale: en-2
 */
export function parseEpisodeId(episodeId: string): { person: string; locale: string } {
  const isEn = episodeId.endsWith('-en')
  const base = isEn ? episodeId.slice(0, -3) : episodeId
  const partMatch = base.match(/-(\d+)$/)
  const person = partMatch ? base.slice(0, -partMatch[0].length) : base
  const part = partMatch ? parseInt(partMatch[1]) : 1
  const locale = isEn ? 'en' : 'ko'
  return { person, locale: part > 1 ? `${locale}-${part}` : locale }
}

/** person 이름(또는 episode ID)으로 상태 폴더를 찾는다 */
export function findEpisodeDir(personOrId: string): { status: EpisodeStatus; dir: string } | null {
  const { person } = parseEpisodeId(personOrId)
  for (const s of STATUSES) {
    const dir = path.join(EPISODES_DIR, s, person)
    if (existsSync(dir)) return { status: s, dir }
  }
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
  const match = base.match(/^(ko|en)(?:-(\d+))?$/)
  if (!match) return personDir
  const [, locale, part] = match
  let id = personDir
  if (part) id += `-${part}`
  if (locale === 'en') id += '-en'
  return id
}

export type EpisodeListItem = { id: string; status: EpisodeStatus }

export async function listEpisodes(_series?: string): Promise<EpisodeListItem[]> {
  const items: EpisodeListItem[] = []
  for (const s of STATUSES) {
    const statusDir = path.join(EPISODES_DIR, s)
    let entries
    try { entries = await readdir(statusDir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue
      const personDir = path.join(statusDir, e.name)
      const files = await readdir(personDir)
      for (const f of files) {
        if (f.endsWith('.json')) items.push({ id: buildEpisodeId(e.name, f), status: s })
      }
    }
  }
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

export async function loadEpisode(_series: string, name: string) {
  const fp = episodeFilePath(name)
  const raw = await readFile(fp, 'utf-8')
  return JSON.parse(raw)
}

export async function saveEpisode(_series: string, name: string, data: unknown) {
  const fp = episodeFilePath(name)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
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
  return results
}


// --- Task Queue (globalThis로 dev HMR 생존) ---
export type TaskStatus = 'queued' | 'running' | 'done' | 'error'
export type Task = { id: string; type: string; series: string; episode: string; status: TaskStatus; log: string[]; startedAt: string; finishedAt?: string }

const g = globalThis as unknown as {
  __tasks?: Map<string, Task>
  __taskCounter?: number
  __uploadQueue?: { task: Task; args: string[] }[]
  __uploadRunning?: boolean
}
if (!g.__tasks) g.__tasks = new Map()
if (!g.__taskCounter) g.__taskCounter = 0
if (!g.__uploadQueue) g.__uploadQueue = []
if (g.__uploadRunning == null) g.__uploadRunning = false
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

  child.stdout?.on('data', (d: Buffer) => {
    task.log.push(...d.toString().split('\n').filter(Boolean))
  })
  child.stderr?.on('data', (d: Buffer) => {
    task.log.push(...d.toString().split('\n').filter(Boolean))
  })
  child.on('close', (code) => {
    task.status = code === 0 ? 'done' : 'error'
    task.finishedAt = new Date().toISOString()
    onDone?.()
  })
  child.on('error', (err) => {
    task.status = 'error'
    task.log.push(`Error: ${err.message}`)
    task.finishedAt = new Date().toISOString()
    onDone?.()
  })
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
        const match = locName.match(/^(ko|en)(?:-(\d+))?$/)
        if (!match) continue
        const [, lang, part] = match
        let id = p.name
        if (part) id += `-${part}`
        if (lang === 'en') id += '-en'
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
