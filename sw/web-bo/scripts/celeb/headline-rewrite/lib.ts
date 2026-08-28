import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const LANE_COUNT = 20
export const HEADLINE_REVIEW_VERSION = 2
export const ROOT = path.resolve(process.cwd(), '../../data/celeb/headline-rewrite')

export type CelebRow = {
  id: string
  slug: string | null
  nickname: string | null
  headline: string | null
  headline_en: string | null
  title: string | null
  title_en: string | null
  celeb_tier: string | null
  publication_status: string | null
}

export type PackPerson = {
  id: string
  slug: string | null
  nickname: string | null
  title: string | null
  title_en: string | null
  tier: string | null
  status: string | null
}

export type ReviewPerson = {
  id: string
  slug: string | null
  nickname: string | null
  current: {
    headline: string | null
    headline_en: string | null
  }
  previous: {
    phase: LedgerPhase
    headline: string | null
    headline_en: string | null
    reviewVersion: number | null
  } | null
  draftKey: {
    id: string
    slug: string | null
  }
}

export type LedgerPhase = 'draft' | 'confirm' | 'skip'

export type LedgerEntry = {
  id: string
  slug: string | null
  lane: number
  phase: LedgerPhase
  headline: string | null
  headline_en: string | null
  reviewVersion?: number
  applied?: boolean
  at: string
}

export type RecordItem = {
  id: string
  slug?: string | null
  phase?: LedgerPhase
  headline?: string | null
  headline_en?: string | null
}

export function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

export function padLane(lane: number): string {
  return String(lane).padStart(2, '0')
}

/** celebs.id(UUID) MD5 앞 4바이트 % 20. 레인 경계의 유일한 식. */
export function laneOf(id: string): number {
  return createHash('md5').update(id).digest().readUInt32BE(0) % LANE_COUNT
}

export function parseLane(raw: string | undefined): number {
  const lane = Number(raw)
  if (!Number.isInteger(lane) || lane < 0 || lane >= LANE_COUNT) {
    throw new Error(`--lane 은 0~${LANE_COUNT - 1}`)
  }
  return lane
}

export function ledgerPath(lane: number): string {
  return path.join(ROOT, 'ledger', `lane-${padLane(lane)}.json`)
}

export function packPath(lane: number): string {
  return path.join(ROOT, 'packs', `lane-${padLane(lane)}.json`)
}

export function reviewPath(lane: number): string {
  return path.join(ROOT, 'reviews', `lane-${padLane(lane)}.json`)
}

export function readLedger(lane: number): LedgerEntry[] {
  const file = ledgerPath(lane)
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, 'utf8')) as LedgerEntry[]
}

export function writeLedger(lane: number, entries: LedgerEntry[]): void {
  const file = ledgerPath(lane)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(entries, null, 1), 'utf8')
}

export function ledgerIds(lane: number): Set<string> {
  return new Set(readLedger(lane).map((e) => e.id))
}

export function toPack(row: CelebRow): PackPerson {
  return {
    id: row.id,
    slug: row.slug,
    nickname: row.nickname,
    title: row.title,
    title_en: row.title_en,
    tier: row.celeb_tier,
    status: row.publication_status,
  }
}

export function connectDb(): SupabaseClient {
  config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function fetchCelebs(db: SupabaseClient): Promise<CelebRow[]> {
  const out: CelebRow[] = []
  const select =
    'id, slug, nickname, headline, headline_en, title, title_en, celeb_tier, publication_status'
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select(select)
      .neq('publication_status', 'deleted')
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`celebs 조회 실패: ${error.message}`)
    const rows = (data ?? []) as CelebRow[]
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}
