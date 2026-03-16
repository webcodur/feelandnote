import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { createHash } from 'crypto'
import { DEFAULT_SERIES } from './series-registry'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const EPISODES_BASE = path.join(REMOTION_ROOT, 'episodes')
export const VOICE_DIR = path.join(REMOTION_ROOT, 'public', 'voice')

/** 시리즈별 에피소드 디렉토리 */
function episodesDir(series: string): string {
  return path.join(EPISODES_BASE, series)
}

export async function listEpisodes(series: string = DEFAULT_SERIES.id): Promise<string[]> {
  const dir = episodesDir(series)
  try {
    const entries = await readdir(dir)
    return entries.filter(f => f.endsWith('.json') && f !== 'lineup.json').map(f => f.replace('.json', ''))
  } catch {
    return []
  }
}

export async function loadEpisode(series: string, name: string) {
  const raw = await readFile(path.join(episodesDir(series), `${name}.json`), 'utf-8')
  return JSON.parse(raw)
}

export async function saveEpisode(series: string, name: string, data: unknown) {
  const dir = episodesDir(series)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export async function scanLocalWavs(episodeName: string): Promise<{ relPath: string; absPath: string; size: number }[]> {
  const baseDir = path.join(VOICE_DIR, episodeName)
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

type R2Manifest = Record<string, { hash: string; size: number; uploadedAt: string }>
export async function loadR2Manifest(ep: string): Promise<R2Manifest> {
  try {
    const raw = await readFile(path.join(VOICE_DIR, ep, 'r2-manifest.json'), 'utf-8')
    return JSON.parse(raw)
  } catch { return {} }
}

export function fileHash(buf: Buffer): string {
  return createHash('md5').update(buf).digest('hex')
}

// --- Task Queue ---
export type TaskStatus = 'running' | 'done' | 'error'
export type Task = { id: string; type: string; series: string; episode: string; status: TaskStatus; log: string[]; startedAt: string; finishedAt?: string }
const tasks = new Map<string, Task>()
let taskCounter = 0

export function getTasks(limit = 20): Task[] {
  return [...tasks.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id)
}

export function runTask(type: string, series: string, episode: string, args: string[]): Task {
  const id = `${type}-${++taskCounter}`
  const task: Task = { id, type, series, episode, status: 'running', log: [], startedAt: new Date().toISOString() }
  tasks.set(id, task)

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
  })
  child.on('error', (err) => {
    task.status = 'error'
    task.log.push(`Error: ${err.message}`)
    task.finishedAt = new Date().toISOString()
  })

  return task
}

export function toPascal(name: string) {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}
