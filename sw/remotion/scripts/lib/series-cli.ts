/**
 * series-cli.ts — 시리즈 DB 이관 도구(팩션·담화)의 **시리즈 무관 공용 부품**
 *
 * env 로딩 · service role 클라이언트 · CLI 인자 파싱 · 진행 표시.
 * 시리즈별 lib(`faction/lib.ts`·`discourse/lib.ts`)이 이 모듈을 물고 폴더 스캔만 따로 쥔다.
 *
 * ⚠ 이 폴더의 스크립트는 sw/remotion/tsconfig.json 의 include(["src","episodes"]) 밖이다.
 *   `npx tsc --noEmit` 으로는 검사되지 않으므로 컴파일러 옵션을 직접 줘서 따로 검사한다.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** sw/remotion 루트 */
export const ROOT = path.join(__dirname, '..', '..')

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

/** web-bo → web 순으로 env 를 찾는다(둘 다 SUPABASE_SERVICE_ROLE_KEY 를 갖는다) */
export function loadEnv(): void {
  loadEnvFile(path.join(ROOT, '..', 'web-bo', '.env'))
  loadEnvFile(path.join(ROOT, '..', 'web', '.env'))
}

/** service role 클라이언트 — RLS 우회. 조용한 폴백 금지: 키가 없으면 즉시 던진다. */
export function adminClient(): SupabaseClient {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL 없음 (sw/web-bo/.env 또는 sw/web/.env 확인)')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 없음 (sw/web-bo/.env 또는 sw/web/.env 확인)')
  return createClient(url, key, { auth: { persistSession: false } })
}

/* ────────────────────────── CLI ────────────────────────── */

export interface CliArgs {
  episodes: string[]
  all: boolean
  dryRun: boolean
  stdout: boolean
  /** 손 편집 가드를 무시하고 덮어쓴다(export) */
  force: boolean
  /** 파일 ↔ DB 대조만 하고 쓰지 않는다(verify) */
  drift: boolean
  /** 검증기가 실제로 잡는지 되묻는 반증 시험(verify 전용) */
  falsify: boolean
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
  let force = false
  let drift = false
  let falsify = false
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
    else if (a === '--force') force = true
    else if (a === '--drift') drift = true
    else if (a === '--falsify') falsify = true
    else throw new Error(`알 수 없는 인자: ${a}\n${usage}`)
  }
  if (!all && episodes.length === 0) throw new Error(`--episode <폴더명> 또는 --all 이 필요하다\n${usage}`)
  return { episodes, all, dryRun, stdout, force, drift, falsify }
}

/** CLI 인자로 대상 에피소드를 고른다 — 목록은 시리즈별 스캐너가 준다 */
export function pickEpisodes<T extends { folder: string }>(all: T[], args: CliArgs): T[] {
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
