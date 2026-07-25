/**
 * faction/lib.ts — 팩션 DB 이관 도구 공용 부품
 *
 * env 로딩 · service role 클라이언트 · 에피소드 폴더 스캔 · CLI 인자 파싱.
 * import/export/verify 세 스크립트가 공유한다.
 *
 * ⚠ 이 폴더의 스크립트는 sw/remotion/tsconfig.json 의 include(["src","episodes"]) 밖이다.
 *   `npx tsc --noEmit` 으로는 검사되지 않으므로 컴파일러 옵션을 직접 줘서 따로 검사한다.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** sw/remotion 루트 */
export const ROOT = path.join(__dirname, '..', '..')
export const FACTIONS_DIR = path.join(ROOT, 'public', 'factions')

/**
 * 에피소드가 아닌 폴더 — 문서·캐스팅표·보류·아이디어 뱅크.
 * faction-data.json 유무로도 걸러지지만, 의도를 코드에 남긴다.
 */
export const NON_EPISODE_DIRS = new Set([
  '_docs',
  '_voice-casting',
  'not-using',
  'world-best-2026',
])

/* ────────────────────────── env ────────────────────────── */

/**
 * .env 를 읽어 process.env 에 채운다(이미 있는 값은 덮지 않는다).
 * ⚠ CRLF 파일의 `\r` 을 제거한다 — 안 하면 키 끝에 \r 이 붙어 인증이 조용히 실패한다.
 */
function loadEnvFile(p: string): void {
  if (!existsSync(p)) return
  for (const rawLine of readFileSync(p, 'utf-8').split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    const val = m[2].trim().replace(/^["']|["']$/g, '').replace(/\r/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

/** remotion-bo → web 순으로 env 를 찾는다(둘 다 SUPABASE_SERVICE_ROLE_KEY 를 갖는다) */
export function loadEnv(): void {
  loadEnvFile(path.join(ROOT, '..', 'remotion-bo', '.env'))
  loadEnvFile(path.join(ROOT, '..', 'web', '.env'))
}

/** service role 클라이언트 — RLS 우회. 조용한 폴백 금지: 키가 없으면 즉시 던진다. */
export function adminClient(): SupabaseClient {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL 없음 (sw/remotion-bo/.env 또는 sw/web/.env 확인)')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 없음 (sw/remotion-bo/.env 또는 sw/web/.env 확인)')
  return createClient(url, key, { auth: { persistSession: false } })
}

/* ────────────────────────── 에피소드 스캔 ────────────────────────── */

export interface EpisodeFolder {
  /** 폴더명 = faction_episodes.folder (고유키) */
  folder: string
  dir: string
  dataPath: string
  /** _status.json 의 status (없으면 'todo') */
  status: string
  /** _episodes.json 에 실린 편 = 서비스 등록분 */
  registered: boolean
  /** _episodes.json 순서(1-based). 미등록은 0 */
  sortOrder: number
}

/** _episodes.json — 서비스에 등록된 에피소드 목록(순서 = 편성 순서) */
function loadRegistered(): string[] {
  const p = path.join(FACTIONS_DIR, '_episodes.json')
  if (!existsSync(p)) return []
  return JSON.parse(readFileSync(p, 'utf-8')) as string[]
}

/** faction-data.json 을 가진 폴더 전부를 스캔한다 */
export function scanEpisodes(): EpisodeFolder[] {
  const registered = loadRegistered()
  const out: EpisodeFolder[] = []
  for (const name of readdirSync(FACTIONS_DIR)) {
    if (NON_EPISODE_DIRS.has(name)) continue
    const dir = path.join(FACTIONS_DIR, name)
    if (!statSync(dir).isDirectory()) continue
    const dataPath = path.join(dir, 'faction-data.json')
    if (!existsSync(dataPath)) continue

    let status = 'todo'
    const statusPath = path.join(dir, '_status.json')
    if (existsSync(statusPath)) {
      try {
        const s = JSON.parse(readFileSync(statusPath, 'utf-8')) as { status?: string }
        if (s.status) status = s.status
      } catch {
        throw new Error(`_status.json 파싱 실패: ${statusPath}`)
      }
    }
    const idx = registered.indexOf(name)
    out.push({
      folder: name,
      dir,
      dataPath,
      status,
      registered: idx >= 0,
      sortOrder: idx >= 0 ? idx + 1 : 0,
    })
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder))
}

/** faction-data.json 을 원문 그대로 읽는다(가공 없음, utf8) */
export function readFactionData(dataPath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(dataPath, 'utf-8')) as Record<string, unknown>
}

/** comment.p<N>.txt — 편별 유튜브 고정 댓글 원고 */
export function readEpisodeParts(dir: string): { part: number; comment: string }[] {
  const out: { part: number; comment: string }[] = []
  for (const fn of readdirSync(dir)) {
    const m = fn.match(/^comment\.p(\d+)\.txt$/)
    if (!m) continue
    out.push({ part: Number(m[1]), comment: readFileSync(path.join(dir, fn), 'utf-8') })
  }
  return out.sort((a, b) => a.part - b.part)
}

/* ────────────────────────── CLI ────────────────────────── */

export interface CliArgs {
  episodes: string[]
  all: boolean
  dryRun: boolean
  stdout: boolean
}

/**
 * `--episode <folder>` (반복 가능) | `--all` 을 파싱한다.
 * 둘 중 하나는 반드시 있어야 한다 — 실수로 전량을 건드리는 일을 막는다.
 */
export function parseArgs(argv: string[], usage: string): CliArgs {
  const args = argv.slice(2)
  const episodes: string[] = []
  let all = false
  let dryRun = false
  let stdout = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--') continue
    if (a === '--episode') {
      const v = args[++i]
      if (!v || v.startsWith('--')) throw new Error('--episode 뒤에 폴더명이 필요하다')
      episodes.push(v)
    } else if (a === '--all') all = true
    else if (a === '--dry-run') dryRun = true
    else if (a === '--stdout') stdout = true
    else throw new Error(`알 수 없는 인자: ${a}\n${usage}`)
  }
  if (!all && episodes.length === 0) throw new Error(`--episode <폴더명> 또는 --all 이 필요하다\n${usage}`)
  return { episodes, all, dryRun, stdout }
}

/** CLI 인자로 대상 에피소드를 고른다 */
export function selectEpisodes(args: CliArgs): EpisodeFolder[] {
  const all = scanEpisodes()
  if (args.all) return all
  const byFolder = new Map(all.map(e => [e.folder, e]))
  return args.episodes.map(f => {
    const e = byFolder.get(f)
    if (!e) throw new Error(`에피소드 폴더 없음: ${f} (가능: ${all.map(x => x.folder).join(', ')})`)
    return e
  })
}

/** 진행 표시용 — 고정폭 라벨 */
export const pad = (s: string, n: number) => s.length >= n ? s : s + ' '.repeat(n - s.length)
