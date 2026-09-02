/**
 * Kiro 본체·내장 서브에이전트가 완성한 실존 인물 타임라인 후보를 검증하고 DB에 반영한다.
 * 외부 모델이나 모델 CLI를 import·호출하지 않는다.
 *
 * pnpm exec tsx scripts/celeb/timeline/apply-native-candidates.ts --root <candidate-root> --slugs a,b --dry
 * pnpm exec tsx scripts/celeb/timeline/apply-native-candidates.ts --root <candidate-root> --slugs a,b --apply
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

type CandidateEvent = {
  year: number | null
  year_end: number | null
  sequence_label?: string | null
  sequence_label_en?: string | null
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

type StoredTimelineEvent = CandidateEvent & {
  id: string
  celeb_id: string
  source: string
  sort_order: number
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

type CandidateEvidence = {
  index: number
  action?: string
  judgment: string
  source_urls: string[]
}

type NativeCandidate = {
  slug: string
  celeb_id: string
  before_events: StoredTimelineEvent[]
  event_origins: Array<string | null>
  events: CandidateEvent[]
  evidence: CandidateEvidence[]
  quality_notes: Record<string, unknown>
}

const ALLOWED_KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish', 'battle', 'travel', 'office', 'meeting', 'other',
])
const MIN_EVIDENCE_HOSTS = 2

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

if (!process.env.NEXT_PUBLIC_DB_API_URL || !process.env.DB_SECRET_KEY) {
  throw new Error('DB 환경변수가 없다')
}

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL,
  process.env.DB_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function hashValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function rawFingerprint(events: StoredTimelineEvent[]): string {
  return hashValue(events)
}

function fingerprint(events: StoredTimelineEvent[]): string {
  return hashValue(events.map(({ updated_at: _updatedAt, ...event }) => event))
}

function sourceHost(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.hostname.toLowerCase().replace(/^www\./, '')
      : null
  } catch {
    return null
  }
}

function distinctSourceHosts(urls: string[]): number {
  return new Set(urls.map(sourceHost).filter(Boolean)).size
}

function normalizedEvent(event: CandidateEvent) {
  return {
    year: event.year ?? null,
    year_end: event.year_end ?? null,
    sequence_label: event.sequence_label ?? null,
    sequence_label_en: event.sequence_label_en ?? null,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: event.place_name ?? null,
    place_name_en: event.place_name_en ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
  }
}

function finalPayload(event: Record<string, unknown>) {
  return {
    year: event.year ?? null,
    year_end: event.year_end ?? null,
    sequence_label: event.sequence_label ?? null,
    sequence_label_en: event.sequence_label_en ?? null,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: event.place_name ?? null,
    place_name_en: event.place_name_en ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    source: event.source,
    sort_order: event.sort_order,
  }
}

function validateEvent(event: CandidateEvent, index: number): string[] {
  const errors: string[] = []
  if (!event || typeof event !== 'object') return [`index=${index} 사건 객체 없음`]
  if (!event.title?.trim()) errors.push(`index=${index} 국문 제목 없음`)
  if (!event.title_en?.trim()) errors.push(`index=${index} 영문 제목 없음`)
  if (!event.description?.trim()) errors.push(`index=${index} 국문 서술 없음`)
  if (!event.description_en?.trim()) errors.push(`index=${index} 영문 서술 없음`)
  if (!(event.year === null || Number.isInteger(event.year))) errors.push(`index=${index} year 형식 오류`)
  if (!(event.year_end === null || Number.isInteger(event.year_end))) errors.push(`index=${index} year_end 형식 오류`)
  if (event.year === 0 || event.year_end === 0) errors.push(`index=${index} 역사 연도 0 금지`)
  if (event.year !== null && event.year_end !== null && event.year_end < event.year) {
    errors.push(`index=${index} year_end가 year보다 앞섬`)
  }
  if (!ALLOWED_KINDS.has(event.kind)) errors.push(`index=${index} kind=${event.kind} 허용 안 됨`)
  const placeKo = event.place_name === null || typeof event.place_name === 'string'
  const placeEn = event.place_name_en === null || typeof event.place_name_en === 'string'
  if (!placeKo || !placeEn) errors.push(`index=${index} 장소명 형식 오류`)
  const latOk = event.lat === null || (typeof event.lat === 'number' && Number.isFinite(event.lat) && event.lat >= -90 && event.lat <= 90)
  const lngOk = event.lng === null || (typeof event.lng === 'number' && Number.isFinite(event.lng) && event.lng >= -180 && event.lng <= 180)
  if (!latOk || !lngOk) errors.push(`index=${index} 좌표 범위 오류`)
  if ((event.lat === null) !== (event.lng === null)) errors.push(`index=${index} 좌표 짝 깨짐`)
  if ((!event.place_name || !event.place_name_en) && (event.lat !== null || event.lng !== null)) {
    errors.push(`index=${index} 국·영문 장소명 없이 좌표 존재`)
  }
  return errors
}

function validateCandidate(candidate: NativeCandidate): string[] {
  const errors: string[] = []
  if (!candidate.slug?.trim()) errors.push('slug 없음')
  if (!candidate.celeb_id?.trim()) errors.push('celeb_id 없음')
  if (!Array.isArray(candidate.before_events)) errors.push('before_events 없음')
  if (!Array.isArray(candidate.events) || candidate.events.length === 0) errors.push('events 없음')
  if (!Array.isArray(candidate.event_origins) || candidate.event_origins.length !== candidate.events.length) {
    errors.push('event_origins와 events 길이 불일치')
  }
  if (!Array.isArray(candidate.evidence) || candidate.evidence.length !== candidate.events.length) {
    errors.push('evidence와 events 길이 불일치')
  }
  if (!candidate.quality_notes || typeof candidate.quality_notes !== 'object') errors.push('quality_notes 없음')
  candidate.events?.forEach((event, index) => errors.push(...validateEvent(event, index)))

  const evidenceIndices = new Set<number>()
  for (const [order, evidence] of (candidate.evidence ?? []).entries()) {
    if (!Number.isInteger(evidence.index) || evidence.index < 0 || evidence.index >= candidate.events.length ||
      evidenceIndices.has(evidence.index)) {
      errors.push(`evidence[${order}] index 오류`)
      continue
    }
    evidenceIndices.add(evidence.index)
    if (!evidence.judgment?.trim()) errors.push(`evidence index=${evidence.index} 판단 없음`)
    if (distinctSourceHosts(evidence.source_urls ?? []) < MIN_EVIDENCE_HOSTS) {
      errors.push(`evidence index=${evidence.index} 독립 출처 도메인 ${distinctSourceHosts(evidence.source_urls ?? [])}곳`)
    }
  }

  const beforeIds = new Set(candidate.before_events.map((event) => event.id))
  const origins = candidate.event_origins.filter((id): id is string => id !== null)
  const originIds = new Set(origins)
  if (origins.length !== originIds.size) errors.push('기존 origin ID 중복')
  if (beforeIds.size !== candidate.before_events.length) errors.push('before_events ID 중복')
  if (originIds.size !== beforeIds.size || [...beforeIds].some((id) => !originIds.has(id))) {
    errors.push('현재 DB 행 ID를 빠뜨리거나 알 수 없는 origin ID 포함')
  }
  return errors
}

async function fetchStoredEvents(celebId: string): Promise<StoredTimelineEvent[]> {
  const { data, error } = await db
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', celebId)
    .order('sort_order')
    .order('id')
  if (error) throw new Error(`기존 연표 조회 실패: ${error.message}`)
  return (data ?? []) as StoredTimelineEvent[]
}

function storageRows(candidate: NativeCandidate) {
  const coordinate = (value: number | null) => value === null ? null : Number(value.toPrecision(15))
  return candidate.events.map((raw, index) => {
    const event = normalizedEvent(raw)
    return {
      celeb_id: candidate.celeb_id,
      ...event,
      lat: coordinate(event.lat),
      lng: coordinate(event.lng),
      source: 'manual',
      sort_order: (index + 1) * 10,
    }
  })
}

function restoreRows(events: StoredTimelineEvent[]) {
  return events.map((event) => ({
    id: event.id,
    celeb_id: event.celeb_id,
    ...finalPayload(event),
  }))
}

async function rollback(beforeEvents: StoredTimelineEvent[], insertedIds: string[]) {
  if (insertedIds.length > 0) {
    const { error } = await db.from('celeb_timeline_events').delete().in('id', insertedIds)
    if (error) throw new Error(`추가 행 제거 실패: ${error.message}`)
  }
  if (beforeEvents.length > 0) {
    const { error } = await db
      .from('celeb_timeline_events')
      .upsert(restoreRows(beforeEvents), { onConflict: 'id' })
    if (error) throw new Error(`기존 행 복구 실패: ${error.message}`)
  }
}

async function applyCandidate(candidate: NativeCandidate, dry: boolean, root: string) {
  const errors = validateCandidate(candidate)
  if (errors.length > 0) throw new Error(`${candidate.slug}: 후보 검증 실패\n- ${errors.join('\n- ')}`)

  const appliedDir = resolve(root, 'applied')
  const appliedFile = resolve(appliedDir, `${candidate.slug}.json`)
  if (!dry && existsSync(appliedFile)) throw new Error(`${candidate.slug}: applied 파일이 이미 있음`)

  const current = await fetchStoredEvents(candidate.celeb_id)
  const expectedBefore = fingerprint(candidate.before_events)
  const actualBefore = fingerprint(current)
  if (actualBefore !== expectedBefore) {
    throw new Error(`${candidate.slug}: 후보 작성 뒤 라이브 DB가 바뀜 (${expectedBefore} → ${actualBefore})`)
  }

  const rows = storageRows(candidate)
  const existingRows = rows.flatMap((row, index) => {
    const id = candidate.event_origins[index]
    return id ? [{ id, ...row }] : []
  })
  const newRows = rows.filter((_, index) => candidate.event_origins[index] === null)
  if (dry) {
    console.log(`READY ${candidate.slug} — 기존 ${existingRows.length}행 ID 보존 UPDATE + 신규 ${newRows.length}행 INSERT`)
    return
  }

  const backupDir = resolve(root, 'backups')
  mkdirSync(backupDir, { recursive: true })
  const backupFingerprint = rawFingerprint(candidate.before_events)
  const backupFile = resolve(backupDir, `${candidate.slug}-${backupFingerprint}.json`)
  if (!existsSync(backupFile)) {
    writeFileSync(backupFile, JSON.stringify({
      slug: candidate.slug,
      celeb_id: candidate.celeb_id,
      fingerprint: backupFingerprint,
      events: current,
    }, null, 1), 'utf8')
  }

  let insertedIds: string[] = []
  try {
    if (existingRows.length > 0) {
      const { error } = await db
        .from('celeb_timeline_events')
        .upsert(existingRows, { onConflict: 'id' })
      if (error) throw new Error(`기존 행 UPDATE 실패: ${error.message}`)
    }
    if (newRows.length > 0) {
      const { data, error } = await db
        .from('celeb_timeline_events')
        .insert(newRows)
        .select('id')
      if (error || !data) throw new Error(`신규 행 INSERT 실패: ${error?.message ?? '응답 없음'}`)
      insertedIds = data.map((row) => row.id)
    }

    const after = await fetchStoredEvents(candidate.celeb_id)
    const actualPayload = after.map((event) => finalPayload(event))
    const expectedPayload = rows.map((event) => finalPayload(event))
    if (JSON.stringify(actualPayload) !== JSON.stringify(expectedPayload)) {
      throw new Error('DB readback payload가 후보와 다름')
    }

    const afterIds = new Set(after.map((event) => event.id))
    const expectedIds = new Set([...candidate.event_origins.filter((id): id is string => id !== null), ...insertedIds])
    if (afterIds.size !== expectedIds.size || [...expectedIds].some((id) => !afterIds.has(id))) {
      throw new Error('DB readback 행 ID 집합이 반영 계획과 다름')
    }
  } catch (writeError) {
    try {
      await rollback(current, insertedIds)
    } catch (rollbackError) {
      throw new Error(`CRITICAL ${candidate.slug}: 반영 실패 뒤 원본 복구도 실패: ${(writeError as Error).message}; ${(rollbackError as Error).message}`)
    }
    throw new Error(`${candidate.slug}: ${(writeError as Error).message}; 원본 복구 완료`)
  }

  mkdirSync(appliedDir, { recursive: true })
  const sourceFile = resolve(root, candidate.slug, 'candidate.json')
  renameSync(sourceFile, appliedFile)
  console.log(`OK ${candidate.slug} — 기존 ${existingRows.length}행 ID 보존, 신규 ${newRows.length}행 추가, payload·ID readback 완료`)
}

async function main() {
  const root = resolve(argOf('root') ?? '.tmp-celeb-timeline-agent')
  const slugs = (argOf('slugs') ?? '').split(',').map((slug) => slug.trim()).filter(Boolean)
  const dry = process.argv.includes('--dry')
  const apply = process.argv.includes('--apply')
  if (dry === apply) throw new Error('--dry 또는 --apply 중 하나만 지정한다')
  if (slugs.length === 0) throw new Error('--slugs가 필요하다')

  for (const slug of slugs) {
    const file = resolve(root, slug, 'candidate.json')
    if (!existsSync(file)) throw new Error(`${slug}: 후보 파일이 없다: ${file}`)
    const candidate = JSON.parse(readFileSync(file, 'utf8')) as NativeCandidate
    if (candidate.slug !== slug) throw new Error(`${slug}: 파일 slug가 ${candidate.slug}다`)
    await applyCandidate(candidate, dry, root)
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
