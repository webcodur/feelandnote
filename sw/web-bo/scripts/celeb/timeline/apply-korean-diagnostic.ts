/**
 * 국문 진단을 통과한 기존 연표의 title·description만 라이브 DB에 반영한다.
 *
 * 원본 out 파일과 현재 DB가 사건별로 같고, 진단본이 국문 두 필드 외에는 원본을 보존한 경우에만
 * 쓴다. 전체 사전 검사를 통과한 뒤 원본을 백업하고, 쓰기나 왕복 검증이 실패하면 원본을 복구한다.
 *
 * pnpm exec tsx scripts/celeb/timeline/apply-korean-diagnostic.ts --dry
 * pnpm exec tsx scripts/celeb/timeline/apply-korean-diagnostic.ts --apply
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { REPO_ROOT } from '../../lib/paths'

function argOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase 환경변수가 없다')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type CandidateEvent = {
  year: number | null
  year_end: number | null
  title: string
  title_en: string
  description: string
  description_en: string
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
}

type StoredEvent = CandidateEvent & {
  id: string
  celeb_id: string
  sequence_label: string | null
  sequence_label_en: string | null
  source: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

type DiagnosticFile = {
  slug: string
  events: CandidateEvent[]
  korean_prose_review?: {
    status?: string
    changed_indices?: number[]
  }
}

type OriginalFile = {
  slug: string
  events: CandidateEvent[]
}

type PreparedProfile = {
  slug: string
  celebId: string
  original: CandidateEvent[]
  diagnostic: CandidateEvent[]
  stored: StoredEvent[]
  changedRows: StoredEvent[]
}

const diagnosticDir = resolve(argOf('diagnostic-dir') ??
  resolve(REPO_ROOT, 'data/celeb/timeline-life-rewrite/korean-diagnostic'))
const originalDir = resolve(argOf('original-dir') ??
  resolve(process.cwd(), '.tmp-celeb-timeline-grok/life-rewrite/out'))
const backupFile = resolve(argOf('backup') ??
  resolve(REPO_ROOT, 'data/celeb/timeline-life-rewrite/db-before-korean-prose-update.json'))
const reportFile = resolve(argOf('report') ??
  resolve(REPO_ROOT, 'data/celeb/timeline-life-rewrite/db-korean-prose-update-result.json'))
// 국문 진단 뒤 별도 표본 감사에서 사실·사건 선정 문제가 확인됐다. 현재 진단본에는 그 결과가
// 합쳐지지 않았으므로 이번 중간 반영에서 무조건 제외한다.
const excludedSlugs = new Set([
  'carrie-anne-moss',
  'baek-mun-oh',
  ...(argOf('exclude-slugs') ?? '').split(',').map((slug) => slug.trim()).filter(Boolean),
])
const apply = process.argv.includes('--apply')
const dry = process.argv.includes('--dry')

if (apply === dry) throw new Error('--dry 또는 --apply 중 하나만 지정한다')

function text(value: unknown): string | null {
  return value == null ? null : String(value)
}

function number(value: unknown): number | null {
  return value == null ? null : Number(value)
}

function candidateFromStored(event: StoredEvent): CandidateEvent {
  return {
    year: number(event.year),
    year_end: number(event.year_end),
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: text(event.place_name),
    place_name_en: text(event.place_name_en),
    lat: number(event.lat),
    lng: number(event.lng),
  }
}

function coordinatesMatch(left: number | null, right: number | null): boolean {
  if (left == null || right == null) return left == null && right == null
  return Math.abs(left - right) <= 0.000001
}

function eventsMatch(left: CandidateEvent, right: CandidateEvent, includeKorean: boolean): boolean {
  return left.year === right.year &&
    left.year_end === right.year_end &&
    (!includeKorean || left.title === right.title) &&
    left.title_en === right.title_en &&
    (!includeKorean || left.description === right.description) &&
    left.description_en === right.description_en &&
    left.kind === right.kind &&
    left.place_name === right.place_name &&
    left.place_name_en === right.place_name_en &&
    coordinatesMatch(left.lat, right.lat) &&
    coordinatesMatch(left.lng, right.lng)
}

function updatePayload(event: StoredEvent) {
  return {
    id: event.id,
    celeb_id: event.celeb_id,
    year: event.year,
    year_end: event.year_end,
    sequence_label: event.sequence_label,
    sequence_label_en: event.sequence_label_en,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: event.place_name,
    place_name_en: event.place_name_en,
    lat: event.lat,
    lng: event.lng,
    source: event.source,
    sort_order: event.sort_order,
  }
}

async function fetchStoredEvents(celebId: string): Promise<StoredEvent[]> {
  const { data, error } = await supabase
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', celebId)
    .order('sort_order')
    .order('id')
  if (error) throw new Error(`연표 조회 실패: ${error.message}`)
  return (data ?? []) as StoredEvent[]
}

async function mapCelebIds(slugs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (let offset = 0; offset < slugs.length; offset += 80) {
    const batch = slugs.slice(offset, offset + 80)
    const { data, error } = await supabase
      .from('celebs')
      .select('id,slug,celeb_tier,publication_status')
      .in('slug', batch)
    if (error) throw new Error(`인물 조회 실패: ${error.message}`)
    for (const celeb of data ?? []) {
      if (celeb.publication_status !== 'active' || celeb.celeb_tier === 'fiction') {
        throw new Error(`${celeb.slug}: 활성 실존 인물이 아니다`)
      }
      map.set(celeb.slug, celeb.id)
    }
  }
  return map
}

async function prepare(): Promise<{
  profiles: PreparedProfile[]
  statusHeld: string[]
  explicitHeld: string[]
}> {
  if (!existsSync(diagnosticDir)) throw new Error(`진단 폴더가 없다: ${diagnosticDir}`)
  if (!existsSync(originalDir)) throw new Error(`원본 폴더가 없다: ${originalDir}`)

  const names = (await readdir(diagnosticDir)).filter((name) => name.endsWith('.json')).sort()
  const selected: Array<{ diagnostic: DiagnosticFile; original: OriginalFile }> = []
  const statusHeld: string[] = []
  const explicitHeld: string[] = []
  const seen = new Set<string>()

  for (const name of names) {
    const diagnostic = JSON.parse(readFileSync(resolve(diagnosticDir, name), 'utf8')) as DiagnosticFile
    if (!diagnostic.slug || seen.has(diagnostic.slug)) throw new Error(`${name}: slug가 없거나 중복이다`)
    seen.add(diagnostic.slug)
    if (excludedSlugs.has(diagnostic.slug)) {
      explicitHeld.push(diagnostic.slug)
      continue
    }
    if (diagnostic.korean_prose_review?.status !== 'revised') {
      statusHeld.push(diagnostic.slug)
      continue
    }
    const originalPath = resolve(originalDir, `${diagnostic.slug}.json`)
    if (!existsSync(originalPath)) throw new Error(`${diagnostic.slug}: 원본 out 파일이 없다`)
    const original = JSON.parse(readFileSync(originalPath, 'utf8')) as OriginalFile
    if (original.slug !== diagnostic.slug || !Array.isArray(original.events) || !Array.isArray(diagnostic.events) ||
      original.events.length !== diagnostic.events.length || original.events.length === 0) {
      throw new Error(`${diagnostic.slug}: 원본과 진단본 사건 배열이 맞지 않는다`)
    }
    for (let index = 0; index < original.events.length; index++) {
      if (!eventsMatch(original.events[index], diagnostic.events[index], false)) {
        throw new Error(`${diagnostic.slug} index=${index}: 진단본이 국문 두 필드 외 값을 바꿨다`)
      }
    }
    selected.push({ diagnostic, original })
  }

  const ids = await mapCelebIds(selected.map(({ diagnostic }) => diagnostic.slug))
  const profiles: PreparedProfile[] = []
  for (const { diagnostic, original } of selected) {
    const celebId = ids.get(diagnostic.slug)
    if (!celebId) throw new Error(`${diagnostic.slug}: DB 인물을 찾지 못했다`)
    const stored = await fetchStoredEvents(celebId)
    if (stored.length !== original.events.length) {
      throw new Error(`${diagnostic.slug}: DB ${stored.length}건, 원본 ${original.events.length}건으로 수가 다르다`)
    }
    const changedRows: StoredEvent[] = []
    for (let index = 0; index < stored.length; index++) {
      const current = candidateFromStored(stored[index])
      if (!eventsMatch(current, original.events[index], true)) {
        throw new Error(`${diagnostic.slug} index=${index}: 현재 DB가 반영 전 원본과 다르다`)
      }
      const target = diagnostic.events[index]
      if (current.title !== target.title || current.description !== target.description) {
        changedRows.push({ ...stored[index], title: target.title, description: target.description })
      }
    }
    profiles.push({ slug: diagnostic.slug, celebId, original: original.events, diagnostic: diagnostic.events,
      stored, changedRows })
  }
  return { profiles, statusHeld, explicitHeld }
}

async function upsertRows(rows: StoredEvent[]) {
  for (let offset = 0; offset < rows.length; offset += 200) {
    const batch = rows.slice(offset, offset + 200).map(updatePayload)
    const { data, error } = await supabase
      .from('celeb_timeline_events')
      .upsert(batch, { onConflict: 'id' })
      .select('id')
    if (error) throw new Error(`DB 저장 실패: ${error.message}`)
    if ((data ?? []).length !== batch.length) throw new Error(`DB 저장 왕복 수 불일치: ${batch.length} → ${data?.length ?? 0}`)
  }
}

async function verify(profiles: PreparedProfile[]) {
  for (const profile of profiles) {
    const stored = await fetchStoredEvents(profile.celebId)
    if (stored.length !== profile.diagnostic.length) throw new Error(`${profile.slug}: 반영 후 사건 수 불일치`)
    for (let index = 0; index < stored.length; index++) {
      if (!eventsMatch(candidateFromStored(stored[index]), profile.diagnostic[index], true)) {
        throw new Error(`${profile.slug} index=${index}: 반영 후 DB와 진단본이 다르다`)
      }
    }
  }
}

async function main() {
  const { profiles, statusHeld, explicitHeld } = await prepare()
  const changedProfiles = profiles.filter((profile) => profile.changedRows.length > 0)
  const changedRows = changedProfiles.flatMap((profile) => profile.changedRows)
  const eventCount = profiles.reduce((sum, profile) => sum + profile.stored.length, 0)

  console.log(JSON.stringify({
    mode: dry ? 'dry' : 'apply',
    selected_profiles: profiles.length,
    selected_events: eventCount,
    changed_profiles: changedProfiles.length,
    changed_events: changedRows.length,
    held_by_status: statusHeld.length,
    explicitly_held: explicitHeld,
  }, null, 2))
  if (dry) return
  if (existsSync(backupFile) || existsSync(reportFile)) {
    throw new Error(`백업 또는 결과 파일이 이미 있다. 덮어쓰지 않는다: ${backupFile}, ${reportFile}`)
  }

  mkdirSync(resolve(backupFile, '..'), { recursive: true })
  writeFileSync(backupFile, JSON.stringify({
    purpose: '국문 중간 개선 반영 전 DB 원본. title·description 롤백에 사용한다.',
    selection: { status: 'revised', excluded_slugs: [...excludedSlugs].sort() },
    profiles: profiles.map((profile) => ({
      slug: profile.slug,
      celeb_id: profile.celebId,
      events: profile.stored,
    })),
  }, null, 1), 'utf8')

  try {
    await upsertRows(changedRows)
    await verify(profiles)
  } catch (error) {
    console.error(`반영 실패. ${changedRows.length}개 원본 행을 복구한다.`)
    await upsertRows(changedProfiles.flatMap((profile) => profile.stored.filter((event) =>
      profile.changedRows.some((changed) => changed.id === event.id))))
    throw error
  }

  writeFileSync(reportFile, JSON.stringify({
    status: 'applied_and_verified',
    quality: 'intermediate_korean_prose_update',
    profiles: profiles.map((profile) => ({
      slug: profile.slug,
      celeb_id: profile.celebId,
      event_count: profile.stored.length,
      changed_event_count: profile.changedRows.length,
    })),
    totals: {
      updated_profiles: changedProfiles.length,
      verified_profiles: profiles.length,
      verified_events: eventCount,
      updated_events: changedRows.length,
      held_by_status: statusHeld.length,
      explicitly_held: explicitHeld,
    },
  }, null, 1), 'utf8')
  console.log(`반영·왕복 검증 완료. 백업: ${backupFile}, 결과: ${reportFile}`)
}

main().catch((error) => { console.error(error); process.exit(1) })
