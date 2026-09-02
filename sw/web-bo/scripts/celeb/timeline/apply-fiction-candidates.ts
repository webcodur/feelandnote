/**
 * fiction 타임라인 후보를 검증하고, 기존 ID 보존·명시적 삭제·백업·readback까지 수행한다.
 * 외부 모델이나 모델 CLI를 import·호출하지 않는다.
 *
 * pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root <root> --slugs=achilles --dry
 * pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root <root> --slugs=achilles --apply
 * pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root <root> --slugs=absyrtus --allow-inactive --dry
 * pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root <root> --all-pending --recover
 */

import { randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  FICTION_CANDIDATE_SCHEMA_VERSION,
  assertExplicitInactiveSlugMode,
  candidateEventPayload,
  fetchFictionProfileBySlug,
  fetchStoredTimelineEvents,
  fingerprintStoredEvents,
  fingerprintFictionProfile,
  hashValue,
  loadFictionSourceSnapshot,
  plannedReadbackShape,
  stableStringify,
  timelinePayload,
  timelineReadbackShape,
  validateFictionCandidate,
  type FictionCandidate,
  type FictionSourceSnapshot,
  type StoredTimelineEvent,
  type TimelineWriteRow,
} from './fiction-candidate-contract'

type ApplyJournal = {
  schema_version: 1
  slug: string
  celeb_id: string
  candidate_hash: string
  before_fingerprint: string
  before_events: StoredTimelineEvent[]
  source_snapshot: FictionSourceSnapshot
  publication_status?: 'active' | 'inactive'
  profile_fingerprint?: string
  planned_rows: TimelineWriteRow[]
  retained_ids: string[]
  new_ids: string[]
  deletion_ids: string[]
  event_origins: Array<string | null>
  started_at: string
}

type ApplyReceipt = {
  schema_version: 1
  slug: string
  celeb_id: string
  candidate_hash: string
  before_fingerprint: string
  after_fingerprint: string
  retained_ids: string[]
  new_ids: string[]
  deleted_ids: string[]
  event_ids: Array<{ index: number; id: string; origin_id: string | null }>
  applied_at: string
  completion: 'normal' | 'recovered-after-interruption'
}

function argOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
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

function parseSlugs(): string[] {
  const slugs = (argOf('slugs') ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)
  if (new Set(slugs).size !== slugs.length) throw new Error('--slugs에 중복이 있다')
  return slugs
}

function candidateFile(root: string, slug: string): string {
  return resolve(root, slug, 'candidate.json')
}

function appliedFile(root: string, slug: string): string {
  return resolve(root, 'applied', `${slug}.json`)
}

function journalFile(root: string, slug: string): string {
  return resolve(root, 'transactions', `${slug}.json`)
}

function writeNewJson(file: string, value: unknown) {
  mkdirSync(resolve(file, '..'), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
}

function loadCandidate(root: string, slug: string): FictionCandidate {
  const file = candidateFile(root, slug)
  if (!existsSync(file)) throw new Error(`${slug}: 후보 파일이 없다: ${file}`)
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  const validation = validateFictionCandidate(parsed)
  if (validation.errors.length > 0 || !validation.candidate) {
    throw new Error(`${slug}: 후보 검증 실패\n- ${validation.errors.join('\n- ')}`)
  }
  if (validation.candidate.slug !== slug) {
    throw new Error(`${slug}: 파일 slug가 ${validation.candidate.slug}다`)
  }
  for (const warning of validation.warnings) console.warn(`WARN ${slug}: ${warning}`)
  return validation.candidate
}

function loadJournal(file: string): ApplyJournal {
  let value: unknown
  try {
    value = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`CRITICAL 복구 일지를 읽을 수 없다: ${file}; ${(error as Error).message}`)
  }
  const journal = value as Partial<ApplyJournal>
  if (journal.schema_version !== FICTION_CANDIDATE_SCHEMA_VERSION
    || typeof journal.slug !== 'string'
    || typeof journal.celeb_id !== 'string'
    || typeof journal.candidate_hash !== 'string'
    || typeof journal.before_fingerprint !== 'string'
    || !Array.isArray(journal.before_events)
    || !Array.isArray(journal.planned_rows)
    || !Array.isArray(journal.retained_ids)
    || !Array.isArray(journal.new_ids)
    || !Array.isArray(journal.deletion_ids)
    || !Array.isArray(journal.event_origins)) {
    throw new Error(`CRITICAL 복구 일지 형식이 잘못됐다: ${file}`)
  }
  if (fingerprintStoredEvents(journal.before_events) !== journal.before_fingerprint) {
    throw new Error(`CRITICAL 복구 일지의 원본 지문이 깨졌다: ${file}`)
  }
  if (journal.publication_status !== undefined
    && journal.publication_status !== 'active'
    && journal.publication_status !== 'inactive') {
    throw new Error(`CRITICAL 복구 일지의 공개 상태가 잘못됐다: ${file}`)
  }
  if ((journal.publication_status === 'inactive')
    && (typeof journal.profile_fingerprint !== 'string' || !journal.profile_fingerprint)) {
    throw new Error(`CRITICAL inactive 복구 일지에 인물 지문이 없다: ${file}`)
  }
  const complete = journal as ApplyJournal
  const uniqueIds = (label: string, values: unknown[]): Set<string> => {
    if (values.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new Error(`CRITICAL recovery journal ${label} contains an empty ID: ${file}`)
    }
    const ids = new Set(values as string[])
    if (ids.size !== values.length) {
      throw new Error(`CRITICAL recovery journal ${label} contains duplicate IDs: ${file}`)
    }
    return ids
  }
  const beforeIds = uniqueIds('before_events', complete.before_events.map((event) => event.id))
  const plannedIds = uniqueIds('planned_rows', complete.planned_rows.map((row) => row.id))
  const retainedIds = uniqueIds('retained_ids', complete.retained_ids)
  const newIds = uniqueIds('new_ids', complete.new_ids)
  const deletionIds = uniqueIds('deletion_ids', complete.deletion_ids)
  if (complete.before_events.some((event) => event.celeb_id !== complete.celeb_id)
    || complete.planned_rows.some((row) => row.celeb_id !== complete.celeb_id)) {
    throw new Error(`CRITICAL recovery journal mixes timeline owners: ${file}`)
  }
  if (complete.event_origins.length !== complete.planned_rows.length) {
    throw new Error(`CRITICAL recovery journal event_origins length mismatch: ${file}`)
  }
  const partition = new Set([...retainedIds, ...newIds])
  if (partition.size !== retainedIds.size + newIds.size
    || partition.size !== plannedIds.size
    || [...plannedIds].some((id) => !partition.has(id))) {
    throw new Error(`CRITICAL recovery journal retained/new IDs do not partition planned rows: ${file}`)
  }
  if ([...retainedIds].some((id) => !beforeIds.has(id))
    || [...newIds].some((id) => beforeIds.has(id))
    || [...deletionIds].some((id) => !beforeIds.has(id) || retainedIds.has(id))) {
    throw new Error(`CRITICAL recovery journal before/retained/new/deletion IDs disagree: ${file}`)
  }
  const beforePartition = new Set([...retainedIds, ...deletionIds])
  if (beforePartition.size !== retainedIds.size + deletionIds.size
    || beforePartition.size !== beforeIds.size
    || [...beforeIds].some((id) => !beforePartition.has(id))) {
    throw new Error(`CRITICAL recovery journal retained/deletion IDs do not partition before events: ${file}`)
  }
  complete.planned_rows.forEach((row, index) => {
    const origin = complete.event_origins[index]
    if (origin === null) {
      if (!newIds.has(row.id)) {
        throw new Error(`CRITICAL recovery journal new row origin mismatch: ${file}`)
      }
      return
    }
    if (typeof origin !== 'string' || row.id !== origin || !retainedIds.has(row.id)) {
      throw new Error(`CRITICAL recovery journal retained row origin mismatch: ${file}`)
    }
  })
  return complete
}

function sameShape(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right)
}

function restoreRows(events: StoredTimelineEvent[]) {
  return events.map((event) => ({
    id: event.id,
    celeb_id: event.celeb_id,
    ...timelinePayload(event),
    ...(event.created_at ? { created_at: event.created_at } : {}),
  }))
}

async function deleteKnownIds(celebId: string, ids: string[]) {
  for (let start = 0; start < ids.length; start += 100) {
    const { error } = await db
      .from('celeb_timeline_events')
      .delete()
      .eq('celeb_id', celebId)
      .in('id', ids.slice(start, start + 100))
    if (error) throw new Error(`신규 행 제거 실패: ${error.message}`)
  }
}

async function rollbackJournal(journal: ApplyJournal) {
  await deleteKnownIds(journal.celeb_id, journal.new_ids)
  if (journal.before_events.length > 0) {
    const { error } = await db
      .from('celeb_timeline_events')
      .upsert(restoreRows(journal.before_events), { onConflict: 'id' })
    if (error) throw new Error(`원본 행 복구 실패: ${error.message}`)
  }
  const restored = await fetchStoredTimelineEvents(db, journal.celeb_id)
  if (!sameShape(timelineReadbackShape(restored), timelineReadbackShape(journal.before_events))) {
    throw new Error('복구 readback이 원본과 다름')
  }
}

function archiveJournal(root: string, file: string, journal: ApplyJournal, status: string) {
  const history = resolve(root, 'transactions', 'history')
  mkdirSync(history, { recursive: true })
  renameSync(file, resolve(history, `${journal.slug}-${status}-${Date.now()}.json`))
}

function verifyCandidateArtifact(file: string, candidateHash: string, label: string) {
  const value = JSON.parse(readFileSync(file, 'utf8'))
  if (hashValue(value) !== candidateHash) {
    throw new Error(`CRITICAL ${label} 후보 내용이 복구 일지와 다르다: ${file}`)
  }
}

function writeReceipt(root: string, journal: ApplyJournal, completion: ApplyReceipt['completion']) {
  const receipt: ApplyReceipt = {
    schema_version: FICTION_CANDIDATE_SCHEMA_VERSION,
    slug: journal.slug,
    celeb_id: journal.celeb_id,
    candidate_hash: journal.candidate_hash,
    before_fingerprint: journal.before_fingerprint,
    after_fingerprint: hashValue(plannedReadbackShape(journal.planned_rows)),
    retained_ids: journal.retained_ids,
    new_ids: journal.new_ids,
    deleted_ids: journal.deletion_ids,
    event_ids: journal.planned_rows.map((row, index) => ({
      index,
      id: row.id,
      origin_id: journal.event_origins[index],
    })),
    applied_at: new Date().toISOString(),
    completion,
  }
  const file = resolve(root, 'receipts', `${journal.slug}.json`)
  if (existsSync(file)) {
    const previous = JSON.parse(readFileSync(file, 'utf8')) as ApplyReceipt
    if (previous.candidate_hash !== receipt.candidate_hash
      || previous.after_fingerprint !== receipt.after_fingerprint) {
      throw new Error(`CRITICAL ${journal.slug}: 기존 receipt가 다른 반영을 가리킨다`)
    }
    return
  }
  writeNewJson(file, receipt)
}

function preserveAppliedCandidate(root: string, journal: ApplyJournal) {
  const source = candidateFile(root, journal.slug)
  const target = appliedFile(root, journal.slug)
  mkdirSync(resolve(root, 'applied'), { recursive: true })

  if (existsSync(target)) {
    verifyCandidateArtifact(target, journal.candidate_hash, `${journal.slug} applied`)
    if (existsSync(source)) {
      verifyCandidateArtifact(source, journal.candidate_hash, `${journal.slug} source`)
      unlinkSync(source)
    }
    return
  }
  if (!existsSync(source)) {
    throw new Error(`CRITICAL ${journal.slug}: 반영 후보 원본과 applied 사본이 모두 없다`)
  }
  verifyCandidateArtifact(source, journal.candidate_hash, `${journal.slug} source`)
  renameSync(source, target)
}

function finalizeCommitted(
  root: string,
  file: string,
  journal: ApplyJournal,
  completion: ApplyReceipt['completion'],
) {
  writeReceipt(root, journal, completion)
  preserveAppliedCandidate(root, journal)
  archiveJournal(root, file, journal, 'committed')
}

async function recoverPending(
  root: string,
  slug: string,
): Promise<'none' | 'committed' | 'rolled-back'> {
  const file = journalFile(root, slug)
  if (!existsSync(file)) return 'none'
  const journal = loadJournal(file)
  if (journal.slug !== slug) throw new Error(`CRITICAL ${slug}: 복구 일지 slug 불일치`)
  // Recovery is journal-driven. A legitimate profile edit after the journal was written must not
  // prevent recognizing an already committed timeline or rolling a partial write back.
  const current = await fetchStoredTimelineEvents(db, journal.celeb_id)
  const currentShape = timelineReadbackShape(current)
  const expectedShape = plannedReadbackShape(journal.planned_rows)
  if (sameShape(currentShape, expectedShape)) {
    finalizeCommitted(root, file, journal, 'recovered-after-interruption')
    console.log(`RECOVERED ${slug} — DB 반영 완료 상태를 readback하고 산출물을 마감`)
    return 'committed'
  }

  const beforeShape = timelineReadbackShape(journal.before_events)
  if (!sameShape(currentShape, beforeShape)) {
    try {
      await rollbackJournal(journal)
    } catch (error) {
      throw new Error(`CRITICAL ${slug}: 중단 상태 복구 실패; 일지 ${file}; ${(error as Error).message}`)
    }
  }
  archiveJournal(root, file, journal, 'rolled-back')
  console.log(`RECOVERED ${slug} — 중단된 반영을 원본으로 복구`)
  return 'rolled-back'
}

function ensureBackup(
  root: string,
  candidate: FictionCandidate,
  current: StoredTimelineEvent[],
  currentSourceSnapshot: FictionSourceSnapshot,
) {
  const directory = resolve(root, 'backups')
  mkdirSync(directory, { recursive: true })
  const file = resolve(directory, `${candidate.slug}-${candidate.before_fingerprint}.json`)
  if (existsSync(file)) {
    const backup = JSON.parse(readFileSync(file, 'utf8')) as {
      slug?: unknown
      celeb_id?: unknown
      before_fingerprint?: unknown
      events?: StoredTimelineEvent[]
    }
    if (backup.slug !== candidate.slug
      || backup.celeb_id !== candidate.celeb_id
      || backup.before_fingerprint !== candidate.before_fingerprint
      || !Array.isArray(backup.events)
      || fingerprintStoredEvents(backup.events) !== candidate.before_fingerprint) {
      throw new Error(`${candidate.slug}: 기존 백업이 현재 원본과 다르다: ${file}`)
    }
    return
  }
  writeNewJson(file, {
    schema_version: FICTION_CANDIDATE_SCHEMA_VERSION,
    slug: candidate.slug,
    celeb_id: candidate.celeb_id,
    before_fingerprint: candidate.before_fingerprint,
    source_snapshot: currentSourceSnapshot,
    events: current,
  })
}

function buildJournal(candidate: FictionCandidate, current: StoredTimelineEvent[]): ApplyJournal {
  const plannedRows = candidate.events.map((event, index): TimelineWriteRow => ({
    id: event.origin_id ?? randomUUID(),
    celeb_id: candidate.celeb_id,
    ...candidateEventPayload(event, (index + 1) * 10),
  }))
  return {
    schema_version: FICTION_CANDIDATE_SCHEMA_VERSION,
    slug: candidate.slug,
    celeb_id: candidate.celeb_id,
    candidate_hash: hashValue(candidate),
    before_fingerprint: candidate.before_fingerprint,
    before_events: current,
    source_snapshot: candidate.source_snapshot,
    publication_status: candidate.publication_status ?? 'active',
    profile_fingerprint: candidate.profile_fingerprint,
    planned_rows: plannedRows,
    retained_ids: candidate.events
      .map((event) => event.origin_id)
      .filter((id): id is string => id !== null),
    new_ids: plannedRows
      .filter((_, index) => candidate.events[index].origin_id === null)
      .map((row) => row.id),
    deletion_ids: candidate.deletions.map((deletion) => deletion.id),
    event_origins: candidate.events.map((event) => event.origin_id),
    started_at: new Date().toISOString(),
  }
}

async function validateProfileState(input: {
  slug: string
  celebId: string
  publicationStatus: 'active' | 'inactive'
  profileFingerprint?: string
  allowInactive: boolean
}) {
  const profile = await fetchFictionProfileBySlug(db, input.slug)
  if (!profile) throw new Error(`${input.slug}: 라이브 DB에 인물이 없다`)
  if (profile.id !== input.celebId) throw new Error(`${input.slug}: celeb_id 불일치`)
  if (profile.celeb_tier !== 'fiction') throw new Error(`${input.slug}: fiction 등급이 아니다`)
  if (input.publicationStatus === 'inactive') {
    if (!input.allowInactive) {
      throw new Error(`${input.slug}: inactive 후보에는 --allow-inactive와 명시적인 --slugs가 필요하다`)
    }
    if (!input.profileFingerprint) {
      throw new Error(`${input.slug}: inactive 후보에 profile_fingerprint가 없다`)
    }
  }
  if (profile.publication_status !== input.publicationStatus) {
    throw new Error(
      `${input.slug}: 후보 작성 뒤 공개 상태가 바뀜 (${input.publicationStatus} → ${profile.publication_status})`,
    )
  }
  if (input.profileFingerprint
    && fingerprintFictionProfile(profile) !== input.profileFingerprint) {
    throw new Error(`${input.slug}: 후보 작성 뒤 인물 프로필 지문이 바뀜`)
  }
  return profile
}

async function validateLiveState(candidate: FictionCandidate, allowInactive: boolean) {
  await validateProfileState({
    slug: candidate.slug,
    celebId: candidate.celeb_id,
    publicationStatus: candidate.publication_status ?? 'active',
    profileFingerprint: candidate.profile_fingerprint,
    allowInactive,
  })

  const [current, currentSourceSnapshot] = await Promise.all([
    fetchStoredTimelineEvents(db, candidate.celeb_id),
    loadFictionSourceSnapshot(db, candidate.celeb_id),
  ])
  const currentFingerprint = fingerprintStoredEvents(current)
  if (currentFingerprint !== candidate.before_fingerprint) {
    throw new Error(`${candidate.slug}: 후보 작성 뒤 라이브 연표가 바뀜 (${candidate.before_fingerprint} → ${currentFingerprint})`)
  }
  if (currentSourceSnapshot.fingerprint !== candidate.source_snapshot.fingerprint
    || !sameShape(currentSourceSnapshot, candidate.source_snapshot)) {
    throw new Error(`${candidate.slug}: 후보 작성 뒤 대표 원전 스냅샷이 바뀜`)
  }
  return { current, currentSourceSnapshot }
}

async function writePlannedRows(journal: ApplyJournal) {
  const retained = journal.planned_rows.filter((row) => journal.retained_ids.includes(row.id))
  const added = journal.planned_rows.filter((row) => journal.new_ids.includes(row.id))
  if (retained.length > 0) {
    const { error } = await db
      .from('celeb_timeline_events')
      .upsert(retained, { onConflict: 'id' })
    if (error) throw new Error(`기존 행 UPDATE 실패: ${error.message}`)
  }
  if (added.length > 0) {
    const { data, error } = await db
      .from('celeb_timeline_events')
      .insert(added)
      .select('id')
    if (error || !data) throw new Error(`신규 행 INSERT 실패: ${error?.message ?? '응답 없음'}`)
    const insertedIds = new Set(data.map((row) => row.id as string))
    if (insertedIds.size !== journal.new_ids.length
      || journal.new_ids.some((id) => !insertedIds.has(id))) {
      throw new Error('신규 행 INSERT 응답 ID가 계획과 다름')
    }
  }
  if (journal.deletion_ids.length > 0) {
    const { data, error } = await db
      .from('celeb_timeline_events')
      .delete()
      .eq('celeb_id', journal.celeb_id)
      .in('id', journal.deletion_ids)
      .select('id')
    if (error || !data) throw new Error(`삭제 행 DELETE 실패: ${error?.message ?? '응답 없음'}`)
    const deletedIds = new Set(data.map((row) => row.id as string))
    if (deletedIds.size !== journal.deletion_ids.length
      || journal.deletion_ids.some((id) => !deletedIds.has(id))) {
      throw new Error('DELETE 응답 ID가 deletion manifest와 다름')
    }
  }
}

async function applyCandidate(
  root: string,
  slug: string,
  dry: boolean,
  allowInactive: boolean,
) {
  const pending = journalFile(root, slug)
  if (existsSync(pending)) {
    if (dry) throw new Error(`${slug}: 중단된 반영 일지가 있다. --recover 또는 --apply로 먼저 복구한다`)
    const recovered = await recoverPending(root, slug)
    if (recovered === 'committed') return
  }

  const candidate = loadCandidate(root, slug)
  const { current, currentSourceSnapshot } = await validateLiveState(candidate, allowInactive)
  const retainedCount = candidate.events.filter((event) => event.origin_id !== null).length
  const newCount = candidate.events.length - retainedCount
  const deletionCount = candidate.deletions.length
  if (dry) {
    console.log(
      `READY ${slug} — 기존 ${retainedCount}행 ID 보존, 신규 ${newCount}행, 삭제 ${deletionCount}행, `
      + `원전 ${candidate.anchor_source_ids.length}개, payload·지문 검증 완료`,
    )
    return
  }

  ensureBackup(root, candidate, current, currentSourceSnapshot)
  const journal = buildJournal(candidate, current)
  const file = journalFile(root, slug)
  writeNewJson(file, journal)

  try {
    await writePlannedRows(journal)
    const after = await fetchStoredTimelineEvents(db, candidate.celeb_id)
    if (!sameShape(timelineReadbackShape(after), plannedReadbackShape(journal.planned_rows))) {
      throw new Error('DB readback payload·ID가 반영 계획과 다름')
    }
  } catch (writeError) {
    try {
      await rollbackJournal(journal)
      archiveJournal(root, file, journal, 'rolled-back')
    } catch (rollbackError) {
      throw new Error(
        `CRITICAL ${slug}: 반영 실패 뒤 원본 복구도 실패; 일지 ${file}; `
        + `${(writeError as Error).message}; ${(rollbackError as Error).message}`,
      )
    }
    throw new Error(`${slug}: ${(writeError as Error).message}; 원본 복구·readback 완료`)
  }

  finalizeCommitted(root, file, journal, 'normal')
  console.log(
    `OK ${slug} — 기존 ${retainedCount}행 ID 보존, 신규 ${newCount}행, 삭제 ${deletionCount}행, `
    + 'payload·ID readback 완료',
  )
}

function listReadySlugs(root: string): string[] {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(root, entry.name, 'candidate.json')))
    .map((entry) => entry.name)
    .sort()
}

function listPendingSlugs(root: string): string[] {
  const directory = resolve(root, 'transactions')
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name.slice(0, -'.json'.length))
    .sort()
}

async function main() {
  const root = resolve(argOf('root') ?? '.tmp-fiction-timeline')
  const slugs = parseSlugs()
  const dry = process.argv.includes('--dry')
  const apply = process.argv.includes('--apply')
  const recover = process.argv.includes('--recover')
  if ([dry, apply, recover].filter(Boolean).length !== 1) {
    throw new Error('--dry, --apply, --recover 중 하나만 지정한다')
  }

  const allReady = process.argv.includes('--all-ready')
  const allPending = process.argv.includes('--all-pending')
  const allowInactive = process.argv.includes('--allow-inactive')
  assertExplicitInactiveSlugMode({
    allowInactive,
    slugs,
    usesAllTargetMode: allReady || allPending,
  })
  if (recover) {
    if (allPending === (slugs.length > 0) || allReady) {
      throw new Error('--recover에는 --all-pending 또는 --slugs 중 하나만 지정한다')
    }
    const targets = allPending ? listPendingSlugs(root) : slugs
    if (targets.length === 0) {
      console.log('복구할 반영 일지가 없다')
      return
    }
    for (const slug of targets) await recoverPending(root, slug)
    return
  }

  if (allReady === (slugs.length > 0) || allPending) {
    throw new Error('--dry/--apply에는 --all-ready 또는 --slugs 중 하나만 지정한다')
  }
  const targets = allReady ? listReadySlugs(root) : slugs
  if (targets.length === 0) throw new Error('처리할 candidate.json이 없다')
  for (const slug of targets) await applyCandidate(root, slug, dry, allowInactive)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
