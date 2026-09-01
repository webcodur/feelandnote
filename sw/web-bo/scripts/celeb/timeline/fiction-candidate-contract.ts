import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const FICTION_CANDIDATE_SCHEMA_VERSION = 1 as const
export const FICTION_EVENT_COUNT_WARNING_MIN = 2
export const FICTION_EVENT_COUNT_WARNING_MAX = 30

export const ALLOWED_TIMELINE_KINDS = new Set([
  'birth',
  'death',
  'education',
  'work',
  'publish',
  'battle',
  'travel',
  'office',
  'meeting',
  'other',
])

export type FictionProfileSnapshot = {
  id: string
  slug: string
  nickname: string | null
  nickname_en: string | null
  publication_status: string
  celeb_tier: string
  birth_date: string | null
  death_date: string | null
  headline: string | null
  bio: string | null
  profession: string | null
  nationality: string | null
}

export type StoredTimelineEvent = {
  id: string
  celeb_id: string
  year: number | null
  year_end: number | null
  sequence_label: string | null
  sequence_label_en: string | null
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
  source: string
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

export type FictionSourceLocaleSnapshot = {
  locale: string
  title: string | null
  creator: string | null
  description: string | null
  sources: unknown
}

export type FictionSourceAssignmentSnapshot = {
  content_id: string
  relation_type: string
  sort_order: number
  content: {
    type: string
    external_id: string | null
    external_source: string | null
  }
  locales: FictionSourceLocaleSnapshot[]
}

export type FictionSourceSnapshot = {
  fingerprint: string
  assignments: FictionSourceAssignmentSnapshot[]
}

export type FictionEventSourceRef = {
  content_id: string | null
  locus: string
  judgment: string
}

export type FictionCandidateEvent = {
  origin_id: string | null
  identity_judgment: string
  year: null
  year_end: null
  sequence_label: string
  sequence_label_en: string
  title: string
  title_en: string
  description: string
  description_en: string
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
  source_refs: FictionEventSourceRef[]
}

export type FictionCandidateDeletion = {
  id: string
  reason: string
}

export type FictionCandidate = {
  schema_version: typeof FICTION_CANDIDATE_SCHEMA_VERSION
  slug: string
  celeb_id: string
  celeb_tier: 'fiction'
  publication_status?: 'active' | 'inactive'
  profile_fingerprint?: string
  before_events: StoredTimelineEvent[]
  before_fingerprint: string
  source_snapshot: FictionSourceSnapshot
  anchor_source_ids: string[]
  source_selection_reason: string
  events: FictionCandidateEvent[]
  deletions: FictionCandidateDeletion[]
  quality_notes: {
    coverage_summary: string
    identity_review: string
    variant_policy: string
    known_omissions: string[]
  }
}

export type FictionCandidateSeed = {
  schema_version: typeof FICTION_CANDIDATE_SCHEMA_VERSION
  slug: string
  celeb_id: string
  celeb_tier: 'fiction'
  profile: FictionProfileSnapshot
  profile_fingerprint: string
  before_events: StoredTimelineEvent[]
  before_fingerprint: string
  source_snapshot: FictionSourceSnapshot
}

export type TimelineWritePayload = {
  year: null
  year_end: null
  sequence_label: string
  sequence_label_en: string
  title: string
  title_en: string
  description: string
  description_en: string
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
  source: 'manual'
  sort_order: number
}

export type TimelineWriteRow = TimelineWritePayload & {
  id: string
  celeb_id: string
}

type SourceAssignmentRow = {
  content_id: string
  celeb_id: string
  relation_type: string
  sort_order: number
}

type ContentRow = {
  id: string
  type: string
  external_id: string | null
  external_source: string | null
}

type ContentLocaleRow = {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
  description: string | null
  sources: unknown
}

const TIMELINE_SELECT = [
  'id',
  'celeb_id',
  'year',
  'year_end',
  'sequence_label',
  'sequence_label_en',
  'title',
  'title_en',
  'description',
  'description_en',
  'kind',
  'place_name',
  'place_name_en',
  'lat',
  'lng',
  'source',
  'sort_order',
  'created_at',
  'updated_at',
].join(',')

const PROFILE_SELECT = [
  'id',
  'slug',
  'nickname',
  'nickname_en',
  'publication_status',
  'celeb_tier',
  'birth_date',
  'death_date',
  'headline',
  'bio',
  'profession',
  'nationality',
].join(',')

const TOP_LEVEL_KEYS = new Set([
  'schema_version',
  'slug',
  'celeb_id',
  'celeb_tier',
  'publication_status',
  'profile_fingerprint',
  'before_events',
  'before_fingerprint',
  'source_snapshot',
  'anchor_source_ids',
  'source_selection_reason',
  'events',
  'deletions',
  'quality_notes',
])

const EVENT_KEYS = new Set([
  'origin_id',
  'identity_judgment',
  'year',
  'year_end',
  'sequence_label',
  'sequence_label_en',
  'title',
  'title_en',
  'description',
  'description_en',
  'kind',
  'place_name',
  'place_name_en',
  'lat',
  'lng',
  'source_refs',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  )
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

export function hashValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

function canonicalStoredEvent(event: StoredTimelineEvent) {
  return {
    id: event.id,
    celeb_id: event.celeb_id,
    year: event.year ?? null,
    year_end: event.year_end ?? null,
    sequence_label: event.sequence_label ?? null,
    sequence_label_en: event.sequence_label_en ?? null,
    title: event.title,
    title_en: event.title_en ?? null,
    description: event.description ?? null,
    description_en: event.description_en ?? null,
    kind: event.kind,
    place_name: event.place_name ?? null,
    place_name_en: event.place_name_en ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    source: event.source,
    sort_order: event.sort_order,
    created_at: event.created_at ?? null,
  }
}

export function fingerprintStoredEvents(events: StoredTimelineEvent[]): string {
  return hashValue(events.map(canonicalStoredEvent))
}

export function fingerprintFictionProfile(profile: FictionProfileSnapshot): string {
  return hashValue({
    id: profile.id,
    slug: profile.slug,
    nickname: profile.nickname ?? null,
    nickname_en: profile.nickname_en ?? null,
    publication_status: profile.publication_status,
    celeb_tier: profile.celeb_tier,
    birth_date: profile.birth_date ?? null,
    death_date: profile.death_date ?? null,
    headline: profile.headline ?? null,
    bio: profile.bio ?? null,
    profession: profile.profession ?? null,
    nationality: profile.nationality ?? null,
  })
}

export function assertExplicitInactiveSlugMode(input: {
  allowInactive: boolean
  slugs: string[]
  usesAllTargetMode: boolean
}) {
  if (!input.allowInactive) return
  if (input.slugs.length === 0 || input.usesAllTargetMode) {
    throw new Error('--allow-inactive는 명시적인 --slugs와 함께만 사용할 수 있다')
  }
}

export function fingerprintSourceAssignments(
  assignments: FictionSourceAssignmentSnapshot[],
): string {
  return hashValue(assignments)
}

export function timelinePayload(event: StoredTimelineEvent | TimelineWriteRow) {
  return {
    year: event.year ?? null,
    year_end: event.year_end ?? null,
    sequence_label: event.sequence_label ?? null,
    sequence_label_en: event.sequence_label_en ?? null,
    title: event.title,
    title_en: event.title_en ?? null,
    description: event.description ?? null,
    description_en: event.description_en ?? null,
    kind: event.kind,
    place_name: event.place_name ?? null,
    place_name_en: event.place_name_en ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    source: event.source,
    sort_order: event.sort_order,
  }
}

export function timelineReadbackShape(events: StoredTimelineEvent[]) {
  return events.map((event) => ({ id: event.id, celeb_id: event.celeb_id, ...timelinePayload(event) }))
}

export function plannedReadbackShape(rows: TimelineWriteRow[]) {
  return rows.map((row) => ({ id: row.id, celeb_id: row.celeb_id, ...timelinePayload(row) }))
}

function coordinate(value: number | null): number | null {
  return value === null ? null : Number(value.toPrecision(15))
}

export function candidateEventPayload(
  event: FictionCandidateEvent,
  sortOrder: number,
): TimelineWritePayload {
  return {
    year: null,
    year_end: null,
    sequence_label: event.sequence_label.trim(),
    sequence_label_en: event.sequence_label_en.trim(),
    title: event.title.trim(),
    title_en: event.title_en.trim(),
    description: event.description.trim(),
    description_en: event.description_en.trim(),
    kind: event.kind,
    place_name: event.place_name?.trim() || null,
    place_name_en: event.place_name_en?.trim() || null,
    lat: coordinate(event.lat),
    lng: coordinate(event.lng),
    source: 'manual',
    sort_order: sortOrder,
  }
}

function hasTextDamage(value: string): boolean {
  return value.includes('\uFFFD') || value.includes('\u0000')
}

function validateRequiredText(
  value: unknown,
  path: string,
  errors: string[],
): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path} 없음`)
    return false
  }
  if (hasTextDamage(value)) errors.push(`${path} 문자 손상`)
  return true
}

function validateNullableText(value: unknown, path: string, errors: string[]) {
  if (value !== null && typeof value !== 'string') {
    errors.push(`${path}는 문자열 또는 null이어야 함`)
  } else if (typeof value === 'string' && hasTextDamage(value)) {
    errors.push(`${path} 문자 손상`)
  }
}

function unknownKeys(
  record: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: string[],
) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} 지원하지 않는 키`)
  }
}

function validateSourceSnapshot(value: unknown, errors: string[]): value is FictionSourceSnapshot {
  if (!isRecord(value)) {
    errors.push('source_snapshot 객체 없음')
    return false
  }
  unknownKeys(value, new Set(['fingerprint', 'assignments']), 'source_snapshot', errors)
  if (!Array.isArray(value.assignments)) {
    errors.push('source_snapshot.assignments 배열 없음')
    return false
  }
  if (!validateRequiredText(value.fingerprint, 'source_snapshot.fingerprint', errors)) return false

  const assignments = value.assignments as unknown[]
  const contentIds = new Set<string>()
  assignments.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push(`source_snapshot.assignments[${index}] 객체 아님`)
      return
    }
    unknownKeys(
      raw,
      new Set(['content_id', 'relation_type', 'sort_order', 'content', 'locales']),
      `source_snapshot.assignments[${index}]`,
      errors,
    )
    if (validateRequiredText(raw.content_id, `source_snapshot.assignments[${index}].content_id`, errors)) {
      if (contentIds.has(raw.content_id)) errors.push(`source_snapshot content_id 중복: ${raw.content_id}`)
      contentIds.add(raw.content_id)
    }
    validateRequiredText(raw.relation_type, `source_snapshot.assignments[${index}].relation_type`, errors)
    if (!Number.isInteger(raw.sort_order) || Number(raw.sort_order) < 0) {
      errors.push(`source_snapshot.assignments[${index}].sort_order 오류`)
    }
    if (!isRecord(raw.content)) errors.push(`source_snapshot.assignments[${index}].content 객체 없음`)
    if (!Array.isArray(raw.locales)) errors.push(`source_snapshot.assignments[${index}].locales 배열 없음`)
  })

  const snapshot = value as FictionSourceSnapshot
  if (snapshot.fingerprint !== fingerprintSourceAssignments(snapshot.assignments)) {
    errors.push('source_snapshot.fingerprint가 스냅샷 내용과 다름')
  }
  return true
}

function validateCandidateEvent(
  raw: unknown,
  index: number,
  anchorSourceIds: Set<string>,
  unlinked: boolean,
  errors: string[],
) {
  const path = `events[${index}]`
  if (!isRecord(raw)) {
    errors.push(`${path} 객체 아님`)
    return
  }
  unknownKeys(raw, EVENT_KEYS, path, errors)
  if (raw.origin_id !== null && (typeof raw.origin_id !== 'string' || !raw.origin_id.trim())) {
    errors.push(`${path}.origin_id는 ID 또는 null이어야 함`)
  }
  validateRequiredText(raw.identity_judgment, `${path}.identity_judgment`, errors)
  if (raw.year !== null || raw.year_end !== null) errors.push(`${path} fiction 연도는 모두 null이어야 함`)
  validateRequiredText(raw.sequence_label, `${path}.sequence_label`, errors)
  validateRequiredText(raw.sequence_label_en, `${path}.sequence_label_en`, errors)
  validateRequiredText(raw.title, `${path}.title`, errors)
  validateRequiredText(raw.title_en, `${path}.title_en`, errors)
  validateRequiredText(raw.description, `${path}.description`, errors)
  validateRequiredText(raw.description_en, `${path}.description_en`, errors)
  if (typeof raw.kind !== 'string' || !ALLOWED_TIMELINE_KINDS.has(raw.kind)) {
    errors.push(`${path}.kind=${String(raw.kind)} 허용 안 됨`)
  }
  validateNullableText(raw.place_name, `${path}.place_name`, errors)
  validateNullableText(raw.place_name_en, `${path}.place_name_en`, errors)

  const lat = raw.lat
  const lng = raw.lng
  const latOk = lat === null || (typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90)
  const lngOk = lng === null || (typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180)
  if (!latOk || !lngOk) errors.push(`${path} 좌표 범위 오류`)
  if ((lat === null) !== (lng === null)) errors.push(`${path} 좌표 짝 깨짐`)
  if ((lat !== null || lng !== null) && (
    typeof raw.place_name !== 'string' || !raw.place_name.trim()
    || typeof raw.place_name_en !== 'string' || !raw.place_name_en.trim()
  )) {
    errors.push(`${path} 좌표가 있으면 국·영문 도시명이 필요함`)
  }

  if (!Array.isArray(raw.source_refs) || raw.source_refs.length === 0) {
    errors.push(`${path}.source_refs 없음`)
    return
  }
  const refKeys = new Set(['content_id', 'locus', 'judgment'])
  raw.source_refs.forEach((sourceRef, sourceIndex) => {
    const sourcePath = `${path}.source_refs[${sourceIndex}]`
    if (!isRecord(sourceRef)) {
      errors.push(`${sourcePath} 객체 아님`)
      return
    }
    unknownKeys(sourceRef, refKeys, sourcePath, errors)
    validateRequiredText(sourceRef.locus, `${sourcePath}.locus`, errors)
    validateRequiredText(sourceRef.judgment, `${sourcePath}.judgment`, errors)
    if (unlinked) {
      if (sourceRef.content_id !== null) errors.push(`${sourcePath}.content_id는 미연결 예외에서 null이어야 함`)
    } else if (typeof sourceRef.content_id !== 'string' || !anchorSourceIds.has(sourceRef.content_id)) {
      errors.push(`${sourcePath}.content_id가 anchor_source_ids에 없음`)
    }
  })
}

export function validateFictionCandidate(value: unknown): {
  candidate: FictionCandidate | null
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isRecord(value)) return { candidate: null, errors: ['후보 최상위 객체 없음'], warnings }
  unknownKeys(value, TOP_LEVEL_KEYS, 'candidate', errors)
  const candidate = value as FictionCandidate

  if (candidate.schema_version !== FICTION_CANDIDATE_SCHEMA_VERSION) {
    errors.push(`schema_version=${String(candidate.schema_version)} 지원 안 됨`)
  }
  validateRequiredText(candidate.slug, 'slug', errors)
  validateRequiredText(candidate.celeb_id, 'celeb_id', errors)
  if (candidate.celeb_tier !== 'fiction') errors.push('celeb_tier는 fiction이어야 함')
  const hasPublicationStatus = candidate.publication_status !== undefined
  const hasProfileFingerprint = candidate.profile_fingerprint !== undefined
  if (hasPublicationStatus !== hasProfileFingerprint) {
    errors.push('publication_status와 profile_fingerprint는 함께 있어야 함')
  }
  if (hasPublicationStatus
    && candidate.publication_status !== 'active'
    && candidate.publication_status !== 'inactive') {
    errors.push('publication_status는 active 또는 inactive여야 함')
  }
  if (hasProfileFingerprint) {
    validateRequiredText(candidate.profile_fingerprint, 'profile_fingerprint', errors)
  }
  if (!Array.isArray(candidate.before_events)) errors.push('before_events 배열 없음')
  validateRequiredText(candidate.before_fingerprint, 'before_fingerprint', errors)
  const sourceSnapshotValid = validateSourceSnapshot(candidate.source_snapshot, errors)
  if (!Array.isArray(candidate.anchor_source_ids)) errors.push('anchor_source_ids 배열 없음')
  validateRequiredText(candidate.source_selection_reason, 'source_selection_reason', errors)
  if (!Array.isArray(candidate.events) || candidate.events.length === 0) errors.push('events가 비어 있음')
  if (!Array.isArray(candidate.deletions)) errors.push('deletions 배열 없음')

  if (!isRecord(candidate.quality_notes)) {
    errors.push('quality_notes 객체 없음')
  } else {
    unknownKeys(
      candidate.quality_notes,
      new Set(['coverage_summary', 'identity_review', 'variant_policy', 'known_omissions']),
      'quality_notes',
      errors,
    )
    validateRequiredText(candidate.quality_notes.coverage_summary, 'quality_notes.coverage_summary', errors)
    validateRequiredText(candidate.quality_notes.identity_review, 'quality_notes.identity_review', errors)
    validateRequiredText(candidate.quality_notes.variant_policy, 'quality_notes.variant_policy', errors)
    if (!Array.isArray(candidate.quality_notes.known_omissions)
      || candidate.quality_notes.known_omissions.some((item) => typeof item !== 'string')) {
      errors.push('quality_notes.known_omissions 문자열 배열 아님')
    }
  }

  const beforeEvents = Array.isArray(candidate.before_events) ? candidate.before_events : []
  const beforeIds = new Set<string>()
  beforeEvents.forEach((event, index) => {
    if (!isRecord(event) || typeof event.id !== 'string' || !event.id.trim()) {
      errors.push(`before_events[${index}].id 없음`)
      return
    }
    if (beforeIds.has(event.id)) errors.push(`before_events ID 중복: ${event.id}`)
    beforeIds.add(event.id)
    if (event.celeb_id !== candidate.celeb_id) errors.push(`before_events[${index}].celeb_id 불일치`)
  })
  if (Array.isArray(candidate.before_events)
    && candidate.before_fingerprint !== fingerprintStoredEvents(candidate.before_events)) {
    errors.push('before_fingerprint가 before_events와 다름')
  }

  const anchors = Array.isArray(candidate.anchor_source_ids)
    ? candidate.anchor_source_ids.filter((id): id is string => typeof id === 'string' && !!id.trim())
    : []
  if (anchors.length !== (candidate.anchor_source_ids?.length ?? 0)) errors.push('anchor_source_ids에 빈 ID가 있음')
  const anchorSet = new Set(anchors)
  if (anchorSet.size !== anchors.length) errors.push('anchor_source_ids 중복')
  const snapshotIds = new Set(
    sourceSnapshotValid ? candidate.source_snapshot.assignments.map((assignment) => assignment.content_id) : [],
  )
  const unlinked = snapshotIds.size === 0
  if (unlinked) {
    errors.push('원전 미연결 fiction 후보는 허용하지 않는다. 먼저 등장 원전을 연결해야 한다.')
  }
  if (unlinked && anchors.length > 0) errors.push('원전 미연결 인물은 anchor_source_ids가 비어야 함')
  if (!unlinked && anchors.length === 0) errors.push('연결 원전이 있는 인물은 anchor_source_ids가 필요함')
  for (const id of anchors) {
    if (!snapshotIds.has(id)) errors.push(`anchor_source_id가 source_snapshot에 없음: ${id}`)
  }

  const events = Array.isArray(candidate.events) ? candidate.events : []
  events.forEach((event, index) => validateCandidateEvent(event, index, anchorSet, unlinked, errors))
  if (events.length < FICTION_EVENT_COUNT_WARNING_MIN) {
    warnings.push(`사건 ${events.length}건: 짧은 등장인지 원전 커버리지를 다시 확인`)
  }
  if (events.length > FICTION_EVENT_COUNT_WARNING_MAX) {
    warnings.push(`사건 ${events.length}건: 같은 장면 분할이나 판본 중복이 없는지 다시 확인`)
  }

  const origins = events
    .map((event) => event?.origin_id)
    .filter((id): id is string => typeof id === 'string')
  const originSet = new Set(origins)
  if (originSet.size !== origins.length) errors.push('유지 origin_id 중복')
  for (const id of originSet) {
    if (!beforeIds.has(id)) errors.push(`알 수 없는 origin_id: ${id}`)
  }

  const deletionIds: string[] = []
  const deletions = Array.isArray(candidate.deletions) ? candidate.deletions : []
  deletions.forEach((deletion, index) => {
    if (!isRecord(deletion)) {
      errors.push(`deletions[${index}] 객체 아님`)
      return
    }
    unknownKeys(deletion, new Set(['id', 'reason']), `deletions[${index}]`, errors)
    if (validateRequiredText(deletion.id, `deletions[${index}].id`, errors)) deletionIds.push(deletion.id)
    validateRequiredText(deletion.reason, `deletions[${index}].reason`, errors)
  })
  const deletionSet = new Set(deletionIds)
  if (deletionSet.size !== deletionIds.length) errors.push('deletions ID 중복')
  for (const id of deletionSet) {
    if (!beforeIds.has(id)) errors.push(`알 수 없는 deletion ID: ${id}`)
    if (originSet.has(id)) errors.push(`origin과 deletion이 겹침: ${id}`)
  }
  const accounted = new Set([...originSet, ...deletionSet])
  if (accounted.size !== beforeIds.size || [...beforeIds].some((id) => !accounted.has(id))) {
    errors.push('유지 origin IDs와 deletion IDs가 기존 ID 전체를 정확히 분할하지 않음')
  }

  const duplicateEvents = new Map<string, number>()
  events.forEach((event, index) => {
    if (!isRecord(event)) return
    const key = hashValue({
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
    })
    const previous = duplicateEvents.get(key)
    if (previous !== undefined) errors.push(`events[${previous}]와 events[${index}]가 완전 중복`)
    duplicateEvents.set(key, index)
  })

  return { candidate: errors.length === 0 ? candidate : null, errors, warnings }
}

export async function fetchFictionProfileBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<FictionProfileSnapshot | null> {
  const { data, error } = await supabase
    .from('celebs')
    .select(PROFILE_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(`${slug}: 인물 조회 실패: ${error.message}`)
  return data as FictionProfileSnapshot | null
}

export async function fetchStoredTimelineEvents(
  supabase: SupabaseClient,
  celebId: string,
): Promise<StoredTimelineEvent[]> {
  const { data, error } = await supabase
    .from('celeb_timeline_events')
    .select(TIMELINE_SELECT)
    .eq('celeb_id', celebId)
    .order('sort_order')
    .order('id')
  if (error) throw new Error(`기존 연표 조회 실패: ${error.message}`)
  return (data ?? []) as unknown as StoredTimelineEvent[]
}

export async function fetchStoredTimelineEventsByCeleb(
  supabase: SupabaseClient,
  celebIds: string[],
): Promise<Map<string, StoredTimelineEvent[]>> {
  const result = new Map<string, StoredTimelineEvent[]>(celebIds.map((id) => [id, []]))
  for (let start = 0; start < celebIds.length; start += 100) {
    const ids = celebIds.slice(start, start + 100)
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('celeb_timeline_events')
        .select(TIMELINE_SELECT)
        .in('celeb_id', ids)
        .order('celeb_id')
        .order('sort_order')
        .order('id')
        .range(from, from + 999)
      if (error) throw new Error(`연표 일괄 조회 실패: ${error.message}`)
      const page = (data ?? []) as unknown as StoredTimelineEvent[]
      for (const event of page) result.get(event.celeb_id)?.push(event)
      if (page.length < 1000) break
    }
  }
  return result
}

export async function loadFictionSourceSnapshots(
  supabase: SupabaseClient,
  celebIds: string[],
): Promise<Map<string, FictionSourceSnapshot>> {
  const assignments: SourceAssignmentRow[] = []
  for (let start = 0; start < celebIds.length; start += 100) {
    const ids = celebIds.slice(start, start + 100)
    const { data, error } = await supabase
      .from('fiction_source_characters')
      .select('content_id,celeb_id,relation_type,sort_order')
      .in('celeb_id', ids)
      .order('celeb_id')
      .order('sort_order')
      .order('content_id')
    if (error) throw new Error(`대표 원전 연결 조회 실패: ${error.message}`)
    assignments.push(...((data ?? []) as SourceAssignmentRow[]))
  }

  const contentIds = [...new Set(assignments.map((assignment) => assignment.content_id))].sort()
  const contents: ContentRow[] = []
  const locales: ContentLocaleRow[] = []
  for (let start = 0; start < contentIds.length; start += 100) {
    const ids = contentIds.slice(start, start + 100)
    const [contentResult, localeResult] = await Promise.all([
      supabase
        .from('contents')
        .select('id,type,external_id,external_source')
        .in('id', ids),
      supabase
        .from('content_locales')
        .select('content_id,locale,title,creator,description,sources')
        .in('content_id', ids),
    ])
    if (contentResult.error) throw new Error(`대표 원전 콘텐츠 조회 실패: ${contentResult.error.message}`)
    if (localeResult.error) throw new Error(`대표 원전 메타 조회 실패: ${localeResult.error.message}`)
    contents.push(...((contentResult.data ?? []) as ContentRow[]))
    locales.push(...((localeResult.data ?? []) as ContentLocaleRow[]))
  }

  const contentById = new Map(contents.map((content) => [content.id, content]))
  const localesById = new Map<string, ContentLocaleRow[]>()
  for (const locale of locales) {
    const current = localesById.get(locale.content_id) ?? []
    current.push(locale)
    localesById.set(locale.content_id, current)
  }

  const assignmentsByCeleb = new Map<string, SourceAssignmentRow[]>()
  for (const assignment of assignments) {
    const current = assignmentsByCeleb.get(assignment.celeb_id) ?? []
    current.push(assignment)
    assignmentsByCeleb.set(assignment.celeb_id, current)
  }

  const snapshots = new Map<string, FictionSourceSnapshot>()
  for (const celebId of celebIds) {
    const snapshotAssignments = (assignmentsByCeleb.get(celebId) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order || a.content_id.localeCompare(b.content_id))
      .map((assignment): FictionSourceAssignmentSnapshot => {
        const content = contentById.get(assignment.content_id)
        if (!content) throw new Error(`대표 원전 contents 행 없음: ${assignment.content_id}`)
        return {
          content_id: assignment.content_id,
          relation_type: assignment.relation_type,
          sort_order: assignment.sort_order,
          content: {
            type: content.type,
            external_id: content.external_id,
            external_source: content.external_source,
          },
          locales: (localesById.get(assignment.content_id) ?? [])
            .sort((a, b) => a.locale.localeCompare(b.locale))
            .map((locale) => ({
              locale: locale.locale,
              title: locale.title,
              creator: locale.creator,
              description: locale.description,
              sources: locale.sources,
            })),
        }
      })
    snapshots.set(celebId, {
      fingerprint: fingerprintSourceAssignments(snapshotAssignments),
      assignments: snapshotAssignments,
    })
  }
  return snapshots
}

export async function loadFictionSourceSnapshot(
  supabase: SupabaseClient,
  celebId: string,
): Promise<FictionSourceSnapshot> {
  return (await loadFictionSourceSnapshots(supabase, [celebId])).get(celebId) ?? {
    fingerprint: fingerprintSourceAssignments([]),
    assignments: [],
  }
}
