import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import {
  argOf,
  connectDb,
  HEADLINE_REVIEW_VERSION,
  hasFlag,
  ledgerPath,
  parseLane,
  readLedger,
  type LedgerEntry,
  LANE_COUNT,
} from './lib'

/**
 * celebs 변경은 인물마다 UUID/slug 태그 2개를 만든다. 운영 DB 트리거가 태그를
 * 200개씩 웹훅으로 보내므로 100행이면 SQL 문장 하나가 웹훅 한 묶음에 대응한다.
 * 레인별 청크라 DB 성공 뒤 원장 파일 하나만 원자적으로 체크포인트하면 된다.
 */
export const APPLY_CHUNK_SIZE = 100
/** 100명은 공개 URL 최대 300개가 되므로 다음 pg_net/Cloudflare 작업 전 숨 돌릴 간격을 둔다. */
export const APPLY_CHUNK_PAUSE_MS = 1_500

export type HeadlinePatch = {
  id: string
  headline: string
  headline_en: string
}

export type HeadlineRow = {
  id: string
  headline: string | null
  headline_en: string | null
}

export type HeadlineStore = {
  read(ids: string[]): Promise<HeadlineRow[]>
  update(patches: HeadlinePatch[]): Promise<void>
}

export type ManagementSqlExecutor = (
  query: string,
  parameters: unknown[],
) => Promise<unknown>

export const UPDATE_HEADLINES_SQL = `
with desired as (
  select
    input.id::uuid as id,
    input.headline,
    input.headline_en
  from jsonb_to_recordset($1::jsonb) as input(
    id text,
    headline text,
    headline_en text
  )
)
update public.celebs as celeb
set
  headline = desired.headline,
  headline_en = desired.headline_en
from desired
where celeb.id = desired.id
  and (celeb.headline, celeb.headline_en)
    is distinct from (desired.headline, desired.headline_en)
returning celeb.id::text, celeb.headline, celeb.headline_en
`.trim()

type ApplyDependencies = {
  readLane?: (lane: number) => LedgerEntry[]
  checkpointLane?: (lane: number, entries: LedgerEntry[]) => void
  log?: (message: string) => void
  now?: () => string
  pause?: (milliseconds: number) => Promise<void>
}

type PendingEntry = {
  entry: LedgerEntry
  patch: HeadlinePatch
}

type LaneState = {
  lane: number
  entries: LedgerEntry[]
  pending: PendingEntry[]
}

export function chunkItems<T>(items: T[], size = APPLY_CHUNK_SIZE): T[][] {
  if (!Number.isInteger(size) || size <= 0) throw new Error(`잘못된 청크 크기: ${size}`)
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function assertExactRows(
  rows: HeadlineRow[],
  patches: HeadlinePatch[],
  phase: '사전 조회' | '반영 검증',
): Map<string, HeadlineRow> {
  const expectedIds = new Set(patches.map((patch) => patch.id))
  const rowMap = new Map<string, HeadlineRow>()

  for (const row of rows) {
    if (!expectedIds.has(row.id)) throw new Error(`${phase}: 요청하지 않은 인물 ${row.id}`)
    if (rowMap.has(row.id)) throw new Error(`${phase}: 중복 인물 ${row.id}`)
    rowMap.set(row.id, row)
  }

  const missing = patches.filter((patch) => !rowMap.has(patch.id)).map((patch) => patch.id)
  if (missing.length > 0) {
    throw new Error(`${phase}: DB에 없는 인물 ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' 외' : ''}`)
  }
  return rowMap
}

function rowMatches(row: HeadlineRow, patch: HeadlinePatch): boolean {
  return row.headline === patch.headline && row.headline_en === patch.headline_en
}

/**
 * 한 청크를 사전 조회 → 한 UPDATE 문장 → 독립 readback 순으로 처리한다.
 * 이전 실행에서 DB 쓰기만 성공했다면 사전 조회가 같은 값을 찾아 UPDATE를 생략한다.
 */
export async function syncHeadlineChunk(
  store: HeadlineStore,
  patches: HeadlinePatch[],
): Promise<{ changedRows: number }> {
  if (patches.length === 0) return { changedRows: 0 }
  if (patches.length > APPLY_CHUNK_SIZE) {
    throw new Error(`헤드라인 청크가 상한 ${APPLY_CHUNK_SIZE}행을 넘었다: ${patches.length}`)
  }

  const ids = patches.map((patch) => patch.id)
  if (new Set(ids).size !== ids.length) throw new Error('헤드라인 청크에 중복 인물 ID가 있다')

  const before = assertExactRows(await store.read(ids), patches, '사전 조회')
  const changed = patches.filter((patch) => !rowMatches(before.get(patch.id)!, patch))
  if (changed.length > 0) await store.update(changed)

  const after = assertExactRows(await store.read(ids), patches, '반영 검증')
  const mismatched = patches.filter((patch) => !rowMatches(after.get(patch.id)!, patch))
  if (mismatched.length > 0) {
    throw new Error(
      `반영 검증 실패: ${mismatched.slice(0, 5).map((patch) => patch.id).join(', ')}`
      + (mismatched.length > 5 ? ' 외' : ''),
    )
  }

  return { changedRows: changed.length }
}

export function createHeadlineStore(
  db: SupabaseClient,
  executeSql: ManagementSqlExecutor,
): HeadlineStore {
  return {
    async read(ids) {
      const { data, error } = await db
        .from('celebs')
        .select('id, headline, headline_en')
        .in('id', ids)
      if (error) throw new Error(`헤드라인 조회 실패: ${error.message}`)
      return (data ?? []) as HeadlineRow[]
    },
    async update(patches) {
      await executeSql(UPDATE_HEADLINES_SQL, [JSON.stringify(patches)])
    },
  }
}

function sqlLiteral(value: unknown, parameterIndex: number): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`SQL parameter ${parameterIndex} is not finite`)
    return String(value)
  }

  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (text === undefined) throw new Error(`SQL parameter ${parameterIndex} is undefined`)
  let tag = `fn_parameter_${parameterIndex}_`
  while (text.includes(`$${tag}$`)) tag += '_'
  return `$${tag}$${text}$${tag}$`
}

export function bindSqlParameters(query: string, parameters: unknown[]): string {
  const used = new Set<number>()
  const bound = query.replace(/\$(\d+)\b/gu, (_match, rawIndex: string) => {
    const index = Number(rawIndex)
    if (!Number.isSafeInteger(index) || index < 1 || index > parameters.length) {
      throw new Error(`SQL parameter $${rawIndex} is missing`)
    }
    used.add(index)
    return sqlLiteral(parameters[index - 1], index)
  })
  if (used.size !== parameters.length) {
    throw new Error(`SQL received ${parameters.length} parameter(s), but used ${used.size}`)
  }
  return `${bound.trim()}\n`
}

type SelfHostedSqlOptions = {
  host?: string
  sshKey?: string
  container?: string
}

export function createSelfHostedSqlExecutor(
  options: SelfHostedSqlOptions = {},
): ManagementSqlExecutor {
  const host = options.host ?? process.env.FEELANDNOTE_DB_SSH_HOST ?? 'ubuntu@152.67.216.40'
  const sshKey = options.sshKey
    ?? process.env.FEELANDNOTE_DB_SSH_KEY
    ?? path.join(process.env.USERPROFILE ?? '', '.ssh', 'feelandnote_oracle')
  const container = options.container ?? 'supabase-db'
  if (!existsSync(sshKey)) throw new Error(`Oracle DB SSH key is missing: ${sshKey}`)
  if (!/^[a-zA-Z0-9_.@:-]+$/u.test(host)) throw new Error(`Unsafe Oracle DB SSH host: ${host}`)
  if (!/^[a-zA-Z0-9_.-]+$/u.test(container)) throw new Error(`Unsafe DB container: ${container}`)

  return async (query, parameters) => new Promise((resolve, reject) => {
    const child = spawn('ssh', [
      '-i', sshKey,
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=10',
      host,
      'sudo', 'docker', 'exec', '-i', container,
      'psql', '-X', '-qAt', '--single-transaction', '--set', 'ON_ERROR_STOP=1',
      '--username', 'postgres', '--dbname', 'postgres',
    ], { windowsHide: true })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (error) reject(error)
      else resolve(stdout)
    }

    const timeout = setTimeout(() => {
      child.kill()
      finish(new Error('Self-hosted PostgreSQL query timed out after 30 seconds'))
    }, 30_000)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.stderr.on('data', (chunk: string) => { stderr += chunk })
    child.on('error', (error) => finish(error))
    child.on('close', (code) => {
      if (code === 0) finish()
      else finish(new Error(`Self-hosted PostgreSQL query failed (${code}): ${stderr.slice(0, 500)}`))
    })
    child.stdin.end(bindSqlParameters(query, parameters))
  })
}

export function connectSelfHostedSqlExecutor(): ManagementSqlExecutor {
  config({ path: path.resolve(process.cwd(), '../web/.env'), quiet: true })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
  const hostname = new URL(supabaseUrl).hostname
  if (hostname !== 'db.feelandnote.com') {
    throw new Error(`Headline apply requires the self-hosted DB URL: ${hostname}`)
  }
  return createSelfHostedSqlExecutor()
}

export function writeJsonAtomically(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true })
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`,
  )
  let descriptor: number | undefined

  try {
    descriptor = openSync(temp, 'wx')
    writeFileSync(descriptor, JSON.stringify(value, null, 1), 'utf8')
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined
    renameSync(temp, file)
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor)
    rmSync(temp, { force: true })
    throw error
  }
}

export function writeLedgerCheckpoint(lane: number, entries: LedgerEntry[]): void {
  writeJsonAtomically(ledgerPath(lane), entries)
}

function collectLaneStates(
  lanes: number[],
  readLane: (lane: number) => LedgerEntry[],
  log: (message: string) => void,
): LaneState[] {
  const seenIds = new Set<string>()
  return lanes.map((lane) => {
    const entries = readLane(lane)
    const pending: PendingEntry[] = []

    for (const entry of entries) {
      if (
        entry.phase !== 'confirm'
        || entry.reviewVersion !== HEADLINE_REVIEW_VERSION
        || entry.applied
      ) continue
      if (!entry.headline?.trim() || !entry.headline_en?.trim()) {
        log(`건너뜀 ${entry.slug ?? entry.id}: 개편 확정값 중 빈 줄이 있다`)
        continue
      }
      if (seenIds.has(entry.id)) throw new Error(`원장에 중복 인물 ID가 있다: ${entry.id}`)
      seenIds.add(entry.id)
      pending.push({
        entry,
        patch: {
          id: entry.id,
          headline: entry.headline.trim(),
          headline_en: entry.headline_en.trim(),
        },
      })
    }

    return { lane, entries, pending }
  })
}

export async function runHeadlineApply(
  lanes: number[],
  write: boolean,
  store?: HeadlineStore,
  dependencies: ApplyDependencies = {},
): Promise<{ would: number; wrote: number; changedRows: number }> {
  const readLane = dependencies.readLane ?? readLedger
  const checkpointLane = dependencies.checkpointLane ?? writeLedgerCheckpoint
  const log = dependencies.log ?? console.log
  const now = dependencies.now ?? (() => new Date().toISOString())
  const pause = dependencies.pause ?? ((milliseconds) => new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  }))
  const laneStates = collectLaneStates(lanes, readLane, log)
  const would = laneStates.reduce((sum, state) => sum + state.pending.length, 0)

  if (!write) {
    for (const state of laneStates) {
      for (const item of state.pending) {
        log(`[dry] ${item.entry.slug ?? item.entry.id} ${item.patch.headline}`)
      }
    }
    return { would, wrote: 0, changedRows: 0 }
  }
  if (!store) throw new Error('실제 반영에는 헤드라인 DB 저장소가 필요하다')

  let wrote = 0
  let changedRows = 0
  for (const state of laneStates) {
    const chunks = chunkItems(state.pending)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const result = await syncHeadlineChunk(store, chunk.map((item) => item.patch))

      const appliedAt = now()
      for (const item of chunk) {
        item.entry.applied = true
        item.entry.at = appliedAt
      }
      checkpointLane(state.lane, state.entries)

      wrote += chunk.length
      changedRows += result.changedRows
      log(
        `반영 lane-${String(state.lane).padStart(2, '0')} ${i + 1}/${chunks.length}: `
        + `원장 ${chunk.length}건, DB 변경 ${result.changedRows}건`,
      )
      if (result.changedRows > 0) await pause(APPLY_CHUNK_PAUSE_MS)
    }
  }

  return { would, wrote, changedRows }
}

export async function apply(): Promise<void> {
  const laneArg = argOf('lane')
  const lanes = laneArg === undefined
    ? Array.from({ length: LANE_COUNT }, (_, i) => i)
    : [parseLane(laneArg)]
  const write = hasFlag('apply')
  const store = write
    ? createHeadlineStore(connectDb(), connectSelfHostedSqlExecutor())
    : undefined
  const result = await runHeadlineApply(lanes, write, store)

  if (!write) {
    console.log(`apply dry-run ${result.would}건. DB에는 쓰지 않았다. 반영하려면 --apply`)
    return
  }
  console.log(`apply ${result.wrote}건 체크포인트 완료 (실제 DB 변경 ${result.changedRows}건)`)
}
