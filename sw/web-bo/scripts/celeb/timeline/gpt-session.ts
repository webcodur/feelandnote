import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const BO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const REPO_ROOT = path.resolve(BO_ROOT, '../..')

async function loadDbClient() {
  try {
    return await import('@supabase/supabase-js')
  } catch {
    const store = path.join(REPO_ROOT, 'node_modules/.pnpm')
    const packageDir = readdirSync(store)
      .filter((name) => name.startsWith('@supabase+supabase-js@'))
      .sort()
      .at(-1)
    if (!packageDir) throw new Error('로컬 pnpm 저장소에서 @supabase/supabase-js를 찾지 못했다')
    const moduleFile = path.join(
      store,
      packageDir,
      'node_modules/@supabase/supabase-js/dist/index.mjs',
    )
    return import(pathToFileURL(moduleFile).href)
  }
}

function loadEnv() {
  const envFile = path.join(BO_ROOT, '.env')
  if (!existsSync(envFile)) return
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const dbApiUrl = process.env.NEXT_PUBLIC_DB_API_URL
const secretKey = process.env.DB_SECRET_KEY
if (!dbApiUrl || !secretKey) {
  throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
}

const { createClient } = await loadDbClient()
const db = createClient(dbApiUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const WORK_ROOT = path.join(BO_ROOT, '.tmp-celeb-timeline-gpt')
const COHORT_FILE = path.join(WORK_ROOT, 'cohort-1000.json')
const TARGET_DIR = path.join(WORK_ROOT, 'targets')
const RESEARCH_DIR = path.join(WORK_ROOT, 'research')
const VERIFIED_DIR = path.join(WORK_ROOT, 'verified')
const REJECTED_DIR = path.join(WORK_ROOT, 'rejected')
const APPLIED_DIR = path.join(WORK_ROOT, 'applied')
const BACKUP_DIR = path.join(WORK_ROOT, 'backups')
const RECENT_SLUGS_FILE = path.join(
  REPO_ROOT,
  'data/celeb/timeline-life-rewrite/recent-473-slugs.json',
)

const ALLOWED_KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
])
const BROKEN_TEXT = /\uFFFD|\?{3,}/

interface CelebRow {
  id: string
  slug: string
  nickname: string
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  celeb_tier: string
  publication_status: string
}

interface StoredEvent {
  id: string
  celeb_id: string
  year: number | null
  year_end: number | null
  sequence_label: string | null
  sequence_label_en: string | null
  title: string
  title_en: string
  description: string
  description_en: string
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
  source: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

interface Evidence {
  url: string
  supports: string
}

interface CandidateEvent {
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
  evidence: Evidence[]
}

interface TargetFile {
  target_version: 1
  ordinal: number
  cohort: 'recent-rewrite' | 'low-count-rewrite'
  base_fingerprint: string
  current_event_count: number
  profile: CelebRow
}

interface VerifiedFile {
  research_version: 1
  researcher: string
  target: TargetFile
  identity_sources: Evidence[]
  research_summary: string
  events: CandidateEvent[]
  verification: {
    status: 'approved'
    verifier: string
    summary: string
    identity_confirmed: boolean
    all_events_fact_checked: boolean
    chronology_confirmed: boolean
    bilingual_meaning_confirmed: boolean
    life_narrative_confirmed: boolean
    evidence_exception_indices?: number[]
  }
}

interface CohortFile {
  cohort_version: 1
  created_at: string
  selection: {
    requested: number
    recent_rewrite: number
    low_count_rewrite: number
  }
  targets: TargetFile[]
}

type PageFilter = {
  column: string
  operator: 'eq' | 'neq'
  value: string
}

function argOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function ensureWorkDirs() {
  for (const dir of [
    WORK_ROOT, TARGET_DIR, RESEARCH_DIR, VERIFIED_DIR,
    REJECTED_DIR, APPLIED_DIR, BACKUP_DIR,
  ]) mkdirSync(dir, { recursive: true })
}

async function fetchPages<T>(
  table: string,
  columns: string,
  filters: readonly PageFilter[] = [],
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1_000) {
    let query = db.from(table).select(columns)
    for (const filter of filters) {
      query = filter.operator === 'eq'
        ? query.eq(filter.column, filter.value)
        : query.neq(filter.column, filter.value)
    }
    const { data, error } = await query.order('id').range(from, from + 999)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1_000) return rows
  }
}

function timelineFingerprint(events: StoredEvent[]): string {
  return createHash('sha256').update(JSON.stringify(events)).digest('hex')
}

function fileName(target: Pick<TargetFile, 'ordinal' | 'profile'>): string {
  return `${String(target.ordinal).padStart(4, '0')}-${target.profile.slug}.json`
}

function distinctHosts(urls: string[]): number {
  const hosts = new Set<string>()
  for (const raw of urls) {
    try {
      const parsed = new URL(raw)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        hosts.add(parsed.hostname.toLowerCase().replace(/^www\./, ''))
      }
    } catch {
      // validateVerified에서 구체적인 오류를 낸다.
    }
  }
  return hosts.size
}

function eventPayload(event: CandidateEvent) {
  return {
    year: event.year,
    year_end: event.year_end,
    sequence_label: null,
    sequence_label_en: null,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: event.place_name,
    place_name_en: event.place_name_en,
    lat: event.lat,
    lng: event.lng,
  }
}

function storedPayload(event: StoredEvent) {
  return {
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
  }
}

function parseProfileYear(value: string | null): number | null {
  if (!value) return null
  const match = /^(-?\d{1,6})/.exec(value)
  return match ? Number.parseInt(match[1], 10) : null
}

function validateEvidence(evidence: Evidence[], label: string): string[] {
  const errors: string[] = []
  if (!Array.isArray(evidence) || evidence.length === 0) return [`${label}: 근거가 없다`]
  for (const [index, item] of evidence.entries()) {
    if (!item?.supports?.trim()) errors.push(`${label}: 근거 ${index + 1}의 대조 설명이 없다`)
    try {
      const url = new URL(item?.url)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('웹 URL 아님')
    } catch {
      errors.push(`${label}: 근거 ${index + 1} URL이 올바르지 않다`)
    }
  }
  return errors
}

function validateVerified(file: VerifiedFile): string[] {
  const errors: string[] = []
  const { target, verification, events } = file
  if (file.research_version !== 1) errors.push('research_version이 1이 아니다')
  if (!file.researcher?.trim()) errors.push('조사자 표시가 없다')
  if (!target || target.target_version !== 1) errors.push('대상 정보가 없거나 버전이 다르다')
  if (!verification || verification.status !== 'approved') errors.push('독립 검증 승인이 없다')
  if (verification?.verifier === file.researcher) errors.push('조사자와 검증자가 같다')
  for (const key of [
    'identity_confirmed', 'all_events_fact_checked', 'chronology_confirmed',
    'bilingual_meaning_confirmed', 'life_narrative_confirmed',
  ] as const) {
    if (verification?.[key] !== true) errors.push(`검증 항목 ${key}가 통과되지 않았다`)
  }
  errors.push(...validateEvidence(file.identity_sources, '신원'))
  if (distinctHosts(file.identity_sources?.map((item) => item.url) ?? []) < 2) {
    errors.push('신원을 서로 다른 웹 도메인 두 곳 이상에서 확인하지 않았다')
  }
  if (!Array.isArray(events) || events.length < 6) {
    errors.push(`사건이 ${events?.length ?? 0}건뿐이다`)
    return errors
  }

  const exceptions = new Set(verification.evidence_exception_indices ?? [])
  let previousYear: number | null = null
  const duplicateKeys = new Set<string>()
  for (const [index, event] of events.entries()) {
    const label = `index=${index}`
    for (const key of ['title', 'title_en', 'description', 'description_en'] as const) {
      if (!event[key]?.trim()) errors.push(`${label}: ${key}가 비었다`)
      if (BROKEN_TEXT.test(event[key] ?? '')) errors.push(`${label}: ${key}에 깨진 문자가 있다`)
    }
    if (!(event.year === null || Number.isInteger(event.year))) errors.push(`${label}: year가 정수/null이 아니다`)
    if (!(event.year_end === null || Number.isInteger(event.year_end))) errors.push(`${label}: year_end가 정수/null이 아니다`)
    if (event.year === null && event.year_end !== null) errors.push(`${label}: 시작 연도 없이 끝 연도만 있다`)
    if (event.year !== null && event.year_end !== null && event.year_end < event.year) {
      errors.push(`${label}: 끝 연도가 시작 연도보다 앞선다`)
    }
    if (event.year !== null) {
      if (previousYear !== null && event.year < previousYear) errors.push(`${label}: 연도순이 아니다`)
      previousYear = event.year
    }
    if (!ALLOWED_KINDS.has(event.kind)) errors.push(`${label}: 허용되지 않은 kind=${event.kind}`)
    if ((event.lat === null) !== (event.lng === null)) errors.push(`${label}: 위·경도 짝이 깨졌다`)
    if (event.lat !== null && (!Number.isFinite(event.lat) || event.lat < -90 || event.lat > 90)) {
      errors.push(`${label}: 위도 범위를 벗어났다`)
    }
    if (event.lng !== null && (!Number.isFinite(event.lng) || event.lng < -180 || event.lng > 180)) {
      errors.push(`${label}: 경도 범위를 벗어났다`)
    }
    if (event.lat !== null && !event.place_name?.trim()) errors.push(`${label}: 좌표가 있는데 장소명이 없다`)
    if ((event.place_name === null) !== (event.place_name_en === null)) {
      errors.push(`${label}: 국·영문 장소명 짝이 깨졌다`)
    }
    errors.push(...validateEvidence(event.evidence, label))
    if (!exceptions.has(index) && distinctHosts(event.evidence?.map((item) => item.url) ?? []) < 2) {
      errors.push(`${label}: 서로 다른 웹 도메인 두 곳의 근거가 없다`)
    }
    const duplicateKey = `${event.year}|${event.kind}|${event.title.trim().toLowerCase()}`
    if (duplicateKeys.has(duplicateKey)) errors.push(`${label}: 중복 사건이다`)
    duplicateKeys.add(duplicateKey)
  }

  const births = events.filter((event) => event.kind === 'birth')
  const deaths = events.filter((event) => event.kind === 'death')
  if (births.length !== 1) errors.push(`출생 사건이 ${births.length}건이다`)
  if (target.profile.death_date) {
    if (deaths.length !== 1) errors.push(`사망자인데 사망 사건이 ${deaths.length}건이다`)
  } else if (deaths.length > 0) {
    errors.push('생존 인물에게 사망 사건이 있다')
  }

  const profileBirthYear = parseProfileYear(target.profile.birth_date)
  if (profileBirthYear !== null && births[0]?.year !== profileBirthYear) {
    errors.push(`프로필 출생 연도 ${profileBirthYear}와 사건 ${births[0]?.year ?? 'null'}가 다르다`)
  }
  const profileDeathYear = parseProfileYear(target.profile.death_date)
  if (profileDeathYear !== null && deaths[0]?.year !== profileDeathYear) {
    errors.push(`프로필 사망 연도 ${profileDeathYear}와 사건 ${deaths[0]?.year ?? 'null'}가 다르다`)
  }
  return errors
}

async function fetchStoredEvents(celebId: string): Promise<StoredEvent[]> {
  const { data, error } = await db
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', celebId)
    .order('sort_order')
    .order('id')
  if (error) throw new Error(`기존 연표 조회 실패: ${error.message}`)
  return (data ?? []) as StoredEvent[]
}

async function prepareCohort() {
  ensureWorkDirs()
  if (existsSync(COHORT_FILE) && !process.argv.includes('--force')) {
    throw new Error(`이미 고정한 모집단이 있다: ${COHORT_FILE} (--force 없이 덮어쓰지 않음)`)
  }
  const requested = Number.parseInt(argOf('limit') ?? '1000', 10)
  if (!Number.isInteger(requested) || requested < 1) throw new Error('--limit은 양의 정수여야 한다')

  const [celebs, stored] = await Promise.all([
    fetchPages<CelebRow>('celebs', 'id,slug,nickname,profession,nationality,birth_date,death_date,celeb_tier,publication_status', [
      { column: 'publication_status', operator: 'eq', value: 'active' },
      { column: 'celeb_tier', operator: 'neq', value: 'fiction' },
    ]),
    fetchPages<StoredEvent>('celeb_timeline_events', '*'),
  ])
  const byCeleb = new Map<string, StoredEvent[]>()
  for (const event of stored) {
    const events = byCeleb.get(event.celeb_id) ?? []
    events.push(event)
    byCeleb.set(event.celeb_id, events)
  }
  for (const events of byCeleb.values()) {
    events.sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
  }
  const bySlug = new Map(celebs.map((celeb) => [celeb.slug, celeb]))
  const recentSlugs = JSON.parse(readFileSync(RECENT_SLUGS_FILE, 'utf8')) as string[]
  const recentSet = new Set(recentSlugs)
  const recent = recentSlugs
    .map((slug) => bySlug.get(slug))
    .filter((celeb): celeb is CelebRow => !!celeb)
  const lowCount = celebs
    .filter((celeb) => {
      const count = byCeleb.get(celeb.id)?.length ?? 0
      return !recentSet.has(celeb.slug) && count >= 1 && count <= 16
    })
    .sort((left, right) => {
      const countDiff = (byCeleb.get(left.id)?.length ?? 0) - (byCeleb.get(right.id)?.length ?? 0)
      return countDiff || Number(!!right.death_date) - Number(!!left.death_date) || left.slug.localeCompare(right.slug)
    })
  const selectedCelebs = [...recent, ...lowCount.slice(0, Math.max(0, requested - recent.length))]
  if (selectedCelebs.length !== requested) {
    throw new Error(`요청 ${requested}명을 고정할 수 없다: 최근 ${recent.length}, 저품질 후보 ${lowCount.length}`)
  }

  const targets: TargetFile[] = selectedCelebs.map((profile, index) => {
    const events = byCeleb.get(profile.id) ?? []
    return {
      target_version: 1,
      ordinal: index + 1,
      cohort: recentSet.has(profile.slug) ? 'recent-rewrite' : 'low-count-rewrite',
      base_fingerprint: timelineFingerprint(events),
      current_event_count: events.length,
      profile,
    }
  })
  const cohort: CohortFile = {
    cohort_version: 1,
    created_at: new Date().toISOString(),
    selection: {
      requested,
      recent_rewrite: targets.filter((target) => target.cohort === 'recent-rewrite').length,
      low_count_rewrite: targets.filter((target) => target.cohort === 'low-count-rewrite').length,
    },
    targets,
  }
  writeFileSync(COHORT_FILE, JSON.stringify(cohort, null, 1), 'utf8')
  for (const target of targets) {
    const targetPath = path.join(TARGET_DIR, fileName(target))
    writeFileSync(targetPath, JSON.stringify(target, null, 1), 'utf8')
  }
  console.log(JSON.stringify({
    cohort_file: COHORT_FILE,
    ...cohort.selection,
    active_real: celebs.length,
    existing_1_16_excluding_recent: lowCount.length,
  }))
}

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
}

async function revalidateCelebCache(tags: string[]) {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('CRON_SECRET이 없어 캐시를 재검증할 수 없다')
  const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://feelandnote.com').replace(/\/$/, '')
  const uniqueTags = [...new Set(tags)]
  for (let index = 0; index < uniqueTags.length; index += 50) {
    const chunk = uniqueTags.slice(index, index + 50)
    const response = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag: chunk, secret }),
      signal: AbortSignal.timeout(20_000),
    })
    const raw = await response.text()
    let body: { complete?: boolean; tags?: string[] }
    try {
      body = JSON.parse(raw) as { complete?: boolean; tags?: string[] }
    } catch {
      throw new Error(`캐시 재검증이 JSON을 반환하지 않았다: HTTP ${response.status}`)
    }
    const returned = new Set(body.tags ?? [])
    if (!response.ok || body.complete !== true ||
      chunk.some((tag) => !returned.has(tag)) || returned.size !== chunk.length) {
      throw new Error(`캐시 재검증 실패 HTTP ${response.status}: ${raw.slice(0, 300)}`)
    }
  }
}

function status() {
  ensureWorkDirs()
  const cohort = existsSync(COHORT_FILE)
    ? JSON.parse(readFileSync(COHORT_FILE, 'utf8')) as CohortFile
    : null
  console.log(JSON.stringify({
    cohort: cohort?.selection ?? null,
    targets: listJson(TARGET_DIR).length,
    research: listJson(RESEARCH_DIR).length,
    verified: listJson(VERIFIED_DIR).length,
    rejected: listJson(REJECTED_DIR).length,
    applied: listJson(APPLIED_DIR).length,
    paths: {
      work_root: WORK_ROOT,
      targets: TARGET_DIR,
      research: RESEARCH_DIR,
      verified: VERIFIED_DIR,
      rejected: REJECTED_DIR,
      applied: APPLIED_DIR,
    },
  }, null, 1))
}

async function commitVerified() {
  ensureWorkDirs()
  const dry = process.argv.includes('--dry')
  const fileArg = argOf('file')
  const limitArg = argOf('limit')
  const names = fileArg
    ? [path.basename(fileArg)]
    : listJson(VERIFIED_DIR)
  const limit = limitArg ? Math.min(names.length, Number.parseInt(limitArg, 10)) : names.length
  let ready = 0
  let applied = 0
  let held = 0
  let failed = 0
  const cacheTags: string[] = []

  for (const name of names.slice(0, limit)) {
    const sourceFile = fileArg ? path.resolve(fileArg) : path.join(VERIFIED_DIR, name)
    let verified: VerifiedFile
    try {
      verified = JSON.parse(readFileSync(sourceFile, 'utf8')) as VerifiedFile
    } catch (error) {
      console.log(`FAILED ${name} — JSON 읽기 실패: ${(error as Error).message}`)
      failed++
      continue
    }
    const errors = validateVerified(verified)
    if (errors.length > 0) {
      console.log(`HELD ${verified.target?.profile?.slug ?? name} — ${errors.join(' / ')}`)
      held++
      continue
    }

    const { target, events } = verified
    const { data: profile, error: profileError } = await db
      .from('celebs')
      .select('id,slug,celeb_tier,publication_status')
      .eq('id', target.profile.id)
      .single()
    if (profileError || !profile || profile.slug !== target.profile.slug ||
      profile.publication_status !== 'active' || profile.celeb_tier === 'fiction') {
      console.log(`HELD ${target.profile.slug} — 라이브 인물 신원·상태가 달라졌다`)
      held++
      continue
    }

    const before = await fetchStoredEvents(target.profile.id)
    const currentFingerprint = timelineFingerprint(before)
    if (currentFingerprint !== target.base_fingerprint) {
      console.log(`HELD ${target.profile.slug} — 조사 시작 뒤 라이브 연표가 바뀌었다`)
      held++
      continue
    }
    ready++
    if (dry) {
      console.log(`READY ${target.profile.slug} — ${before.length}건 → ${events.length}건`)
      continue
    }

    const backupFile = path.join(BACKUP_DIR, `${target.profile.slug}-${currentFingerprint}.json`)
    if (!existsSync(backupFile)) {
      writeFileSync(backupFile, JSON.stringify({
        slug: target.profile.slug,
        celeb_id: target.profile.id,
        fingerprint: currentFingerprint,
        events: before,
      }, null, 1), 'utf8')
    }
    const rows = events.map((event, index) => ({
      celeb_id: target.profile.id,
      ...eventPayload(event),
      source: 'manual',
      sort_order: (index + 1) * 10,
    }))

    const restore = async () => {
      await db.from('celeb_timeline_events').delete().eq('celeb_id', target.profile.id)
      if (before.length > 0) {
        const { error } = await db.from('celeb_timeline_events').insert(before)
        if (error) throw new Error(`원본 복구 실패: ${error.message}`)
      }
    }

    try {
      const { error: deleteError } = await db
        .from('celeb_timeline_events')
        .delete()
        .eq('celeb_id', target.profile.id)
      if (deleteError) throw new Error(`기존 연표 삭제 실패: ${deleteError.message}`)
      const { error: insertError } = await db.from('celeb_timeline_events').insert(rows)
      if (insertError) throw new Error(`새 연표 삽입 실패: ${insertError.message}`)
      const after = await fetchStoredEvents(target.profile.id)
      if (JSON.stringify(after.map(storedPayload)) !== JSON.stringify(events.map(eventPayload))) {
        throw new Error('저장 뒤 재조회 값이 작성본과 다르다')
      }
    } catch (error) {
      try {
        await restore()
        console.log(`FAILED ${target.profile.slug} — ${(error as Error).message}; 원본 ${before.length}건 복구 완료`)
      } catch (restoreError) {
        throw new Error(`CRITICAL ${target.profile.slug} — ${(error as Error).message}; ${(restoreError as Error).message}`)
      }
      failed++
      continue
    }

    const destination = path.join(APPLIED_DIR, name)
    if (existsSync(destination)) throw new Error(`반영 파일이 이미 존재한다: ${destination}`)
    renameSync(sourceFile, destination)
    cacheTags.push(
      `celebs:${target.profile.id}`,
      `celebs:${target.profile.slug}`,
      'celebs',
    )
    console.log(`OK ${target.profile.slug} — ${before.length}건 → ${events.length}건 저장·왕복 확인`)
    applied++
  }

  if (!dry && cacheTags.length > 0) {
    const tags = [...new Set(cacheTags)]
    await revalidateCelebCache(tags)
    console.log(`CACHE OK — ${tags.length}개 태그 재검증`)
  }
  console.log(JSON.stringify({ dry, ready, applied, held, failed }))
  if (failed > 0) process.exitCode = 1
}

async function main() {
  const command = process.argv[2]
  if (command === 'prepare') return prepareCohort()
  if (command === 'status') return status()
  if (command === 'commit') return commitVerified()
  console.error('사용법: prepare [--limit 1000] [--force] | status | commit [--dry] [--file PATH] [--limit N]')
  process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
