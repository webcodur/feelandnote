/**
 * 인물 읽어보기(인물 안내 + 인물 탐구) 2회 집필 배치.
 * 규칙 SSoT: docs/project/celeb/person-reading.md
 *
 * 실행 예:
 *   pnpm exec tsx scripts/generate-celeb-readings.ts --slugs=hegel,werner-heisenberg --plan
 *   pnpm exec tsx scripts/generate-celeb-readings.ts --slugs=hegel,werner-heisenberg --generate
 *   pnpm exec tsx scripts/generate-celeb-readings.ts --slugs=hegel,werner-heisenberg --apply --resume
 *   pnpm exec tsx scripts/generate-celeb-readings.ts --all --generate --apply --resume
 */

import { createHash } from 'node:crypto'
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  codexCall,
  looksRateLimited,
} from '../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

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

const flagValue = (name: string): string | null => {
  const prefix = `${name}=`
  const inline = process.argv.find((value) => value.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}
const numberFlag = (name: string, fallback: number) => {
  const raw = flagValue(name)
  if (raw === null) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} 값이 잘못됐다: ${raw}`)
  return value
}

const PLAN = process.argv.includes('--plan')
const GENERATE = process.argv.includes('--generate')
const APPLY = process.argv.includes('--apply')
const STATS = process.argv.includes('--stats')
const RESEARCH = process.argv.includes('--research')
const DEEP_RESEARCH = process.argv.includes('--deep-research')
const RESUME = process.argv.includes('--resume')
const EXPLAIN_HOLDS = process.argv.includes('--explain-holds')
const VERBOSE = process.argv.includes('--verbose')
const INCLUDE_EXISTING = process.argv.includes('--include-existing')
const REWRITE_EXISTING = process.argv.includes('--rewrite-existing')
const REVIEW_EXISTING = process.argv.includes('--review-existing')
const ALL = process.argv.includes('--all')
const LIMIT = numberFlag('--limit', Number.POSITIVE_INFINITY)
const BATCH_SIZE = numberFlag('--batch-size', 8)
const CONCURRENCY = numberFlag('--conc', 24)
const MODEL = flagValue('--model') ?? 'gpt-5.6-sol'
const SLUGS = (() => {
  const raw = flagValue('--slugs')
  return raw ? new Set(raw.split(',').map((slug) => slug.trim()).filter(Boolean)) : null
})()

if (!PLAN && !GENERATE && !APPLY && !STATS) {
  throw new Error('--plan, --generate, --apply, --stats 가운데 하나 이상을 지정해야 한다.')
}
if (!STATS && !ALL && !SLUGS && LIMIT === Number.POSITIVE_INFINITY) {
  throw new Error('안전 중단: --all, --slugs, 유한한 --limit 가운데 하나가 필요하다.')
}
if (APPLY && !GENERATE && !RESUME) {
  throw new Error('저장된 개선본만 반영할 때는 --apply --resume을 함께 지정한다.')
}
if (RESEARCH && !GENERATE && !STATS) {
  throw new Error('--research는 새 재료로 다시 쓰는 --generate와 함께 지정한다.')
}
if (DEEP_RESEARCH && !RESEARCH) {
  throw new Error('--deep-research는 --research와 함께 지정한다.')
}
if (INCLUDE_EXISTING && !PLAN && !STATS) {
  throw new Error('--include-existing은 읽기 전용 --plan 또는 --stats와 함께만 쓸 수 있다.')
}
if (REVIEW_EXISTING && !REWRITE_EXISTING) {
  throw new Error('--review-existing은 --rewrite-existing과 함께 지정한다.')
}
if (REWRITE_EXISTING && !SLUGS && !(ALL && REVIEW_EXISTING)) {
  throw new Error('--rewrite-existing은 명시적인 --slugs 또는 --all --review-existing과 함께 지정한다.')
}
if (REWRITE_EXISTING && !GENERATE && !(APPLY && RESUME)) {
  throw new Error('--rewrite-existing은 --generate 또는 --apply --resume과 함께 써야 한다.')
}

const ROOT = resolve(process.cwd(), '.tmp-celeb-reading')
const DRAFT_DIR = join(ROOT, 'drafts')
const FINAL_DIR = join(ROOT, 'finals')
const REVIEW_DIR = join(ROOT, 'reviews')
const FAILURE_LOG = join(ROOT, 'failures.jsonl')
const RESEARCH_FILE = join(ROOT, 'verified-identity-research-v3.json')
const DEEP_RESEARCH_FILE = join(ROOT, 'deep-research-v1.json')
const RESEARCH_OVERRIDES_FILE = resolve(process.cwd(), 'scripts/celeb-reading-research-overrides.json')
const RUN_LOCK_FILE = join(ROOT, 'run.lock')
const PIPELINE_VERSION = '2026-08-04-bilingual-review-status-v11'
const REVIEW_VERSION = '2026-08-04-pre-review-v1'
const DEEP_RESEARCH_VERSION = '2026-08-04-english-json-v2'
for (const directory of [ROOT, DRAFT_DIR, FINAL_DIR, REVIEW_DIR]) {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
}

function acquireRunLock() {
  const tryAcquire = () => {
    const fd = openSync(RUN_LOCK_FILE, 'wx')
    writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), 'utf8')
    closeSync(fd)
  }
  try {
    tryAcquire()
  } catch (error) {
    if (!existsSync(RUN_LOCK_FILE)) throw error
    const saved = JSON.parse(readFileSync(RUN_LOCK_FILE, 'utf8')) as { pid?: number }
    let alive = false
    if (saved.pid) {
      try {
        process.kill(saved.pid, 0)
        alive = true
      } catch {
        alive = false
      }
    }
    if (alive) throw new Error(`다른 읽어보기 배치가 실행 중이다. pid=${saved.pid}`)
    unlinkSync(RUN_LOCK_FILE)
    tryAcquire()
  }
  const release = () => {
    if (!existsSync(RUN_LOCK_FILE)) return
    try {
      const saved = JSON.parse(readFileSync(RUN_LOCK_FILE, 'utf8')) as { pid?: number }
      if (saved.pid === process.pid) unlinkSync(RUN_LOCK_FILE)
    } catch {
      // 손상된 락은 다음 실행에서 명시적으로 검사한다.
    }
  }
  process.once('exit', release)
  process.once('SIGINT', () => {
    release()
    process.exit(130)
  })
  process.once('SIGTERM', () => {
    release()
    process.exit(143)
  })
}

if (RESEARCH || GENERATE || APPLY) acquireRunLock()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type ProfileRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  bio: string | null
  profession: string | null
  title: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  publication_status: 'active' | 'inactive' | 'suspended'
  celeb_tier: string | null
  wikidata_qid: string | null
  virtual_monologue: string | null
}

type ExplanationRow = {
  profile_id: string
  review_status: 'ai_reviewed' | 'human_reviewed' | null
  published_at: string | null
  plain_text: string
  interpretive_title: string
  interpretive_text: string
  plain_text_en: string | null
  interpretive_title_en: string | null
  interpretive_text_en: string | null
  updated_at: string
}

type TimelineRow = {
  celeb_id: string
  year: number | null
  year_end: number | null
  sequence_label: string | null
  title: string
  description: string | null
  source: string
  source_url: string | null
  sort_order: number
}

type Material = {
  profile: ProfileRow
  events: TimelineRow[]
  contexts: FactionContext[]
  research: ResearchExcerpt | null
  existingExplanation: ExplanationRow | null
}

type FactionContextRow = {
  celeb_id: string
  tag_id: string
  short_desc: string | null
  long_desc: string | null
  group_label: string | null
  group_label_en: string | null
  group_subtitle: string | null
  group_subtitle_en: string | null
}

type TagRow = {
  id: string
  name: string
  name_en: string | null
  slug: string
}

type FactionContext = {
  theme: string
  themeEn: string | null
  themeSlug: string
  group: string | null
  groupEn: string | null
  groupSubtitle: string | null
  groupSubtitleEn: string | null
  shortDescription: string | null
  longDescription: string | null
}

type ResearchExcerpt = {
  qid: string | null
  locale: 'ko' | 'en'
  title: string
  summary: string
  url: string
  matchedBy: 'profile-qid' | 'exact-title' | 'wikipedia-search' | 'wikidata-search' | 'manual-authority' | 'web-deep-research'
  additionalSources?: DeepResearchSource[]
}

type DeepResearchSource = {
  title: string
  url: string
  sourceTier: 'primary' | 'scholarly' | 'reference' | 'official'
  scope: 'plain' | 'interpretation' | 'both'
  summary: string
}

type Reading = {
  slug: string
  guide: string
  explorationTitle: string
  explorationText: string
  guideEn: string
  explorationTitleEn: string
  explorationTextEn: string
  holdReason: string | null
}

type SavedReading = Reading & {
  stage: 'draft' | 'final'
  model: string
  generatedAt: string
  inputHash: string
  validationErrors: string[]
}

type ExistingReview = {
  slug: string
  verdict: 'pass' | 'rewrite'
  reason: string
}

type SavedExistingReview = ExistingReview & {
  model: string
  reviewedAt: string
  inputHash: string
}

async function fetchAll<T>(
  table: string,
  select: string,
  // 여러 테이블의 PostgREST 빌더를 한 페이지네이터로 받기 위한 경계다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (query: any) => any = (query) => query,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(
      supabase.from(table).select(select).range(from, from + 999),
    )
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

function selectEvents(rows: TimelineRow[]): TimelineRow[] {
  const sorted = [...rows].sort((a, b) =>
    (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER)
    || a.sort_order - b.sort_order,
  )
  if (sorted.length <= 8) return sorted

  const indices = new Set([0, 1, sorted.length - 2, sorted.length - 1])
  for (let step = 1; step <= 4; step += 1) {
    indices.add(Math.round((step * (sorted.length - 1)) / 5))
  }
  return [...indices].sort((a, b) => a - b).map((index) => sorted[index])
}

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

let researchFetchGate: Promise<void> = Promise.resolve()
let nextResearchFetchAt = 0

async function waitForResearchFetchSlot() {
  const turn = researchFetchGate.then(async () => {
    const waitMs = Math.max(0, nextResearchFetchAt - Date.now())
    if (waitMs) await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs))
    nextResearchFetchAt = Date.now() + 1_100
  })
  researchFetchGate = turn.catch(() => undefined)
  await turn
}

async function fetchJson(url: string): Promise<unknown> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await waitForResearchFetchSlot()
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FeelandNote/1.0 (person-reading research)' },
        signal: AbortSignal.timeout(12_000),
      })
      if (response.status === 429) {
        const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10)
        const waitMs = Number.isFinite(retryAfter)
          ? Math.min(retryAfter * 1000, 120_000)
          : attempt * 2_000
        nextResearchFetchAt = Math.max(nextResearchFetchAt, Date.now() + waitMs)
        await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs))
        continue
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.json()
    } catch (error) {
      if (attempt === 3) throw error
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 750))
    }
  }
  throw new Error('JSON 조회가 속도 제한 뒤에도 실패했다.')
}

type WikipediaPage = {
  qid: string | null
  locale: 'ko' | 'en'
  title: string
  summary: string
  url: string
}

function cleanSummary(value: string | undefined, maxLength = 2400): string {
  return value?.replace(/\s+/g, ' ').trim().slice(0, maxLength) ?? ''
}

function normalizeIdentity(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, ' ')
    .trim()
}

function identityScore(profile: ProfileRow, title: string, summary: string): number {
  const titleKey = normalizeIdentity(title)
  const names = [profile.nickname, profile.nickname_en, profile.slug.replace(/[-_.]+/g, ' ')]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeIdentity)
  let score = 0
  for (const name of names) {
    if (titleKey === name) score = Math.max(score, 100)
    else if (titleKey.includes(name) || name.includes(titleKey)) score = Math.max(score, 75)
    else {
      const tokens = name.split(' ').filter((token) => token.length >= 2)
      const matches = tokens.filter((token) => titleKey.includes(token)).length
      if (tokens.length && matches === tokens.length) score = Math.max(score, 65)
      else if (matches) score = Math.max(score, 25 + matches * 10)
    }
  }
  const haystack = normalizeIdentity(summary)
  if (names.some((name) => name.length >= 4 && haystack.includes(name))) score = Math.max(score, 70)
  return score
}

function identityAnchors(profile: ProfileRow, contexts: FactionContext[]): string[] {
  const raw = [
    profile.title,
    profile.bio,
    ...contexts.flatMap((context) => [
      context.themeEn,
      context.theme,
      context.group,
      context.groupEn,
      context.groupSubtitle,
      context.groupSubtitleEn,
      context.shortDescription,
      context.longDescription,
    ]),
  ].filter((value): value is string => Boolean(value?.trim()))
  const anchors = new Set<string>()
  for (const value of raw) {
    const whole = normalizeIdentity(value)
    if (value === profile.title && whole.length >= 3) anchors.add(whole)
    for (const token of value.match(/[A-Za-z][A-Za-z0-9.+-]{2,}/g) ?? []) {
      const normalized = normalizeIdentity(token)
      if (![
        'and', 'the', 'with', 'from', 'group', 'actor', 'singer', 'member', 'members',
        'current', 'girl', 'boy', 'music', 'musician', 'korea', 'korean',
      ].includes(normalized)) anchors.add(normalized)
    }
  }
  return [...anchors]
}

function researchMatchesIdentity(
  profile: ProfileRow,
  contexts: FactionContext[],
  page: Pick<WikipediaPage, 'title' | 'summary'>,
): boolean {
  const score = identityScore(profile, page.title, page.summary)
  const haystack = normalizeIdentity(`${page.title} ${page.summary}`)
  const normalizedPageTitle = normalizeIdentity(page.title)
  const normalizedNames = [profile.nickname, profile.nickname_en]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeIdentity)
  const birthYear = profile.birth_date?.slice(0, 4)
  const introYears: string[] = page.summary.slice(0, 220).match(/\b(?:1\d{3}|20\d{2})\b/g) ?? []
  const titleStartsWithName = normalizedNames.some((name) => normalizedPageTitle.startsWith(name))
  if (birthYear && introYears.length && titleStartsWithName && !introYears.includes(birthYear)) return false
  const exactLongName = normalizedNames
    .some((name) => name.length >= 4 && normalizedPageTitle === name)
  if (score >= 100 && exactLongName) return true
  if (profile.title?.trim()) {
    const requiredAnchors = [
      normalizeIdentity(profile.title),
      ...contexts.flatMap((context) => [context.group, context.groupEn])
        .filter((value): value is string => Boolean(value?.trim()))
        .map(normalizeIdentity),
    ].filter((anchor) => anchor.length >= 2)
    if (requiredAnchors.length && !requiredAnchors.some((anchor) => haystack.includes(anchor))) return false
  }
  if (score >= 100) return true
  if (score < 65) return false
  return identityAnchors(profile, contexts).some((anchor) => anchor.length >= 3 && haystack.includes(anchor))
}

async function wikipediaPageByTitle(
  locale: 'ko' | 'en',
  title: string,
): Promise<WikipediaPage | null> {
  const url = `https://${locale}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await waitForResearchFetchSlot()
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FeelandNote/1.0 (person-reading research)' },
        signal: AbortSignal.timeout(12_000),
      })
      if (response.status === 404) return null
      if (response.status === 429) {
        const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10)
        const waitMs = Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 120_000) : 2_000
        nextResearchFetchAt = Math.max(nextResearchFetchAt, Date.now() + waitMs)
        await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs))
        continue
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const page = await response.json() as {
        type?: string
        title?: string
        extract?: string
        wikibase_item?: string
        content_urls?: { desktop?: { page?: string } }
      }
      const summary = cleanSummary(page.extract)
      const resolvedTitle = page.title?.trim()
      if (page.type === 'disambiguation' || !summary || !resolvedTitle) return null
      return {
        qid: page.wikibase_item ?? null,
        locale,
        title: resolvedTitle,
        summary,
        url: page.content_urls?.desktop?.page
          ?? `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
      }
    } catch (error) {
      if (attempt === 2) throw error
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 750))
    }
  }
  return null
}

async function wikipediaArticleByTitle(
  locale: 'ko' | 'en',
  title: string,
): Promise<WikipediaPage | null> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|pageprops',
    titles: title,
    redirects: '1',
    explaintext: '1',
    exsectionformat: 'plain',
    ppprop: 'wikibase_item|disambiguation',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const result = await fetchJson(`https://${locale}.wikipedia.org/w/api.php?${params}`) as {
    query?: { pages?: Array<{
      title?: string
      extract?: string
      missing?: boolean
      pageprops?: { wikibase_item?: string; disambiguation?: string }
    }> }
  }
  const page = result.query?.pages?.[0]
  const resolvedTitle = page?.title?.trim()
  const summary = cleanSummary(page?.extract, 5000)
  if (!page || page.missing || page.pageprops?.disambiguation !== undefined || !resolvedTitle || !summary) return null
  return {
    qid: page.pageprops?.wikibase_item ?? null,
    locale,
    title: resolvedTitle,
    summary,
    url: `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
  }
}

async function enrichWikipediaPage(page: WikipediaPage): Promise<WikipediaPage> {
  return await wikipediaArticleByTitle(page.locale, page.title).catch(() => null) ?? page
}

async function wikidataSitelinkTitles(qid: string): Promise<{ ko?: string; en?: string }> {
  const result = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`) as {
    entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>
  }
  const sitelinks = result.entities?.[qid]?.sitelinks
  return { ko: sitelinks?.kowiki?.title, en: sitelinks?.enwiki?.title }
}

async function wikipediaSearch(
  profile: ProfileRow,
  contexts: FactionContext[],
  locale: 'ko' | 'en',
  query: string,
): Promise<WikipediaPage | null> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '0',
    gsrlimit: '5',
    prop: 'extracts|pageprops',
    exintro: '1',
    exsentences: '10',
    explaintext: '1',
    ppprop: 'wikibase_item|disambiguation',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const result = await fetchJson(`https://${locale}.wikipedia.org/w/api.php?${params}`) as {
    query?: { pages?: Array<{
      title?: string
      extract?: string
      pageprops?: { wikibase_item?: string; disambiguation?: string }
    }> }
  }
  const candidates = (result.query?.pages ?? [])
    .filter((page) => page.pageprops?.disambiguation === undefined)
    .map((page) => ({
      page,
      title: page.title?.trim() ?? '',
      summary: cleanSummary(page.extract),
      score: identityScore(profile, page.title ?? '', page.extract ?? ''),
    }))
    .filter((candidate) => candidate.title && candidate.summary && researchMatchesIdentity(profile, contexts, candidate))
    .sort((a, b) => b.score - a.score || b.summary.length - a.summary.length)
  const selected = candidates[0]
  if (!selected) return null
  return {
    qid: selected.page.pageprops?.wikibase_item ?? null,
    locale,
    title: selected.title,
    summary: selected.summary,
    url: `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(selected.title.replace(/ /g, '_'))}`,
  }
}

async function wikidataSearch(profile: ProfileRow, contexts: FactionContext[]): Promise<ResearchExcerpt | null> {
  const query = profile.nickname_en?.trim() || profile.nickname.trim()
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language: profile.nickname_en ? 'en' : 'ko',
    uselang: 'en',
    type: 'item',
    limit: '7',
    format: 'json',
    origin: '*',
  })
  const result = await fetchJson(`https://www.wikidata.org/w/api.php?${params}`) as {
    search?: Array<{ id?: string; label?: string; description?: string; aliases?: string[] }>
  }
  const candidates = (result.search ?? []).map((item) => {
    const aliases = item.aliases?.join(' ') ?? ''
    const summary = [item.label, aliases, item.description].filter(Boolean).join('. ')
    return {
      item,
      score: identityScore(profile, item.label ?? '', summary),
      summary,
    }
  }).filter((candidate) => candidate.item.id
      && candidate.item.label
      && candidate.item.description
      && researchMatchesIdentity(profile, contexts, { title: candidate.item.label, summary: candidate.summary }))
    .sort((a, b) => b.score - a.score)
  const selected = candidates[0]
  if (!selected?.item.id || !selected.item.label) return null
  return {
    qid: selected.item.id,
    locale: 'en',
    title: selected.item.label,
    summary: selected.summary,
    url: `https://www.wikidata.org/wiki/${selected.item.id}`,
    matchedBy: 'wikidata-search',
  }
}

function exactTitleCandidates(profile: ProfileRow): Array<{ locale: 'ko' | 'en'; title: string }> {
  const rows: Array<{ locale: 'ko' | 'en'; title: string }> = []
  const add = (locale: 'ko' | 'en', title: string | null | undefined) => {
    const cleaned = title?.trim()
    if (cleaned && !rows.some((row) => row.locale === locale && normalizeIdentity(row.title) === normalizeIdentity(cleaned))) {
      rows.push({ locale, title: cleaned })
    }
  }
  add('ko', profile.nickname)
  add('en', profile.nickname_en)
  const slugTitle = profile.slug.replace(/[._-]+/g, ' ').trim()
  add('en', slugTitle)
  add('en', slugTitle.replace(/^(king|duke|emperor|empress|lord|consort|colonel)\s+/i, ''))
  return rows
}

function searchCandidates(
  profile: ProfileRow,
  contexts: FactionContext[],
): Array<{ locale: 'ko' | 'en'; title: string }> {
  const rows: Array<{ locale: 'ko' | 'en'; title: string }> = []
  const add = (locale: 'ko' | 'en', name: string | null | undefined, context: string | null | undefined) => {
    const query = [name?.trim(), context?.trim()].filter(Boolean).join(' ')
    if (query && !rows.some((row) => row.locale === locale && normalizeIdentity(row.title) === normalizeIdentity(query))) {
      rows.push({ locale, title: query })
    }
  }
  add('ko', profile.nickname, profile.title)
  add('en', profile.nickname_en, contexts.find((context) => context.groupEn)?.groupEn)
  add('ko', profile.nickname, contexts.find((context) => context.group)?.group)
  rows.push(...exactTitleCandidates(profile).filter((candidate) =>
    !rows.some((row) => row.locale === candidate.locale && normalizeIdentity(row.title) === normalizeIdentity(candidate.title))))
  return rows
}

async function researchOneProfile(
  profile: ProfileRow,
  contexts: FactionContext[],
): Promise<ResearchExcerpt | null> {
  const verifiedQid = /^Q\d+$/.test(profile.wikidata_qid ?? '') ? profile.wikidata_qid! : null
  const exactPages = (await Promise.all(exactTitleCandidates(profile).map((candidate) =>
    wikipediaPageByTitle(candidate.locale, candidate.title).catch(() => null))))
    .filter((page): page is WikipediaPage => Boolean(page))

  if (verifiedQid) {
    let pages = exactPages.filter((page) => page.qid === verifiedQid)
    if (!pages.length) {
      const titles: { ko?: string; en?: string } = await wikidataSitelinkTitles(verifiedQid).catch(() => ({}))
      pages = (await Promise.all([
        titles.ko ? wikipediaPageByTitle('ko', titles.ko).catch(() => null) : null,
        titles.en ? wikipediaPageByTitle('en', titles.en).catch(() => null) : null,
      ])).filter((page): page is WikipediaPage => Boolean(page && page.qid === verifiedQid))
    }
    const page = pages.sort((a, b) => b.summary.length - a.summary.length)[0]
    if (page) return { ...await enrichWikipediaPage(page), matchedBy: 'profile-qid' }
  }

  const exact = exactPages
    .filter((page) => researchMatchesIdentity(profile, contexts, page))
    .sort((a, b) => b.summary.length - a.summary.length)[0]
  if (exact) return { ...await enrichWikipediaPage(exact), matchedBy: 'exact-title' }

  for (const candidate of searchCandidates(profile, contexts).slice(0, 4)) {
    const page = await wikipediaSearch(profile, contexts, candidate.locale, candidate.title).catch(() => null)
    if (page) return { ...await enrichWikipediaPage(page), matchedBy: 'wikipedia-search' }
  }
  return wikidataSearch(profile, contexts).catch(() => null)
}

async function researchProfiles(
  profiles: ProfileRow[],
  contextsByProfile: Map<string, FactionContext[]>,
): Promise<Map<string, ResearchExcerpt>> {
  const overrides = existsSync(RESEARCH_OVERRIDES_FILE)
    ? JSON.parse(readFileSync(RESEARCH_OVERRIDES_FILE, 'utf8')) as Record<string, ResearchExcerpt>
    : {}
  const cached = existsSync(RESEARCH_FILE)
    ? JSON.parse(readFileSync(RESEARCH_FILE, 'utf8')) as Record<string, ResearchExcerpt | null>
    : {}
  const eligibleProfiles = profiles
  for (const profile of eligibleProfiles) {
    if (overrides[profile.slug]) {
      cached[profile.slug] = overrides[profile.slug]
      continue
    }
    const saved = cached[profile.slug]
    if (saved === null) {
      delete cached[profile.slug]
      continue
    }
    if (saved
      && saved.matchedBy !== 'profile-qid'
      && !researchMatchesIdentity(profile, contextsByProfile.get(profile.id) ?? [], saved)) {
      delete cached[profile.slug]
    }
  }
  const missing = eligibleProfiles.filter((profile) => !(profile.slug in cached))
  for (const batch of chunksOf(missing, 6)) {
    const results = await Promise.all(batch.map(async (profile) => ({
      slug: profile.slug,
      result: await researchOneProfile(profile, contextsByProfile.get(profile.id) ?? [])
        .catch((error) => {
          console.warn(`RESEARCH RETRY NEEDED ${profile.slug} | ${error instanceof Error ? error.message : String(error)}`)
          return null
        }),
    })))
    for (const row of results) cached[row.slug] = row.result
    writeFileSync(RESEARCH_FILE, `${JSON.stringify(cached, null, 2)}\n`, 'utf8')
  }

  return new Map(eligibleProfiles.flatMap((profile) => cached[profile.slug] ? [[profile.slug, cached[profile.slug]!]] : []))
}

function loadCachedResearch(
  profiles: ProfileRow[],
  contextsByProfile: Map<string, FactionContext[]>,
): Map<string, ResearchExcerpt> {
  const overrides = existsSync(RESEARCH_OVERRIDES_FILE)
    ? JSON.parse(readFileSync(RESEARCH_OVERRIDES_FILE, 'utf8')) as Record<string, ResearchExcerpt>
    : {}
  if (!existsSync(RESEARCH_FILE)) {
    return new Map(profiles.flatMap((profile) => overrides[profile.slug]
      ? [[profile.slug, overrides[profile.slug]]]
      : []))
  }
  const cached = JSON.parse(readFileSync(RESEARCH_FILE, 'utf8')) as Record<string, ResearchExcerpt | null>
  return new Map(profiles.flatMap((profile) => {
    const saved = overrides[profile.slug] ?? cached[profile.slug]
    if (!saved) return []
    if (saved.matchedBy === 'manual-authority') return [[profile.slug, saved]]
    if (saved.matchedBy === 'profile-qid') {
      return saved.qid === profile.wikidata_qid ? [[profile.slug, saved]] : []
    }
    return researchMatchesIdentity(profile, contextsByProfile.get(profile.id) ?? [], saved)
      ? [[profile.slug, saved]]
      : []
  }))
}

type DeepResearchCacheRow = {
  identityHash: string
  generatedAt: string
  sources: DeepResearchSource[]
}

function deepResearchIdentityHash(profile: ProfileRow, contexts: FactionContext[]): string {
  return createHash('sha256').update(JSON.stringify({
    version: DEEP_RESEARCH_VERSION,
    slug: profile.slug,
    name: profile.nickname,
    nameEn: profile.nickname_en,
    birthDate: profile.birth_date,
    profession: profile.profession,
    title: profile.title,
    bio: profile.bio,
    groups: contexts.map((context) => [context.theme, context.group, context.groupEn]),
  }), 'utf8').digest('hex')
}

function buildDeepResearchPrompt(
  profiles: ProfileRow[],
  contextsByProfile: Map<string, FactionContext[]>,
): string {
  const identities = profiles.map((profile) => ({
    slug: profile.slug,
    name_ko: profile.nickname,
    name_en: profile.nickname_en,
    birth_date: profile.birth_date,
    profession: profile.profession,
    affiliation_or_title: profile.title,
    bio: profile.bio,
    system_identity_context: (contextsByProfile.get(profile.id) ?? []).slice(0, 3),
  }))
  return `Read-only web research. Do not modify any file or database.

Identify every person carefully from the supplied name, birth date, affiliation, and context. Search the web in the person's original language as well as Korean or English. For each person, find two to four substantive sources that reveal a concrete work, event, decision, working method, or attributable view. Do not return an identity-only profile as the substantive result.

Source order:
1. Direct interviews, podcasts, official videos with attributable remarks, archived livestream coverage, the person's own writing, or official project material.
2. Original reporting by an established publication that names the work, event, choice, and result.
3. Scholarly or institutional sources when appropriate.

Social posts and livestreams may be used only when the speaker and exact account or authoritative coverage are identifiable. Do not invent a quotation from a paraphrase. YouTube or social URLs that cannot be checked may support discovery, but include a second accessible source. Do not use Wikipedia, Wikidata, fan wikis, profile aggregators, search-result pages, or snippets as final sources. If direct speech is scarce, report concrete work and decision evidence honestly instead of fabricating a personality.

Return only one JSON array with every input slug exactly once. Write every title and summary in English using ASCII or ordinary Latin letters. If a page has only a Korean, Japanese, or Chinese title, provide a faithful English label instead of copying those characters. Each source summary must contain only facts supported by that URL and must be detailed enough for a writer who will not open the page. Use this schema:
[{
  "slug":"input slug",
  "sources":[{
    "title":"page or episode title",
    "url":"https://...",
    "sourceTier":"primary|official|reference|scholarly",
    "scope":"plain|interpretation|both",
    "summary":"supported facts and attributable remarks, paraphrased without invented quotation"
  }]
}]

IDENTITIES:
${JSON.stringify(identities, null, 2)}`
}

function parseDeepResearch(raw: string, profiles: ProfileRow[]): Map<string, DeepResearchSource[]> {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('심화 조사 JSON 배열을 찾지 못했다.')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('심화 조사 응답이 배열이 아니다.')
  const expectedSlugs = profiles.map((profile) => profile.slug)
  const rows = parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('심화 조사 항목이 객체가 아니다.')
    const row = value as Record<string, unknown>
    const slug = String(row.slug ?? '').trim()
    if (!Array.isArray(row.sources)) throw new Error(`${slug || '(slug 없음)'} 심화 조사 sources가 배열이 아니다.`)
    const sources = row.sources.map((sourceValue) => {
      if (!sourceValue || typeof sourceValue !== 'object') throw new Error(`${slug} 출처 항목이 객체가 아니다.`)
      const source = sourceValue as Record<string, unknown>
      const sourceTier = String(source.sourceTier ?? '').trim() as DeepResearchSource['sourceTier']
      const scope = String(source.scope ?? '').trim() as DeepResearchSource['scope']
      const result: DeepResearchSource = {
        title: String(source.title ?? '').trim(),
        url: String(source.url ?? '').trim(),
        sourceTier,
        scope,
        summary: String(source.summary ?? '').replace(/\s+/g, ' ').trim(),
      }
      if (!result.title || !/^https:\/\/[^\s]+$/i.test(result.url) || result.summary.length < 80) {
        throw new Error(`${slug} 심화 조사 출처의 제목·URL·요약이 불완전하다.`)
      }
      if (/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\uFFFD]/u.test(result.title + result.summary)
        || ((result.title + result.summary).match(/\?/g) ?? []).length > 2) {
        throw new Error(`${slug} 심화 조사 출처에 비영문 또는 손상된 문자가 포함됐다.`)
      }
      if (!['primary', 'official', 'reference', 'scholarly'].includes(sourceTier)) {
        throw new Error(`${slug} sourceTier가 잘못됐다: ${sourceTier}`)
      }
      if (!['plain', 'interpretation', 'both'].includes(scope)) {
        throw new Error(`${slug} scope가 잘못됐다: ${scope}`)
      }
      if (/wikipedia\.org|wikidata\.org|google\.[^/]+\/search|bing\.com\/search/i.test(result.url)) {
        throw new Error(`${slug} 심화 조사에 금지된 검색·위키 URL이 포함됐다.`)
      }
      return result
    })
    const uniqueSources = sources.filter((source, index) =>
      sources.findIndex((candidate) => candidate.url === source.url) === index)
    return { slug, sources: uniqueSources }
  })
  const actualSlugs = rows.map((row) => row.slug)
  const missing = expectedSlugs.filter((slug) => !actualSlugs.includes(slug))
  const unexpected = actualSlugs.filter((slug) => !expectedSlugs.includes(slug))
  const duplicates = actualSlugs.filter((slug, index) => actualSlugs.indexOf(slug) !== index)
  if (missing.length || unexpected.length || duplicates.length) {
    throw new Error(`심화 조사 slug 불일치 missing=${missing.join(',')} unexpected=${unexpected.join(',')} duplicate=${duplicates.join(',')}`)
  }
  for (const row of rows) {
    if (row.sources.length < 2) throw new Error(`${row.slug} 심화 조사 출처가 2개보다 적다.`)
  }
  return new Map(rows.map((row) => [row.slug, row.sources]))
}

async function rejectExplicitlyMissingDeepSources(
  researched: Map<string, DeepResearchSource[]>,
): Promise<void> {
  const sources = [...researched.entries()].flatMap(([slug, rows]) =>
    rows.map((source) => ({ slug, source })))
  const bad: string[] = []
  const batches = chunksOf(sources, 8)
  for (const batch of batches) {
    await Promise.all(batch.map(async ({ slug, source }) => {
      try {
        const response = await fetch(source.url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FeelAndNote/1.0; person-reading source check)',
            Range: 'bytes=0-2048',
          },
          signal: AbortSignal.timeout(15_000),
        })
        if ([404, 410].includes(response.status)) bad.push(`${slug}: ${source.url} (${response.status})`)
        await response.body?.cancel()
      } catch {
        // Some publications block automated fetches. Absence is rejected only when the origin
        // explicitly returns 404 or 410; identity and content still go through model review.
      }
    }))
  }
  if (bad.length) throw new Error(`심화 조사 출처가 존재하지 않는다: ${bad.join('; ')}`)
}

async function callDeepResearch(
  profiles: ProfileRow[],
  contextsByProfile: Map<string, FactionContext[]>,
): Promise<Map<string, DeepResearchSource[]>> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const raw = await codexCall(buildDeepResearchPrompt(profiles, contextsByProfile), {
        model: MODEL,
        effort: 'medium',
        timeoutMs: 600_000,
      })
      const researched = parseDeepResearch(raw, profiles)
      await rejectExplicitlyMissingDeepSources(researched)
      return researched
    } catch (error) {
      lastError = error
      if (attempt === 2) break
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000))
    }
  }
  throw lastError
}

async function researchProfilesDeep(
  profiles: ProfileRow[],
  contextsByProfile: Map<string, FactionContext[]>,
): Promise<Map<string, DeepResearchSource[]>> {
  const cache = existsSync(DEEP_RESEARCH_FILE)
    ? JSON.parse(readFileSync(DEEP_RESEARCH_FILE, 'utf8')) as Record<string, DeepResearchCacheRow>
    : {}
  for (const profile of profiles) {
    const saved = cache[profile.slug]
    if (saved && saved.identityHash !== deepResearchIdentityHash(profile, contextsByProfile.get(profile.id) ?? [])) {
      delete cache[profile.slug]
    }
  }
  const missing = profiles.filter((profile) => !cache[profile.slug])
  const batches = chunksOf(missing, 3)
  const lanes = Array.from({ length: Math.min(6, batches.length) }, () => [] as ProfileRow[][])
  batches.forEach((batch, index) => lanes[index % lanes.length].push(batch))

  async function runResearchLane(laneIndex: number, laneBatches: ProfileRow[][]) {
    for (const batch of laneBatches) {
      try {
        const researched = await callDeepResearch(batch, contextsByProfile)
        for (const profile of batch) {
          cache[profile.slug] = {
            identityHash: deepResearchIdentityHash(profile, contextsByProfile.get(profile.id) ?? []),
            generatedAt: new Date().toISOString(),
            sources: researched.get(profile.slug) ?? [],
          }
        }
        writeFileSync(DEEP_RESEARCH_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
        console.log(`DEEP RESEARCH lane ${laneIndex + 1} | ${batch.map((profile) => profile.slug).join(',')}`)
      } catch (error) {
        logFailure(batch.map((profile) => profile.slug), 'deep-research', error)
        console.error(`DEEP RESEARCH FAIL lane ${laneIndex + 1} | ${batch.map((profile) => profile.slug).join(',')} | ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  await Promise.all(lanes.map((lane, index) => runResearchLane(index, lane)))
  return new Map(profiles.flatMap((profile) => cache[profile.slug]?.sources?.length
    ? [[profile.slug, cache[profile.slug].sources]]
    : []))
}

function loadCachedDeepResearch(
  profiles: ProfileRow[],
  contextsByProfile: Map<string, FactionContext[]>,
): Map<string, DeepResearchSource[]> {
  if (!existsSync(DEEP_RESEARCH_FILE)) return new Map()
  const cache = JSON.parse(readFileSync(DEEP_RESEARCH_FILE, 'utf8')) as Record<string, DeepResearchCacheRow>
  return new Map(profiles.flatMap((profile) => {
    const saved = cache[profile.slug]
    if (!saved?.sources?.length) return []
    const identityHash = deepResearchIdentityHash(profile, contextsByProfile.get(profile.id) ?? [])
    return saved.identityHash === identityHash ? [[profile.slug, saved.sources]] : []
  }))
}

function attachDeepResearch(
  base: ResearchExcerpt | null,
  sources: DeepResearchSource[] | undefined,
): ResearchExcerpt | null {
  if (!sources?.length) return base
  if (base) return { ...base, additionalSources: sources }
  const first = sources[0]
  return {
    qid: null,
    locale: /[가-힣]/.test(first.title + first.summary) ? 'ko' : 'en',
    title: first.title,
    summary: first.summary,
    url: first.url,
    matchedBy: 'web-deep-research',
    additionalSources: sources.slice(1),
  }
}

function existingReviewInput(material: Material) {
  const current = material.existingExplanation
  return {
    slug: material.profile.slug,
    name: material.profile.nickname,
    nameEn: material.profile.nickname_en,
    profession: material.profile.profession,
    title: material.profile.title,
    bio: material.profile.bio,
    guide: current?.plain_text ?? null,
    explorationTitle: current?.interpretive_title ?? null,
    explorationText: current?.interpretive_text ?? null,
    guideEn: current?.plain_text_en ?? null,
    explorationTitleEn: current?.interpretive_title_en ?? null,
    explorationTextEn: current?.interpretive_text_en ?? null,
  }
}

function existingReviewInputHash(material: Material): string {
  return createHash('sha256')
    .update(`${REVIEW_VERSION}\n${JSON.stringify(existingReviewInput(material))}`, 'utf8')
    .digest('hex')
}

function buildExistingReviewPrompt(materials: Material[]): string {
  return `아래 기존 "인물 안내"와 "인물 탐구"를 새 규칙으로 계속 사용할 수 있는지 엄격히 판정하라. 글을 고치거나 새로 쓰지 않는다. 외부 검색도 하지 않는다.

pass는 다음 조건을 모두 만족할 때만 준다.
1. 안내만 읽고 처음 보는 독자가 누구이며 무엇을 했는지 이해한다.
2. 탐구는 안내의 이력·직함·역할·수상·속성을 말만 바꿔 반복하지 않는다.
3. 탐구에는 구체적인 작품·사건·결정·관계가 있으며, 그 사실 사이의 작동 방식이나 긴장 하나를 읽는다.
4. 칭호 두 개, 소속 두 곳, 역할 두 개를 병렬로 놓고 "범위가 넓다"고 끝내지 않는다.
5. 추상어와 결론만 있고 독자가 무슨 일이 있었는지 알 수 없는 글이 아니다.
6. 한국어가 자연스럽고, 영문 세 필드가 빠짐없이 같은 사실과 해석 범위를 말한다.

짧다는 이유만으로 rewrite를 주지 않는다. 단순한 인물을 정확하고 짧게 설명하면 pass다. 반대로 길어도 안내를 다시 배열했으면 rewrite다. 사실 오류가 분명하거나 기본 프로필과 충돌하면 rewrite다. 애매하면 서비스 게시 품질을 기준으로 rewrite를 준다.

모든 slug를 정확히 한 번 포함한 JSON 배열만 출력한다.
[{
  "slug":"입력 slug",
  "verdict":"pass|rewrite",
  "reason":"판정 근거 한 문장"
}]

[현재 글]
${JSON.stringify(materials.map(existingReviewInput), null, 2)}`
}

function parseExistingReviews(raw: string, expectedSlugs: string[]): ExistingReview[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('선검수 JSON 배열을 찾지 못했다.')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('선검수 응답이 JSON 배열이 아니다.')
  const rows = parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('선검수 항목이 객체가 아니다.')
    const row = value as Record<string, unknown>
    const slug = String(row.slug ?? '').trim()
    const verdict = String(row.verdict ?? '').trim() as ExistingReview['verdict']
    const reason = String(row.reason ?? '').trim()
    if (!['pass', 'rewrite'].includes(verdict)) throw new Error(`${slug || '(slug 없음)'} 선검수 verdict가 잘못됐다: ${verdict}`)
    if (!reason) throw new Error(`${slug || '(slug 없음)'} 선검수 사유가 비어 있다.`)
    return { slug, verdict, reason }
  })
  const actual = rows.map((row) => row.slug)
  const missing = expectedSlugs.filter((slug) => !actual.includes(slug))
  const unexpected = actual.filter((slug) => !expectedSlugs.includes(slug))
  const duplicates = actual.filter((slug, index) => actual.indexOf(slug) !== index)
  if (missing.length || unexpected.length || duplicates.length) {
    throw new Error(`선검수 slug 불일치 missing=${missing.join(',')} unexpected=${unexpected.join(',')} duplicate=${duplicates.join(',')}`)
  }
  return rows
}

function readSavedExistingReview(slug: string): SavedExistingReview | null {
  const file = pathFor(REVIEW_DIR, slug)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as SavedExistingReview
}

function saveExistingReview(review: ExistingReview, material: Material) {
  const saved: SavedExistingReview = {
    ...review,
    model: MODEL,
    reviewedAt: new Date().toISOString(),
    inputHash: existingReviewInputHash(material),
  }
  writeFileSync(pathFor(REVIEW_DIR, review.slug), `${JSON.stringify(saved, null, 2)}\n`, 'utf8')
}

async function reviewExistingMaterials(materials: Material[]): Promise<Map<string, SavedExistingReview>> {
  const results = new Map<string, SavedExistingReview>()
  const missing: Material[] = []
  for (const material of materials) {
    if (!material.existingExplanation) {
      const review: ExistingReview = { slug: material.profile.slug, verdict: 'rewrite', reason: '기존 읽어보기가 없다.' }
      saveExistingReview(review, material)
      results.set(review.slug, readSavedExistingReview(review.slug)!)
      continue
    }
    const saved = RESUME ? readSavedExistingReview(material.profile.slug) : null
    if (saved?.inputHash === existingReviewInputHash(material)) results.set(material.profile.slug, saved)
    else missing.push(material)
  }

  const reviewBatches = batchesOf(missing, BATCH_SIZE)
  const lanes = Array.from({ length: Math.min(CONCURRENCY, reviewBatches.length) }, () => [] as Material[][])
  reviewBatches.forEach((batch, index) => lanes[index % lanes.length].push(batch))
  let completed = results.size

  async function runReviewLane(laneIndex: number, laneBatches: Material[][]) {
    for (const batch of laneBatches) {
      const raw = await callModel(buildExistingReviewPrompt(batch), 'medium')
      const reviews = parseExistingReviews(raw, batch.map((material) => material.profile.slug))
      for (const review of reviews) {
        const material = batch.find((item) => item.profile.slug === review.slug)!
        saveExistingReview(review, material)
        results.set(review.slug, readSavedExistingReview(review.slug)!)
      }
      completed += batch.length
      console.log(`REVIEW 레인 ${laneIndex + 1} | ${batch.map((material) => material.profile.slug).join(',')} | 누적 ${completed}/${materials.length}`)
    }
  }

  await Promise.all(lanes.map((lane, index) => runReviewLane(index, lane)))
  return results
}

async function markExistingReviewPassed(material: Material): Promise<'reviewed' | 'existing'> {
  const current = material.existingExplanation
  if (!current) throw new Error(`${material.profile.slug}: 검수 완료로 표시할 기존 읽어보기가 없다.`)
  if (current.review_status) return 'existing'
  const { data, error } = await supabase
    .from('celeb_explanations')
    .update({ review_status: 'ai_reviewed' })
    .eq('profile_id', material.profile.id)
    .eq('updated_at', current.updated_at)
    .is('review_status', null)
    .select('review_status')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`${material.profile.slug}: 선검수 뒤 행이 바뀌어 상태 반영을 중단했다.`)
  if (data.review_status !== 'ai_reviewed') throw new Error(`${material.profile.slug}: AI 검수 상태 재조회가 일치하지 않는다.`)
  return 'reviewed'
}

function inputForModel(material: Material) {
  const { profile } = material
  const input = {
    slug: profile.slug,
    name: profile.nickname,
    nameEn: profile.nickname_en,
    type: profile.celeb_tier === 'fiction' ? 'fiction' : 'real',
    profession: profile.profession,
    title: profile.title,
    nationality: profile.nationality,
    life: [profile.birth_date, profile.death_date].filter(Boolean).join(' ~ ') || null,
    bio: profile.bio,
    events: material.events.map((event) => ({
      when: event.year === null
        ? event.sequence_label
        : event.year_end && event.year_end !== event.year
          ? `${event.year}~${event.year_end}`
          : String(event.year),
      title: event.title,
      description: event.description,
      source: event.source,
    })),
    systemContexts: material.contexts,
    monologueThemeHint: profile.virtual_monologue?.slice(0, 700) ?? null,
    existingReadingToImprove: material.existingExplanation ? {
      guide: material.existingExplanation.plain_text,
      explorationTitle: material.existingExplanation.interpretive_title,
      explorationText: material.existingExplanation.interpretive_text,
    } : null,
  }
  return material.research
    ? {
      ...input,
      verifiedReference: {
        title: material.research.title,
        locale: material.research.locale,
        summary: material.research.summary,
        url: material.research.url,
      },
      additionalVerifiedReferences: material.research.additionalSources ?? [],
    }
    : input
}

function inputHash(material: Material): string {
  return createHash('sha256')
    .update(`${PIPELINE_VERSION}\n${JSON.stringify(inputForModel(material))}`, 'utf8')
    .digest('hex')
}

function buildDraftPrompt(materials: Material[]): string {
  return `아래 여러 인물에 대해 한국어 "인물 안내"와 "인물 탐구" 초안을 각각 써라. 도구를 사용하거나 웹을 검색하지 말고 제공한 재료만 사용한다.

이름·소속·직군만 확인하는 자료는 안내 근거일 뿐 탐구 조사가 아니다. 탐구에는 안내와 다른 구체적 사건·작품·관계·선택과 결과가 재료에 확인되어야 한다.

인물 안내는 처음 보는 독자가 누구이며 무엇을 했고 왜 이름이 남았는지 이해하게 한다. 생애 전체를 훑지 말고 중심 행동이나 생각 하나를 고른다. 전문용어는 같은 문장에서 쉬운 말로 푼다. 보통 180~420자지만 단순한 인물은 더 짧게 끝낸다.

인물 탐구는 안내를 다시 요약하지 않는다. 확인된 사건이나 사상 요소 가운데 둘을 연결해 선택 방식, 작동 원리, 긴장 하나를 제목과 본문으로 읽는다. 사건 연표가 없어도 bio에 서로 연결할 수 있는 개념·저술·비판 대상이 있으면 탐구를 쓴다. "A가 아니라 B다" 식 반전으로 한쪽을 지우지 말고, A이면서 B인 두 성질이 서로 돕거나 충돌하는 지점을 제공된 사실에 붙인다. 보통 220~500자다. 탐구에서 깊게 다룰 작품·사건·개념을 골랐다면, 안내만으로 정체를 설명할 수 있는 한 안내에서는 그것을 예고하거나 요약하지 않는다.

verifiedReference는 프로필과 신원을 대조한 외부 자료이므로 사실 재료로 쓸 수 있다. systemContexts는 서비스 안에서 이미 배정된 세력도감의 주제와 인물 설명이므로 정체와 활동 맥락을 확인하는 보조 재료다. 둘의 범위가 다르거나 충돌하면 verifiedReference를 우선하며, 외부 자료가 특정 인물에게 귀속하지 않은 사건을 systemContexts만 보고 그 인물의 행동으로 단정하지 않는다. monologueThemeHint는 관점 후보를 찾는 재료일 뿐 사실 근거나 문체 원본이 아니다. 그 문장을 옮기거나 1인칭으로 쓰지 않는다. 독자는 자료 조사 과정에 관심이 없다. 공식 프로필·기록·출처가 신원을 확인한다거나 동명이인을 구별한다는 조사 메모를 본문으로 쓰지 않고, 생일 자체를 탐구 주제로 삼지 않는다. 신화·서사처럼 고유명사가 많은 인물은 독자가 원전을 모른다고 보고 누가 무엇을 했는지 먼저 풀어 쓴 뒤 의미를 붙인다. 외부 자료에 전후와 결과가 있는 사건이 있으면 혈연·칭호 나열보다 그 사건을 우선한다. 재료에 없는 연도·숫자·인용·사건·동기·감정을 만들지 않는다. 재료가 짧아도 보류하지 말고 확인된 범위만큼 짧게 쓴다. 탐구에서는 관계, 역할과 결과, 두 특징의 결합 가운데 재료가 허용하는 하나를 고른다. 칭송, 단죄, 교훈, 번역투, 위키식 업적 나열을 피한다. 인물마다 문장 첫머리와 끝맺음을 새로 잡는다.

모든 인물에게 두 글을 반드시 작성한다. holdReason이나 작성 거절 사유를 출력하지 않는다. JSON 배열만 출력하고 코드펜스와 설명을 붙이지 않는다.
[{
  "slug": "입력 slug",
  "guide": "인물 안내",
  "explorationTitle": "인물 탐구 제목",
  "explorationText": "인물 탐구 본문"
}]

[재료]
${JSON.stringify(materials.map(inputForModel), null, 2)}`
}

function buildRevisionPrompt(materials: Material[], drafts: Reading[]): string {
  return `아래 인물별 재료와 초안을 대조해 한국어 최종본을 다시 쓴 뒤, 그 최종본을 자연스러운 영어로 번역하라. 도구를 사용하거나 웹을 검색하지 말고 제공된 범위만 사용한다. 초안의 표현을 조금 손보는 데 그치지 말고, 처음 보는 독자가 실제로 이해하는지 읽고 필요한 만큼 다시 구성한다.

이름·소속·직군만 확인하는 자료는 안내 근거일 뿐 탐구 조사가 아니다. 안내가 가수·그룹 멤버라고 설명하고 탐구가 보컬·기타·춤·랩 같은 팀 안 역할만 늘이는 글은 같은 사실의 반복이므로 구체적 사건·작품으로 교체한다.

최종 확인 사항은 다섯 가지다. 인물 안내만 읽고 정체와 핵심 행동을 말할 수 있어야 한다. 낯선 말은 본문 안에서 풀어야 한다. 인물 탐구는 안내를 되풀이하지 않고 한 가지 관계를 새로 보여 줘야 한다. 탐구의 중심 작품·사건·개념이 안내에도 등장해 안내가 탐구의 축약본이 됐다면, 안내에서 그 대목을 빼고 정체와 대표 역할에 집중한다. 재료가 짧으면 관계, 역할과 결과, 두 특징의 결합 가운데 확인되는 하나만 짧게 쓴다. "A가 아니라 B다"식 반전, 미사여구, 교훈, 평론가 말투, 번역투를 걷어낸다.

재료에서 확인할 수 없는 초안의 사실·연도·숫자·인용·동기·감정은 삭제한다. verifiedReference를 우선 근거로 삼고 systemContexts는 그와 충돌하지 않는 범위의 보조 재료로만 쓴다. 외부 자료가 개인에게 귀속하지 않은 사건을 systemContexts만 보고 개인의 행동으로 단정하지 않는다. 공식 프로필·기록·출처가 신원을 확인한다거나 동명이인을 구별한다는 조사 메모와 생일 중심의 탐구는 실제 행동·작품·관계로 교체한다. 신화·서사의 고유명사는 독자가 사건을 이해할 만큼 역할과 행동을 풀어 쓰며, 외부 자료에 전후와 결과가 있는 사건이 있으면 혈연·칭호 나열보다 그 사건을 택한다. monologueThemeHint는 사실 근거가 아니다. 사건 연표가 없어도 bio, systemContexts, verifiedReference의 개념·저술·비판 대상 가운데 둘을 연결할 수 있으면 탐구를 살린다. 초안이 비어 있거나 작성을 거절했더라도 재료를 다시 읽고 두 글을 완성한다.

모든 인물에게 두 글을 반드시 작성한다. holdReason이나 작성 거절 사유를 출력하지 않는다. JSON 배열만 출력하고 코드펜스와 설명을 붙이지 않는다. 입력의 모든 slug를 정확히 한 번씩 포함한다.
[{
  "slug": "입력 slug",
  "guide": "최종 인물 안내",
  "explorationTitle": "최종 인물 탐구 제목",
  "explorationText": "최종 인물 탐구 본문",
  "guideEn": "faithful and natural English guide",
  "explorationTitleEn": "faithful and natural English exploration title",
  "explorationTextEn": "faithful and natural English exploration"
}]

영문은 한국어 최종본에 없는 사실·해석·확신을 보태거나 빼지 않는다. 한국어 어순을 옮기지 말고 영어권 독자가 자연스럽게 읽는 산문으로 쓴다. 작품명과 인명은 확실한 통용 영문 표기만 사용한다. 확실하지 않으면 보수적으로 음역한다. 한국어·한자·일본어, 마크다운, 번역자 주석, em dash와 en dash를 넣지 않는다.

[재료와 초안]
${JSON.stringify(materials.map((material) => ({
    material: inputForModel(material),
    draft: drafts.find((draft) => draft.slug === material.profile.slug),
  })), null, 2)}`
}

function buildRepairPrompt(
  materials: Material[],
  readings: Reading[],
  errorsBySlug: Map<string, string[]>,
): string {
  return `아래 한영 최종본은 기계 검수에서 명백한 오류가 발견됐다. 재료 안의 사실만 사용해 오류가 사라지도록 해당 글을 다시 써라. 긴 대시는 쓰지 않는다. 재료에 없는 연도나 두 자리 이상 숫자는 새로 넣지 않는다. 두 탭은 같은 사실을 되풀이하지 않는다. 짧은 재료도 보류하지 말고 확인되는 범위에서 짧게 완성한다. 한국어를 먼저 확정하고 영문 세 필드는 그 최종 한국어와 사실·해석 범위를 정확히 맞춘다.

모든 slug를 정확히 한 번 포함한 JSON 배열만 출력한다. holdReason, 코드펜스, 설명은 출력하지 않는다.
[{
  "slug": "입력 slug",
  "guide": "인물 안내",
  "explorationTitle": "인물 탐구 제목",
  "explorationText": "인물 탐구 본문",
  "guideEn": "English guide",
  "explorationTitleEn": "English exploration title",
  "explorationTextEn": "English exploration"
}]

[재료·현재 글·검수 오류]
${JSON.stringify(materials.map((material) => ({
    material: inputForModel(material),
    current: readings.find((reading) => reading.slug === material.profile.slug),
    errors: errorsBySlug.get(material.profile.slug) ?? [],
  })), null, 2)}`
}

function buildSemanticAuditPrompt(materials: Material[], readings: Reading[]): string {
  return `아래 인물 안내와 인물 탐구가 말만 바꿔 같은 사실을 되풀이하는지, 영문이 한국어 최종본과 같은 사실·해석 범위를 지키는지 엄격히 판정하라. 먼저 한국어 두 글을 각각 한 문장으로 축약해 중심 사실을 비교한다. 어휘가 달라도 핵심이 같으면 실패다. 같은 작품·사건·개념이 두 글의 중심에 있고 탐구가 안내에 세부만 더했다면 반드시 실패다. 인물 탐구에는 안내에 없던 두 번째 사실, 관계, 선택의 결과, 또는 확인된 두 요소 사이의 작동 방식이 있어야 한다. 막연한 의미 부여나 "이 역할들이 결합된다"는 재진술은 새 관계가 아니다. 제공된 재료와 대조하되 글을 새로 쓰지는 않는다.

그다음 한국어와 영문을 필드별로 비교한다. 영문이 사실·연도·인과·평가·확신의 정도를 추가하거나 누락하거나 강화하면 faithfulEnglish를 false로 판정한다. 자연스러운 영문 재구성은 허용하지만, 한국어에 없는 배경지식을 보태면 실패다.

안내가 가수·그룹 멤버라고 설명하고 탐구가 보컬·기타·춤·랩 등 팀 안 역할만 나열하는 경우도 같은 사실의 확대이므로 실패다.

모든 slug를 정확히 한 번 포함한 JSON 배열만 출력한다.
[{
  "slug": "입력 slug",
  "distinct": true,
  "faithfulEnglish": true,
  "reason": "판정 근거 한 문장"
}]

[재료와 최종본]
${JSON.stringify(materials.map((material) => ({
    material: inputForModel(material),
    reading: readings.find((reading) => reading.slug === material.profile.slug),
  })), null, 2)}`
}

function parseSemanticAudit(raw: string, expectedSlugs: string[]): Map<string, string> {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('의미 검수 JSON 배열을 찾지 못했다.')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('의미 검수 응답이 JSON 배열이 아니다.')
  const rows = parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('의미 검수 항목이 객체가 아니다.')
    const row = value as Record<string, unknown>
    return {
      slug: String(row.slug ?? '').trim(),
      distinct: row.distinct === true,
      faithfulEnglish: row.faithfulEnglish === true,
      reason: String(row.reason ?? '').trim(),
    }
  })
  const actual = rows.map((row) => row.slug)
  const missing = expectedSlugs.filter((slug) => !actual.includes(slug))
  const unexpected = actual.filter((slug) => !expectedSlugs.includes(slug))
  const duplicates = actual.filter((slug, index) => actual.indexOf(slug) !== index)
  if (missing.length || unexpected.length || duplicates.length) {
    throw new Error(`의미 검수 slug 불일치 missing=${missing.join(',')} unexpected=${unexpected.join(',')} duplicate=${duplicates.join(',')}`)
  }
  return new Map(rows.filter((row) => !row.distinct || !row.faithfulEnglish).map((row) => {
    const labels = [
      !row.distinct ? '안내·탐구 동일 사실' : null,
      !row.faithfulEnglish ? '한영 의미 불일치' : null,
    ].filter(Boolean).join(', ')
    return [row.slug, `${labels}: ${row.reason || '의미 검수를 통과하지 못했다.'}`]
  }))
}

async function auditSemanticSeparation(
  materials: Material[],
  readings: Reading[],
): Promise<Map<string, string>> {
  const raw = await callModel(buildSemanticAuditPrompt(materials, readings), 'low')
  return parseSemanticAudit(raw, materials.map((material) => material.profile.slug))
}

function parseReadings(raw: string, expectedSlugs: string[], requireEnglish: boolean): Reading[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('JSON 배열을 찾지 못했다.')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('응답이 JSON 배열이 아니다.')

  const readings = parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('응답 항목이 객체가 아니다.')
    const row = value as Record<string, unknown>
    return {
      slug: String(row.slug ?? '').trim(),
      guide: String(row.guide ?? '').trim(),
      explorationTitle: String(row.explorationTitle ?? '').trim(),
      explorationText: String(row.explorationText ?? '').trim(),
      guideEn: requireEnglish ? String(row.guideEn ?? '').trim() : '',
      explorationTitleEn: requireEnglish ? String(row.explorationTitleEn ?? '').trim() : '',
      explorationTextEn: requireEnglish ? String(row.explorationTextEn ?? '').trim() : '',
      holdReason: null,
    }
  })

  const actual = readings.map((reading) => reading.slug)
  const missing = expectedSlugs.filter((slug) => !actual.includes(slug))
  const unexpected = actual.filter((slug) => !expectedSlugs.includes(slug))
  const duplicates = actual.filter((slug, index) => actual.indexOf(slug) !== index)
  if (missing.length || unexpected.length || duplicates.length) {
    throw new Error(`slug 불일치 missing=${missing.join(',')} unexpected=${unexpected.join(',')} duplicate=${duplicates.join(',')}`)
  }
  return readings
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').split(/\s+/).filter((token) => token.length >= 2),
  )
}

function jaccard(a: string, b: string): number {
  const left = tokenSet(a)
  const right = tokenSet(b)
  if (!left.size || !right.size) return 0
  const intersection = [...left].filter((token) => right.has(token)).length
  return intersection / (left.size + right.size - intersection)
}

function validateReading(reading: Reading, material: Material): string[] {
  if (reading.holdReason) return ['최종 보류 금지']
  const errors: string[] = []
  if (reading.guide.length < 40 || reading.guide.length > 500) {
    errors.push(`인물 안내 분량 ${reading.guide.length}자`)
  }
  if (reading.explorationTitle.length < 8 || reading.explorationTitle.length > 90) {
    errors.push(`인물 탐구 제목 분량 ${reading.explorationTitle.length}자`)
  }
  if (reading.explorationText.length < 60 || reading.explorationText.length > 600) {
    errors.push(`인물 탐구 분량 ${reading.explorationText.length}자`)
  }

  const combined = `${reading.guide}\n${reading.explorationTitle}\n${reading.explorationText}`
  const combinedEn = `${reading.guideEn}\n${reading.explorationTitleEn}\n${reading.explorationTextEn}`
  if (/[一-鿿]/.test(combined)) errors.push('한자 혼입')
  if (/https?:\/\/|\]\(|```|^#{1,6}\s/m.test(combined)) errors.push('URL 또는 마크다운 혼입')
  if (/[—–]/.test(combined)) errors.push('긴 대시 혼입')
  if (/(?<!뿐 )아니라/.test(combined)) errors.push('A가 아니라 B다식 대조')
  if (/(^|[.!?]\s*)(나는|저는|내가|제가)\s/.test(combined)) errors.push('가상독백식 1인칭 혼입')
  if (/(현재 제공된|제공된 기록|기록(?:되어 있지|이 없)|설명할 수 없|단서(?:가|는) 없|확인할 수 없)/.test(combined)) {
    errors.push('자료 부재를 본문으로 대신함')
  }
  if (/(?:공식|외부) (?:프로필|기록|자료|출처)|신원 (?:확인|자료)|동명이인|구별하는 자료|명시되어 있/.test(`${reading.explorationTitle}\n${reading.explorationText}`)) {
    errors.push('탐구가 조사 메모를 본문으로 대신함')
  }
  if (/[0-9가-힣]+\s*명조/.test(combined)) errors.push('비문: 명조')
  if (jaccard(reading.guide, reading.explorationText) > 0.68) errors.push('두 글의 어휘 중복 과다')

  if (!reading.guideEn || !reading.explorationTitleEn || !reading.explorationTextEn) {
    errors.push('영문 필드 누락')
  }
  if (/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(combinedEn)) {
    errors.push('영문 필드 CJK 혼입')
  }
  if (/https?:\/\/|```|^#{1,6}\s|translator(?:'s)? note|\bas an ai\b/im.test(combinedEn)) {
    errors.push('영문 URL·마크다운·번역 메모 혼입')
  }
  if (/[—–]/.test(combinedEn)) errors.push('영문 긴 대시 혼입')
  const paragraphCount = (text: string) => text.trim().split(/\n\s*\n/).filter(Boolean).length
  for (const [label, ko, en] of [
    ['안내', reading.guide, reading.guideEn],
    ['탐구', reading.explorationText, reading.explorationTextEn],
  ] as const) {
    if (ko && en && paragraphCount(ko) !== paragraphCount(en)) {
      errors.push(`${label} 한영 문단 수 불일치`)
    }
    const koNumbers = [...new Set(ko.replace(/(?<=\d),(?=\d)/g, '').match(/\d+(?:\.\d+)?/g) ?? [])]
    const enNumbers = new Set(en.replace(/(?<=\d),(?=\d)/g, '').match(/\d+(?:\.\d+)?/g) ?? [])
    const missingNumbers = koNumbers.filter((number) => !enNumbers.has(number))
    if (missingNumbers.length) errors.push(`${label} 영문 숫자 누락 ${missingNumbers.join(',')}`)
  }

  const genericRoleTerms = new Set(
    reading.explorationText.match(/보컬|댄서|래퍼|기타(?:리스트|\s*연주)?|센터|퍼포머|노래|춤|랩|무대|공연/g) ?? [],
  )
  const hasConcreteExplorationAnchor = /[《〈「『]|\b(?:1\d{3}|20\d{2})\b|데뷔|발매|수상|저술|창작|제작|연기|창업|설립|선발|합류|이주|출간|전투|개혁|발견|개발|체포|판결|혼인|결혼|즉위|퇴위|원정|협상/.test(reading.explorationText)
  if (genericRoleTerms.size >= 3 && !hasConcreteExplorationAnchor) {
    errors.push('탐구가 구체적 사건 없이 팀 내 역할만 확대함')
  }

  const guideYears = new Set(reading.guide.match(/\b(?:1\d{3}|20\d{2})\b/g) ?? [])
  const explorationYears = new Set(reading.explorationText.match(/\b(?:1\d{3}|20\d{2})\b/g) ?? [])
  const sharedYears = [...guideYears].filter((year) => explorationYears.has(year))
  if (sharedYears.length) errors.push(`두 글 동일 연도 사건 중복 ${sharedYears.join(',')}`)

  const namedSubjects = (text: string) => new Set(
    [...text.matchAll(/[《〈「『]([^》〉」』]{2,})[》〉」』]/g)]
      .map((match) => match[1].replace(/\s+/g, '').toLowerCase()),
  )
  const guideSubjects = namedSubjects(reading.guide)
  const explorationSubjects = namedSubjects(`${reading.explorationTitle}\n${reading.explorationText}`)
  const sharedSubjects = [...guideSubjects].filter((subject) => explorationSubjects.has(subject))
  if (sharedSubjects.length) errors.push(`두 글 동일 작품·사건 중복 ${sharedSubjects.join(',')}`)

  const normalizeNumberSeparators = (text: string) => text.replace(/(?<=\d),(?=\d)/g, '')
  const materialNumbers = new Set(
    normalizeNumberSeparators(JSON.stringify(inputForModel(material))).match(/\d{2,}/g) ?? [],
  )
  const unknownNumbers = [...new Set(normalizeNumberSeparators(combined).match(/\d{2,}/g) ?? [])]
    .filter((number) => !materialNumbers.has(number))
  if (unknownNumbers.length) errors.push(`재료에 없는 숫자 ${unknownNumbers.join(',')}`)
  return errors
}

function validateBatch(readings: Reading[]): Map<string, string[]> {
  const errors = new Map<string, string[]>()
  const seenTitles = new Map<string, string>()
  const seenOpenings = new Map<string, string>()
  for (const reading of readings) {
    if (reading.holdReason) continue
    const titleKey = reading.explorationTitle.replace(/\s+/g, ' ').toLowerCase()
    const openingKey = reading.guide.replace(/\s+/g, ' ').slice(0, 24)
    for (const [kind, key, seen] of [
      ['제목', titleKey, seenTitles],
      ['첫 문장', openingKey, seenOpenings],
    ] as const) {
      const previous = seen.get(key)
      if (previous) {
        errors.set(reading.slug, [...(errors.get(reading.slug) ?? []), `${kind} 판박이: ${previous}`])
      } else {
        seen.set(key, reading.slug)
      }
    }
  }
  return errors
}

async function callModel(prompt: string, effort: 'low' | 'medium'): Promise<string> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await codexCall(prompt, { model: MODEL, effort, timeoutMs: 600_000 })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt === 2 || looksRateLimited(message)) throw error
    }
  }
  throw new Error('모델 호출 실패')
}

function pathFor(directory: string, slug: string) {
  return join(directory, `${slug.replace(/[^a-z0-9-]/gi, '_')}.json`)
}

function readSaved(directory: string, slug: string): SavedReading | null {
  const file = pathFor(directory, slug)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as SavedReading
}

function saveReading(
  directory: string,
  stage: 'draft' | 'final',
  reading: Reading,
  material: Material,
  validationErrors: string[] = [],
) {
  const saved: SavedReading = {
    ...reading,
    stage,
    model: MODEL,
    generatedAt: new Date().toISOString(),
    inputHash: inputHash(material),
    validationErrors,
  }
  writeFileSync(pathFor(directory, reading.slug), `${JSON.stringify(saved, null, 2)}\n`, 'utf8')
}

function logFailure(slugs: string[], stage: string, error: unknown) {
  appendFileSync(FAILURE_LOG, `${JSON.stringify({
    at: new Date().toISOString(),
    slugs,
    stage,
    error: error instanceof Error ? error.message : String(error),
  })}\n`, 'utf8')
}

async function applyReading(reading: SavedReading, material: Material): Promise<'written' | 'held' | 'existing'> {
  const current = material.existingExplanation
  if (current?.review_status === 'human_reviewed') return 'existing'
  if (current
    && current.plain_text === reading.guide
    && current.interpretive_title === reading.explorationTitle
    && current.interpretive_text === reading.explorationText
    && current.plain_text_en === reading.guideEn
    && current.interpretive_title_en === reading.explorationTitleEn
    && current.interpretive_text_en === reading.explorationTextEn
    && current.review_status === 'ai_reviewed'
    && Boolean(current.published_at) === (material.profile.publication_status === 'active')) {
    return 'existing'
  }
  if (reading.inputHash !== inputHash(material)) {
    throw new Error('저장된 최종본의 조사 재료가 현재 재료와 달라 다시 생성해야 한다.')
  }
  const currentErrors = validateReading(reading, material)
  const persistentErrors = reading.validationErrors.filter((error) =>
    error.includes('판박이') || error.includes('동일 사실'))
  if (reading.holdReason || currentErrors.length || persistentErrors.length) {
    if (EXPLAIN_HOLDS) {
      console.log(`HOLD ${reading.slug} | model=${reading.holdReason ?? '-'} | current=${currentErrors.join('; ') || '-'} | saved=${persistentErrors.join('; ') || '-'}`)
    }
    return 'held'
  }

  const payload = {
    profile_id: material.profile.id,
    plain_text: reading.guide,
    interpretive_title: reading.explorationTitle,
    interpretive_text: reading.explorationText,
    plain_text_en: reading.guideEn,
    interpretive_title_en: reading.explorationTitleEn,
    interpretive_text_en: reading.explorationTextEn,
    review_status: 'ai_reviewed',
    published_at: material.profile.publication_status === 'active' ? new Date().toISOString() : null,
  }
  let writeQuery
  if (REWRITE_EXISTING) {
    if (!material.existingExplanation) throw new Error('교체할 기존 설명 스냅샷이 없다.')
    writeQuery = supabase
      .from('celeb_explanations')
      .update(payload)
      .eq('profile_id', material.profile.id)
      .eq('updated_at', material.existingExplanation.updated_at)
  } else {
    writeQuery = supabase.from('celeb_explanations').insert(payload)
  }
  const { data: inserted, error } = await writeQuery
    .select('profile_id, plain_text, interpretive_title, interpretive_text, plain_text_en, interpretive_title_en, interpretive_text_en, review_status, published_at, updated_at')
    .maybeSingle()

  if (error) {
    if (!REWRITE_EXISTING && error.code === '23505') return 'existing'
    throw error
  }
  if (!inserted) throw new Error(REWRITE_EXISTING
    ? '기존 설명이 생성 뒤 바뀌어 조건부 교체를 중단했다.'
    : '설명 INSERT가 행을 반환하지 않았다.')

  const { data: verified, error: verifyError } = await supabase
    .from('celeb_explanations')
    .select('plain_text, interpretive_title, interpretive_text, plain_text_en, interpretive_title_en, interpretive_text_en, review_status, published_at')
    .eq('profile_id', material.profile.id)
    .single()
  if (verifyError) throw verifyError
  if (
    verified.plain_text !== reading.guide
    || verified.interpretive_title !== reading.explorationTitle
    || verified.interpretive_text !== reading.explorationText
    || verified.plain_text_en !== reading.guideEn
    || verified.interpretive_title_en !== reading.explorationTitleEn
    || verified.interpretive_text_en !== reading.explorationTextEn
  ) {
    throw new Error('DB 재조회 한영 본문이 개선본과 다르다.')
  }
  if (verified.review_status !== 'ai_reviewed') {
    throw new Error('DB 재조회 AI 검수 상태가 개선본과 다르다.')
  }
  if (material.profile.publication_status === 'active' && !verified.published_at) {
    throw new Error('활성 프로필의 게시 시각이 비어 있다.')
  }
  if (material.profile.publication_status !== 'active' && verified.published_at) {
    throw new Error('비활성·정지 프로필이 게시됐다.')
  }
  return 'written'
}

async function generateBatch(materials: Material[]): Promise<Map<string, SavedReading>> {
  const drafts = new Map<string, SavedReading>()
  const missingDrafts: Material[] = []

  for (const material of materials) {
    const saved = RESUME ? readSaved(DRAFT_DIR, material.profile.slug) : null
    if (saved && saved.inputHash === inputHash(material)) drafts.set(material.profile.slug, saved)
    else missingDrafts.push(material)
  }

  if (missingDrafts.length) {
    const raw = await callModel(buildDraftPrompt(missingDrafts), 'low')
    const generated = parseReadings(raw, missingDrafts.map((material) => material.profile.slug), false)
    for (const reading of generated) {
      const material = missingDrafts.find((item) => item.profile.slug === reading.slug)!
      saveReading(DRAFT_DIR, 'draft', reading, material)
      drafts.set(reading.slug, readSaved(DRAFT_DIR, reading.slug)!)
    }
  }

  const finals = new Map<string, SavedReading>()
  const toRevise: Material[] = []
  for (const material of materials) {
    const saved = RESUME ? readSaved(FINAL_DIR, material.profile.slug) : null
    const reusable = saved
      && saved.inputHash === inputHash(material)
      && !saved.holdReason
      && saved.validationErrors.length === 0
      && validateReading(saved, material).length === 0
    if (reusable) finals.set(material.profile.slug, saved)
    else toRevise.push(material)
  }

  if (toRevise.length) {
    const draftRows = toRevise.map((material) => drafts.get(material.profile.slug)!)
    const raw = await callModel(buildRevisionPrompt(toRevise, draftRows), 'medium')
    let revised = parseReadings(raw, toRevise.map((material) => material.profile.slug), true)
    const semanticErrors = await auditSemanticSeparation(toRevise, revised)

    for (let repairAttempt = 1; repairAttempt <= 2; repairAttempt += 1) {
      const batchErrors = validateBatch(revised)
      const errorsBySlug = new Map<string, string[]>()
      for (const reading of revised) {
        const material = toRevise.find((item) => item.profile.slug === reading.slug)!
        const errors = [
          ...validateReading(reading, material),
          ...(batchErrors.get(reading.slug) ?? []),
          ...(semanticErrors.has(reading.slug) ? [semanticErrors.get(reading.slug)!] : []),
        ]
        if (errors.length) errorsBySlug.set(reading.slug, errors)
      }
      if (!errorsBySlug.size) break

      const repairMaterials = toRevise.filter((material) => errorsBySlug.has(material.profile.slug))
      const repairRows = revised.filter((reading) => errorsBySlug.has(reading.slug))
      const repairRaw = await callModel(buildRepairPrompt(repairMaterials, repairRows, errorsBySlug), 'medium')
      const repaired = parseReadings(repairRaw, repairMaterials.map((material) => material.profile.slug), true)
      const repairedBySlug = new Map(repaired.map((reading) => [reading.slug, reading]))
      revised = revised.map((reading) => repairedBySlug.get(reading.slug) ?? reading)
      const repairedSemanticErrors = await auditSemanticSeparation(repairMaterials, repaired)
      for (const material of repairMaterials) semanticErrors.delete(material.profile.slug)
      for (const [slug, error] of repairedSemanticErrors) semanticErrors.set(slug, error)
    }

    const batchErrors = validateBatch(revised)
    for (const reading of revised) {
      const material = toRevise.find((item) => item.profile.slug === reading.slug)!
      const errors = [
        ...validateReading(reading, material),
        ...(batchErrors.get(reading.slug) ?? []),
        ...(semanticErrors.has(reading.slug) ? [semanticErrors.get(reading.slug)!] : []),
      ]
      saveReading(FINAL_DIR, 'final', reading, material, errors)
      finals.set(reading.slug, readSaved(FINAL_DIR, reading.slug)!)
    }
  }

  return finals
}

function batchesOf<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

async function main() {
  const [profiles, explanations, timelineRows, factionRows, tagRows] = await Promise.all([
    fetchAll<ProfileRow>(
      'celebs',
      'id,slug,nickname,nickname_en,bio,profession,title,nationality,birth_date,death_date,publication_status,celeb_tier,wikidata_qid,virtual_monologue',
      (query) => query.order('id'),
    ),
    fetchAll<ExplanationRow>('celeb_explanations', 'profile_id,review_status,published_at,plain_text,interpretive_title,interpretive_text,plain_text_en,interpretive_title_en,interpretive_text_en,updated_at', (query) => query.order('profile_id')),
    fetchAll<TimelineRow>(
      'celeb_timeline_events',
      'celeb_id,year,year_end,sequence_label,title,description,source,source_url,sort_order',
      (query) => query.order('id'),
    ),
    fetchAll<FactionContextRow>(
      'faction_atlas_members',
      'celeb_id,tag_id,short_desc,long_desc,group_label,group_label_en,group_subtitle,group_subtitle_en',
      (query) => query.order('celeb_id'),
    ),
    fetchAll<TagRow>(
      'celeb_tags',
      'id,name,name_en,slug',
      (query) => query.order('id'),
    ),
  ])

  const existingIds = new Set(explanations.map((row) => row.profile_id))
  const eventsByProfile = new Map<string, TimelineRow[]>()
  for (const event of timelineRows) {
    eventsByProfile.set(event.celeb_id, [...(eventsByProfile.get(event.celeb_id) ?? []), event])
  }
  const tagsById = new Map(tagRows.map((tag) => [tag.id, tag]))
  const contextsByProfile = new Map<string, FactionContext[]>()
  for (const row of factionRows) {
    const tag = tagsById.get(row.tag_id)
    if (!tag) continue
    const context: FactionContext = {
      theme: tag.name,
      themeEn: tag.name_en,
      themeSlug: tag.slug,
      group: row.group_label,
      groupEn: row.group_label_en,
      groupSubtitle: row.group_subtitle,
      groupSubtitleEn: row.group_subtitle_en,
      shortDescription: row.short_desc,
      longDescription: row.long_desc,
    }
    contextsByProfile.set(row.celeb_id, [...(contextsByProfile.get(row.celeb_id) ?? []), context])
  }

  const statusRank = { active: 0, inactive: 1, suspended: 2 }
  let targets = profiles
    .filter((profile) => INCLUDE_EXISTING || REWRITE_EXISTING || !existingIds.has(profile.id))
    .filter((profile) => !SLUGS || SLUGS.has(profile.slug))
    .sort((a, b) => statusRank[a.publication_status] - statusRank[b.publication_status] || a.slug.localeCompare(b.slug))

  if (SLUGS) {
    const allSlugs = new Set(profiles.map((profile) => profile.slug))
    const missing = [...SLUGS].filter((slug) => !allSlugs.has(slug))
    if (missing.length) throw new Error(`프로필에 없는 slug: ${missing.join(', ')}`)
  }
  if (LIMIT !== Number.POSITIVE_INFINITY) targets = targets.slice(0, LIMIT)

  const explanationById = new Map(explanations.map((row) => [row.profile_id, row]))
  const preReviewMaterials: Material[] = targets.map((profile) => ({
    profile,
    events: selectEvents(eventsByProfile.get(profile.id) ?? []),
    contexts: (contextsByProfile.get(profile.id) ?? []).slice(0, 4),
    research: null,
    existingExplanation: explanationById.get(profile.id) ?? null,
  }))
  let statusSkipped = 0
  let reviewPassed = 0
  let reviewRewrite = preReviewMaterials.length
  let reviewStatusWritten = 0
  let selectedMaterials = preReviewMaterials

  if (REVIEW_EXISTING && !STATS) {
    const alreadyReviewed = preReviewMaterials.filter((material) => Boolean(material.existingExplanation?.review_status))
    const pendingReview = preReviewMaterials.filter((material) => !material.existingExplanation?.review_status)
    statusSkipped = alreadyReviewed.length
    const reviews = await reviewExistingMaterials(pendingReview)
    const passed = pendingReview.filter((material) => reviews.get(material.profile.slug)?.verdict === 'pass')
    selectedMaterials = pendingReview.filter((material) => reviews.get(material.profile.slug)?.verdict === 'rewrite')
    reviewPassed = passed.length
    reviewRewrite = selectedMaterials.length

    if (APPLY) {
      for (const batch of chunksOf(passed, 16)) {
        const results = await Promise.all(batch.map((material) => markExistingReviewPassed(material)))
        reviewStatusWritten += results.filter((result) => result === 'reviewed').length
      }
    }
  }

  const selectedProfiles = selectedMaterials.map((material) => material.profile)
  const baseResearchBySlug = selectedProfiles.length
    ? RESEARCH
      ? await researchProfiles(selectedProfiles, contextsByProfile)
      : loadCachedResearch(selectedProfiles, contextsByProfile)
    : new Map<string, ResearchExcerpt>()
  const deepResearchBySlug = selectedProfiles.length
    ? DEEP_RESEARCH
      ? await researchProfilesDeep(selectedProfiles, contextsByProfile)
      : loadCachedDeepResearch(selectedProfiles, contextsByProfile)
    : new Map<string, DeepResearchSource[]>()
  const materials: Material[] = selectedMaterials.map((material) => ({
    ...material,
    research: attachDeepResearch(
      baseResearchBySlug.get(material.profile.slug) ?? null,
      deepResearchBySlug.get(material.profile.slug),
    ),
  }))
  const unresearched = materials.filter((material) =>
    !material.research
    && !material.events.some((event) => Boolean(event.source_url)),
  )
  const missingDeepResearch = DEEP_RESEARCH
    ? materials.filter((material) => !material.research?.additionalSources?.length
      && material.research?.matchedBy !== 'web-deep-research')
    : []

  if (STATS) {
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
    const byStatus = Object.fromEntries(['active', 'inactive', 'suspended'].map((status) => {
      const statusProfiles = profiles.filter((profile) => profile.publication_status === status)
      const statusIds = new Set(statusProfiles.map((profile) => profile.id))
      const statusRows = explanations.filter((row) => statusIds.has(row.profile_id))
      return [status, {
        profiles: statusProfiles.length,
        readings: statusRows.length,
        published: statusRows.filter((row) => row.published_at).length,
        unreviewed: statusRows.filter((row) => row.review_status === null).length,
        aiReviewed: statusRows.filter((row) => row.review_status === 'ai_reviewed').length,
        humanReviewed: statusRows.filter((row) => row.review_status === 'human_reviewed').length,
      }]
    }))
    const missingBreakdown = {
      total: materials.length,
      researchMissing: 0,
      modelHold: 0,
      currentValidation: 0,
      savedValidation: 0,
      missingFinal: 0,
      publishable: 0,
    }
    const validationReasons = new Map<string, number>()
    const modelHoldSamples: Array<{ slug: string; reason: string }> = []
    const validationSamples: Array<{
      slug: string
      errors: string[]
      guide: string
      explorationTitle: string
      explorationText: string
    }> = []
    const savedValidationSamples: Array<{ slug: string; errors: string[] }> = []
    for (const material of materials) {
      if (unresearched.includes(material)) {
        missingBreakdown.researchMissing += 1
      }
      const final = readSaved(FINAL_DIR, material.profile.slug)
      if (!final || final.inputHash !== inputHash(material)) {
        missingBreakdown.missingFinal += 1
        continue
      }
      if (final.holdReason) {
        missingBreakdown.modelHold += 1
        if (modelHoldSamples.length < 12) {
          modelHoldSamples.push({ slug: final.slug, reason: final.holdReason })
        }
        continue
      }
      const currentErrors = validateReading(final, material)
      const persistentErrors = final.validationErrors.filter((error) =>
        error.includes('판박이') || error.includes('동일 사실'))
      if (currentErrors.length) {
        missingBreakdown.currentValidation += 1
        if (validationSamples.length < 16) {
          validationSamples.push({
            slug: final.slug,
            errors: currentErrors,
            guide: final.guide,
            explorationTitle: final.explorationTitle,
            explorationText: final.explorationText,
          })
        }
        for (const error of currentErrors) {
          const reason = error.replace(/\s+\d+(?:,\d+)*(?:자)?(?:\s.*)?$/, '')
          validationReasons.set(reason, (validationReasons.get(reason) ?? 0) + 1)
        }
      }
      else if (persistentErrors.length) {
        missingBreakdown.savedValidation += 1
        savedValidationSamples.push({ slug: final.slug, errors: persistentErrors })
      }
      else missingBreakdown.publishable += 1
    }
    const publishedMismatch = explanations.filter((row) => {
      const profile = profileById.get(row.profile_id)
      return Boolean(row.published_at) !== (profile?.publication_status === 'active')
    }).length
    const missingByStatus = Object.fromEntries(['active', 'inactive', 'suspended'].map((status) => [
      status,
      materials.filter((material) => material.profile.publication_status === status).length,
    ]))
    let publicRls: { visible: number | null; inactiveVisible: number | null; error: string | null } | null = null
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (anonKey) {
      const publicClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const inactiveReading = explanations.find((row) => profileById.get(row.profile_id)?.publication_status !== 'active')
      const [{ count: visible, error: visibleError }, inactiveResult] = await Promise.all([
        publicClient.from('celeb_explanations').select('*', { count: 'exact', head: true }),
        inactiveReading
          ? publicClient.from('celeb_explanations').select('profile_id').eq('profile_id', inactiveReading.profile_id)
          : Promise.resolve({ data: [], error: null }),
      ])
      publicRls = {
        visible,
        inactiveVisible: inactiveResult.data?.length ?? null,
        error: visibleError?.message ?? inactiveResult.error?.message ?? null,
      }
    }
    console.log(JSON.stringify({
      profiles: profiles.length,
      readings: explanations.length,
      published: explanations.filter((row) => row.published_at).length,
      unpublished: explanations.filter((row) => !row.published_at).length,
      publishedMismatch,
      reviewStatus: {
        unreviewed: explanations.filter((row) => row.review_status === null).length,
        aiReviewed: explanations.filter((row) => row.review_status === 'ai_reviewed').length,
        humanReviewed: explanations.filter((row) => row.review_status === 'human_reviewed').length,
      },
      publicRls,
      byStatus,
      missingByStatus,
      missing: missingBreakdown,
      validationReasons: Object.fromEntries([...validationReasons].sort((a, b) => b[1] - a[1])),
      modelHoldSamples,
      validationSamples,
      savedValidationSamples,
    }, null, 2))
    return
  }

  console.log([
    `전체 셀럽 ${profiles.length}`,
    `기존 읽어보기 ${explanations.length}`,
    `검수 대상 ${targets.length}`,
    REVIEW_EXISTING ? `상태 스킵 ${statusSkipped}` : null,
    REVIEW_EXISTING ? `본문 유지 ${reviewPassed}` : null,
    REVIEW_EXISTING ? `재작성 ${reviewRewrite}` : null,
    `외부 조사 미완료 ${unresearched.length}`,
    RESEARCH ? `확인 자료 ${baseResearchBySlug.size}` : '외부 자료 조사 없음',
    `심화 조사 자료 ${deepResearchBySlug.size}`,
    `묶음 ${BATCH_SIZE}`,
    `독립 릴레이 ${CONCURRENCY}`,
    `모델 ${MODEL}`,
    APPLY ? 'DB 조건부 반영' : 'DB 쓰기 없음',
  ].filter(Boolean).join(' | '))

  if (PLAN) {
    for (const material of materials) {
      console.log(`PLAN ${material.profile.publication_status.padEnd(9)} ${material.profile.celeb_tier ?? '-'} ${material.profile.slug} ${material.profile.nickname} | en=${material.profile.nickname_en ?? '-'} qid=${material.profile.wikidata_qid ?? '-'} nation=${material.profile.nationality ?? '-'} life=${material.profile.birth_date ?? '-'}~${material.profile.death_date ?? '-'} bio=${material.profile.bio?.length ?? 0} events=${material.events.length} contexts=${material.contexts.length} research=${material.research?.matchedBy ?? '-'}`)
      if (VERBOSE) console.log(JSON.stringify({
        material: inputForModel(material),
        existingExplanation: explanations.find((row) => row.profile_id === material.profile.id) ?? null,
      }, null, 2))
    }
    return
  }

  if (GENERATE && unresearched.length) {
    throw new Error(`외부 조사 미완료 ${unresearched.length}명: ${unresearched.slice(0, 30).map((material) => material.profile.slug).join(', ')}`)
  }
  if (GENERATE && missingDeepResearch.length) {
    throw new Error(`심화 조사 미완료 ${missingDeepResearch.length}명: ${missingDeepResearch.slice(0, 30).map((material) => material.profile.slug).join(', ')}`)
  }

  const workable = materials
  const batches = batchesOf(workable, BATCH_SIZE)
  const lanes = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => [] as Material[][])
  batches.forEach((batch, index) => lanes[index % lanes.length].push(batch))

  let completed = 0
  let written = 0
  let alreadyApplied = 0
  let held = 0
  let failed = 0
  const startedAt = Date.now()

  async function runLane(laneIndex: number, laneBatches: Material[][]) {
    for (const batch of laneBatches) {
      const slugs = batch.map((material) => material.profile.slug)
      const batchStartedAt = Date.now()
      try {
        let finals: Map<string, SavedReading>
        if (GENERATE) {
          finals = await generateBatch(batch)
        } else {
          finals = new Map(batch.map((material) => [
            material.profile.slug,
            readSaved(FINAL_DIR, material.profile.slug),
          ]).filter((entry): entry is [string, SavedReading] => Boolean(entry[1])))
        }

        for (const material of batch) {
          const final = finals.get(material.profile.slug)
          if (!final) {
            failed += 1
            logFailure([material.profile.slug], 'missing-final', '저장된 개선본이 없다.')
            continue
          }
          if (final.holdReason) {
            held += 1
            continue
          }
          if (APPLY) {
            const result = await applyReading(final, material)
            if (result === 'written') written += 1
            else if (result === 'held') held += 1
            else if (result === 'existing') alreadyApplied += 1
          } else if (final.validationErrors.length) {
            held += 1
          }
        }
        completed += batch.length
        console.log(`✓ 레인 ${laneIndex + 1} | ${slugs.join(',')} | ${Math.round((Date.now() - batchStartedAt) / 1000)}s | 누적 ${completed}/${workable.length}`)
      } catch (error) {
        failed += batch.length
        completed += batch.length
        logFailure(slugs, 'batch', error)
        console.error(`✗ 레인 ${laneIndex + 1} | ${slugs.join(',')} | ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  await Promise.all(lanes.map((lane, index) => runLane(index, lane)))

  console.log(`완료 | 검수 대상 ${targets.length} | 상태 스킵 ${statusSkipped} | 본문 유지 ${reviewPassed} | 검수상태 반영 ${reviewStatusWritten} | 재작성 처리 ${completed} | DB 본문 반영 ${written} | 이미 반영 ${alreadyApplied} | 보류 ${held} | 실패 ${failed} | ${Math.round((Date.now() - startedAt) / 1000)}s`)
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
