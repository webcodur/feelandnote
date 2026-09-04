/**
 * active fiction 인물의 현재 연표와 대표 원전 연결을 후보 작성용 seed로 고정한다.
 * DB를 수정하거나 외부 모델·모델 CLI를 호출하지 않는다.
 *
 * pnpm exec tsx scripts/celeb/timeline/prepare-narrative-candidates.ts --all-active
 * pnpm exec tsx scripts/celeb/timeline/prepare-narrative-candidates.ts --slugs=achilles,athena
 * pnpm exec tsx scripts/celeb/timeline/prepare-narrative-candidates.ts --slugs=absyrtus --allow-inactive
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  NARRATIVE_CANDIDATE_SCHEMA_VERSION,
  assertExplicitInactiveSlugMode,
  fetchFictionProfileBySlug,
  fetchStoredTimelineEventsByCeleb,
  fingerprintNarrativeProfile,
  fingerprintStoredEvents,
  loadFigureBookSnapshots,
  type NarrativeCandidateSeed,
  type NarrativeProfileSnapshot,
  type FigureBookSnapshot,
} from './narrative-candidate-contract'

const PROFILE_SELECT = [
  'id',
  'slug',
  'nickname',
  'nickname_en',
  'publication_status',
  'celeb_reality',
  'birth_date',
  'death_date',
  'headline',
  'bio',
  'profession',
  'nationality',
].join(',')

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

async function loadActiveFictionProfiles(): Promise<NarrativeProfileSnapshot[]> {
  const profiles: NarrativeProfileSnapshot[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select(PROFILE_SELECT)
      .in('celeb_reality', ['FICTION', 'BOTH'])
      .eq('publication_status', 'active')
      .order('slug')
      .range(from, from + 999)
    if (error) throw new Error(`active fiction 인물 조회 실패: ${error.message}`)
    const page = (data ?? []) as unknown as NarrativeProfileSnapshot[]
    profiles.push(...page)
    if (page.length < 1000) break
  }
  return profiles
}

async function loadSelectedProfiles(
  slugs: string[],
  allowInactive: boolean,
): Promise<NarrativeProfileSnapshot[]> {
  const profiles: NarrativeProfileSnapshot[] = []
  for (const slug of slugs) {
    const profile = await fetchFictionProfileBySlug(db, slug)
    if (!profile) throw new Error(`${slug}: 인물이 없다`)
    if (profile.celeb_reality === 'REAL') throw new Error(`${slug}: 서사 연표 대상(FICTION·BOTH)이 아니다`)
    if (profile.publication_status !== 'active'
      && !(allowInactive && profile.publication_status === 'inactive')) {
      const hint = profile.publication_status === 'inactive'
        ? ' (--allow-inactive와 명시적인 --slugs가 필요)'
        : ''
      throw new Error(`${slug}: 허용된 공개 상태가 아니다 (${profile.publication_status})${hint}`)
    }
    profiles.push(profile)
  }
  return profiles
}

function assertExistingArtifactCurrent(
  file: string,
  beforeFingerprint: string,
  sourceFingerprint: string,
  profileFingerprint: string,
  requireProfileFingerprint: boolean,
  label: string,
) {
  const value = JSON.parse(readFileSync(file, 'utf8')) as {
    before_fingerprint?: unknown
    profile_fingerprint?: unknown
    source_snapshot?: { fingerprint?: unknown }
  }
  if (value.before_fingerprint !== beforeFingerprint) {
    throw new Error(`${label}: 기존 산출물의 DB 지문이 현재와 다르다: ${file}`)
  }
  if (value.source_snapshot?.fingerprint !== sourceFingerprint) {
    throw new Error(`${label}: 기존 산출물의 원전 스냅샷이 현재와 다르다: ${file}`)
  }
  if (value.profile_fingerprint !== undefined && value.profile_fingerprint !== profileFingerprint) {
    throw new Error(`${label}: 기존 산출물의 인물 지문이 현재와 다르다: ${file}`)
  }
  if (requireProfileFingerprint && value.profile_fingerprint !== profileFingerprint) {
    throw new Error(`${label}: inactive 산출물에는 현재 인물 지문이 필요하다: ${file}`)
  }
}

function writeSeed(
  root: string,
  profile: NarrativeProfileSnapshot,
  seed: NarrativeCandidateSeed,
  overwrite: boolean,
  requireProfileFingerprint: boolean,
): 'written' | 'unchanged' | 'candidate-preserved' {
  const directory = resolve(root, profile.slug)
  const seedFile = resolve(directory, 'seed.json')
  const candidateFile = resolve(directory, 'candidate.json')
  mkdirSync(directory, { recursive: true })

  if (existsSync(candidateFile)) {
    assertExistingArtifactCurrent(
      candidateFile,
      seed.before_fingerprint,
      seed.source_snapshot.fingerprint,
      seed.profile_fingerprint,
      requireProfileFingerprint,
      profile.slug,
    )
    return 'candidate-preserved'
  }
  if (existsSync(seedFile) && !overwrite) {
    assertExistingArtifactCurrent(
      seedFile,
      seed.before_fingerprint,
      seed.source_snapshot.fingerprint,
      seed.profile_fingerprint,
      requireProfileFingerprint,
      profile.slug,
    )
    return 'unchanged'
  }

  writeFileSync(seedFile, `${JSON.stringify(seed, null, 2)}\n`, 'utf8')
  return 'written'
}

type SourceIndexGroup = {
  content_id: string
  title_ko: string | null
  title_en: string | null
  character_slugs: string[]
}

function sourceTitle(snapshot: FigureBookSnapshot, contentId: string, locale: string): string | null {
  const assignment = snapshot.assignments.find((item) => item.content_id === contentId)
  return assignment?.locales.find((item) => item.locale === locale)?.title ?? null
}

function writeSourceIndex(
  root: string,
  profiles: NarrativeProfileSnapshot[],
  snapshots: Map<string, FigureBookSnapshot>,
) {
  const groups = new Map<string, SourceIndexGroup>()
  const unlinked: string[] = []
  const sourceIdsBySlug: Record<string, string[]> = {}

  for (const profile of profiles) {
    const snapshot = snapshots.get(profile.id)
    if (!snapshot) throw new Error(`${profile.slug}: 원전 스냅샷 없음`)
    const sourceIds = snapshot.assignments.map((assignment) => assignment.content_id)
    sourceIdsBySlug[profile.slug] = sourceIds
    if (sourceIds.length === 0) unlinked.push(profile.slug)
    for (const contentId of sourceIds) {
      const current = groups.get(contentId) ?? {
        content_id: contentId,
        title_ko: sourceTitle(snapshot, contentId, 'ko'),
        title_en: sourceTitle(snapshot, contentId, 'en'),
        character_slugs: [],
      }
      current.character_slugs.push(profile.slug)
      groups.set(contentId, current)
    }
  }

  const index = {
    schema_version: NARRATIVE_CANDIDATE_SCHEMA_VERSION,
    population: profiles.every((profile) => profile.publication_status === 'active')
      ? 'active-fiction'
      : 'selected-fiction-including-inactive',
    profiles: profiles.map((profile) => profile.slug),
    groups: [...groups.values()]
      .map((group) => ({ ...group, character_slugs: group.character_slugs.sort() }))
      .sort((a, b) => (a.title_ko ?? a.title_en ?? a.content_id)
        .localeCompare(b.title_ko ?? b.title_en ?? b.content_id, 'ko')),
    source_ids_by_slug: Object.fromEntries(
      Object.entries(sourceIdsBySlug).sort(([a], [b]) => a.localeCompare(b)),
    ),
    unlinked: unlinked.sort(),
  }
  mkdirSync(root, { recursive: true })
  writeFileSync(resolve(root, 'source-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
}

async function main() {
  const root = resolve(argOf('root') ?? '.tmp-fiction-timeline')
  const slugs = parseSlugs()
  const allActive = process.argv.includes('--all-active')
  const allowInactive = process.argv.includes('--allow-inactive')
  const overwrite = process.argv.includes('--overwrite')
  if (allActive === (slugs.length > 0)) {
    throw new Error('--all-active 또는 --slugs 중 하나만 지정한다')
  }
  assertExplicitInactiveSlugMode({
    allowInactive,
    slugs,
    usesAllTargetMode: allActive,
  })

  const profiles = allActive
    ? await loadActiveFictionProfiles()
    : await loadSelectedProfiles(slugs, allowInactive)
  if (profiles.length === 0) throw new Error('준비할 fiction 인물이 없다')

  const celebIds = profiles.map((profile) => profile.id)
  const [eventsByCeleb, sourceSnapshots] = await Promise.all([
    fetchStoredTimelineEventsByCeleb(db, celebIds),
    loadFigureBookSnapshots(db, celebIds),
  ])

  let written = 0
  let unchanged = 0
  let candidatePreserved = 0
  for (const profile of profiles) {
    const beforeEvents = eventsByCeleb.get(profile.id) ?? []
    const sourceSnapshot = sourceSnapshots.get(profile.id)
    if (!sourceSnapshot) throw new Error(`${profile.slug}: 원전 스냅샷 없음`)
    const seed: NarrativeCandidateSeed = {
      schema_version: NARRATIVE_CANDIDATE_SCHEMA_VERSION,
      slug: profile.slug,
      celeb_id: profile.id,
      celeb_reality: profile.celeb_reality === 'BOTH' ? 'BOTH' : 'FICTION',
      profile,
      profile_fingerprint: fingerprintNarrativeProfile(profile),
      before_events: beforeEvents,
      before_fingerprint: fingerprintStoredEvents(beforeEvents),
      source_snapshot: sourceSnapshot,
    }
    const result = writeSeed(
      root,
      profile,
      seed,
      overwrite,
      profile.publication_status === 'inactive',
    )
    if (result === 'written') written += 1
    if (result === 'unchanged') unchanged += 1
    if (result === 'candidate-preserved') candidatePreserved += 1
    console.log(`SEED ${profile.slug} — 사건 ${beforeEvents.length}, 원전 ${sourceSnapshot.assignments.length}, ${result}`)
  }

  writeSourceIndex(root, profiles, sourceSnapshots)
  console.log(`DONE fiction ${profiles.length}명 — 작성 ${written}, 동일 ${unchanged}, 후보 보존 ${candidatePreserved}`)
  console.log(`INDEX ${resolve(root, 'source-index.json')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
