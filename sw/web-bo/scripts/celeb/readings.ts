/**
 * 인물 안내 한영 검수·재작성 배치.
 * 규칙 SSoT: docs/project/celeb/celeb-05-01-reading.md
 *
 * 실행 예:
 *   pnpm exec tsx scripts/celeb/readings.ts --slugs=hegel,werner-heisenberg --plan --include-existing
 *   pnpm exec tsx scripts/celeb/readings.ts --slugs=hegel,werner-heisenberg --rewrite-existing --generate
 *   pnpm exec tsx scripts/celeb/readings.ts --slugs=hegel,werner-heisenberg --rewrite-existing --apply --resume
 *   pnpm exec tsx scripts/celeb/readings.ts --all --review-existing --rewrite-existing --generate --resume
 *   pnpm exec tsx scripts/celeb/readings.ts --all --review-existing --recheck-reviewed --rewrite-existing --generate --resume
 *   pnpm exec tsx scripts/celeb/readings.ts --slugs=hegel,werner-heisenberg --review-existing --recheck-reviewed --review-decisions=reviews.json --rewrite-existing --research --deep-research --generate --resume
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
} from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

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
const RECHECK_REVIEWED = process.argv.includes('--recheck-reviewed')
const ALL = process.argv.includes('--all')
const LIMIT = numberFlag('--limit', Number.POSITIVE_INFINITY)
const BATCH_SIZE = numberFlag('--batch-size', 8)
const CONCURRENCY = numberFlag('--conc', 3)
const MODEL = flagValue('--model') ?? 'gpt-5.5'
const REVIEW_DECISIONS_ARG = flagValue('--review-decisions')
const EDITORIAL_CANDIDATES_ARG = flagValue('--editorial-candidates')
const SLUGS = (() => {
  const raw = flagValue('--slugs')
  return raw ? new Set(raw.split(',').map((slug) => slug.trim()).filter(Boolean)) : null
})()
const FULL_AUDIT = REVIEW_EXISTING
  && RECHECK_REVIEWED
  && REWRITE_EXISTING
  && (ALL || Boolean(SLUGS?.size))
const REVIEW_DECISIONS_FILE = REVIEW_DECISIONS_ARG
  && !REVIEW_DECISIONS_ARG.startsWith('--')
  ? resolve(process.cwd(), REVIEW_DECISIONS_ARG)
  : null
const EDITORIAL_CANDIDATES_FILE = EDITORIAL_CANDIDATES_ARG
  && !EDITORIAL_CANDIDATES_ARG.startsWith('--')
  ? resolve(process.cwd(), EDITORIAL_CANDIDATES_ARG)
  : null

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
if (RECHECK_REVIEWED && !FULL_AUDIT) {
  throw new Error('--recheck-reviewed는 --review-existing --rewrite-existing과 --all 또는 --slugs를 함께 지정한다.')
}
if (REVIEW_DECISIONS_ARG !== null && !REVIEW_DECISIONS_FILE) {
  throw new Error('--review-decisions에 JSON 파일 경로가 필요하다.')
}
if (REVIEW_DECISIONS_FILE && !REVIEW_EXISTING) {
  throw new Error('--review-decisions는 --review-existing과 함께 지정한다.')
}
if (EDITORIAL_CANDIDATES_ARG !== null && !EDITORIAL_CANDIDATES_FILE) {
  throw new Error('--editorial-candidates에 JSON 파일 경로가 필요하다.')
}
if (EDITORIAL_CANDIDATES_FILE && !GENERATE) {
  throw new Error('--editorial-candidates는 --generate와 함께 지정한다.')
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
const RESEARCH_OVERRIDES_FILE = resolve(process.cwd(), 'scripts/celeb/reading/research-overrides.json')
const RUN_LOCK_FILE = join(ROOT, 'run.lock')
const PIPELINE_VERSION = '2026-09-01-guide-only-v25-bio-identity'
const REVIEW_VERSION = '2026-09-01-guide-only-pre-review-v7-bio-identity'
const DEEP_RESEARCH_VERSION = '2026-08-29-guide-sources-v3'
const NEW_EXPLANATION_PLACEHOLDER = '미작성'
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

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  process.env.DB_SECRET_KEY!,
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
  publication_status: 'active' | 'inactive'
  celeb_tier: string | null

  celeb_reality: string | null
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

type InterpretiveFields = Pick<ExplanationRow,
  'interpretive_title' | 'interpretive_text' | 'interpretive_title_en' | 'interpretive_text_en'>

function interpretiveFieldsMatch(left: InterpretiveFields, right: InterpretiveFields): boolean {
  return left.interpretive_title === right.interpretive_title
    && left.interpretive_text === right.interpretive_text
    && left.interpretive_title_en === right.interpretive_title_en
    && left.interpretive_text_en === right.interpretive_text_en
}

type Material = {
  profile: ProfileRow
  existingExplanation: ExplanationRow | null
  rewriteReason: string | null
  research: ResearchExcerpt | null
}

type FactionContextRow = {
  celeb_id: string | null
  tag_id: string | null
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
  guideEn: string
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
      db.from(table).select(select).range(from, from + 999),
    )
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return rows
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
        headers: { 'User-Agent': 'FeelandNote/1.0 (celeb-reading research)' },
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
        headers: { 'User-Agent': 'FeelandNote/1.0 (celeb-reading research)' },
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
      if (!DEEP_RESEARCH) delete cached[profile.slug]
      continue
    }
    if (saved
      && saved.matchedBy !== 'profile-qid'
      && !researchMatchesIdentity(profile, contextsByProfile.get(profile.id) ?? [], saved)) {
      delete cached[profile.slug]
    }
  }
  const missing = eligibleProfiles.filter((profile) => !(profile.slug in cached))
  if (DEEP_RESEARCH && missing.length) {
    for (const profile of missing) cached[profile.slug] = null
    writeFileSync(RESEARCH_FILE, `${JSON.stringify(cached, null, 2)}\n`, 'utf8')
    console.log(`RESEARCH 개관 | 심화 조사로 대체 ${missing.length}명`)
    return new Map(eligibleProfiles.flatMap((profile) => cached[profile.slug] ? [[profile.slug, cached[profile.slug]!]] : []))
  }
  let researched = 0
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
    researched += batch.length
    console.log(`RESEARCH 개관 | ${batch.map((profile) => profile.slug).join(',')} | 누적 ${researched}/${missing.length}`)
  }

  return new Map(eligibleProfiles.flatMap((profile) => cached[profile.slug] ? [[profile.slug, cached[profile.slug]!]] : []))
}

type EditorialCandidate = {
  slug: string
  guide: string
  guideEn: string
}

const editorialCandidates = (() => {
  const result = new Map<string, EditorialCandidate>()
  if (!EDITORIAL_CANDIDATES_FILE) return result
  const rows = JSON.parse(readFileSync(EDITORIAL_CANDIDATES_FILE, 'utf8')) as EditorialCandidate[]
  if (!Array.isArray(rows)) throw new Error('--editorial-candidates 파일은 JSON 배열이어야 한다.')
  for (const row of rows) {
    if (!row?.slug || !row.guide?.trim() || !row.guideEn?.trim()) {
      throw new Error('--editorial-candidates에 slug/guide/guideEn이 비어 있는 항목이 있다.')
    }
    if (result.has(row.slug)) throw new Error(`--editorial-candidates slug 중복: ${row.slug}`)
    result.set(row.slug, row)
  }
  return result
})()

async function loadFactionContexts(): Promise<Map<string, FactionContext[]>> {
  const [members, tags] = await Promise.all([
    fetchAll<FactionContextRow>(
      'faction_atlas_members',
      'celeb_id,tag_id,short_desc,long_desc,group_label,group_label_en,group_subtitle,group_subtitle_en',
      (query) => query.order('celeb_id'),
    ),
    fetchAll<TagRow>('celeb_tags', 'id,name,name_en,slug', (query) => query.order('id')),
  ])
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  const contextsByProfile = new Map<string, FactionContext[]>()
  for (const member of members) {
    if (!member.celeb_id || !member.tag_id) continue
    const tag = tagById.get(member.tag_id)
    if (!tag) continue
    const context: FactionContext = {
      theme: tag.name,
      themeEn: tag.name_en,
      themeSlug: tag.slug,
      group: member.group_label,
      groupEn: member.group_label_en,
      groupSubtitle: member.group_subtitle,
      groupSubtitleEn: member.group_subtitle_en,
      shortDescription: member.short_desc,
      longDescription: member.long_desc,
    }
    contextsByProfile.set(member.celeb_id, [
      ...(contextsByProfile.get(member.celeb_id) ?? []),
      context,
    ])
  }
  return contextsByProfile
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

Identify every person carefully from the supplied name, birth date, affiliation, and context. Search the web in the person's original language as well as Korean or English. For each person, find two to four substantive sources that can support a factual public guide: a concrete work, event, decision, working method, or attributable view. Do not return an identity-only profile as the substantive result.

Source order:
1. Direct interviews, podcasts, official videos with attributable remarks, archived livestream coverage, the person's own writing, or official project material.
2. Original reporting by an established publication that names the work, event, choice, and result.
3. Scholarly or institutional sources when appropriate.

Social posts and livestreams may be used only when the speaker and exact account or authoritative coverage are identifiable. Do not invent a quotation from a paraphrase. YouTube or social URLs that cannot be checked may support discovery, but include a second accessible source. Do not use Wikipedia, Wikidata, fan wikis, profile aggregators, search-result pages, or snippets as final sources. If direct speech is scarce, report concrete work and decision evidence honestly instead of fabricating a personality.

For every attributed remark, verify that the named speaker is this exact person rather than a namesake, colleague, interviewer, or reporter. Use verbatim wording only when the opened source directly supports it. Otherwise summarize it as a paraphrase without quotation marks. A reporter's paraphrase is context, not the person's direct quote.

Return only one JSON array with every input slug exactly once. Write every title and summary in English using ASCII or ordinary Latin letters. If a page has only a Korean, Japanese, or Chinese title, provide a faithful English label instead of copying those characters. Each source summary must contain only facts supported by that URL and must be detailed enough for a writer who will not open the page. Use this schema:
[{
  "slug":"input slug",
  "sources":[{
    "title":"page or episode title",
    "url":"https://...",
    "sourceTier":"primary|official|reference|scholarly",
    "scope":"plain",
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
      const rawScope = String(source.scope ?? '').trim()
      const scope: DeepResearchSource['scope'] = ['plain', 'interpretation', 'both'].includes(rawScope)
        ? rawScope as DeepResearchSource['scope']
        : 'plain'
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
): Promise<Map<string, DeepResearchSource[]>> {
  const sources = [...researched.entries()].flatMap(([slug, rows]) =>
    rows.map((source) => ({ slug, source })))
  const badUrls = new Set<string>()
  const batches = chunksOf(sources, 8)
  for (const batch of batches) {
    await Promise.all(batch.map(async ({ source }) => {
      try {
        const response = await fetch(source.url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FeelAndNote/1.0; celeb-reading source check)',
            Range: 'bytes=0-2048',
          },
          signal: AbortSignal.timeout(15_000),
        })
        if ([404, 410].includes(response.status)) badUrls.add(source.url)
        await response.body?.cancel()
      } catch {
        // Some publications block automated fetches. Absence is rejected only when the origin
        // explicitly returns 404 or 410; identity and content still go through model review.
      }
    }))
  }
  const filtered = new Map([...researched.entries()].map(([slug, rows]) => [
    slug,
    rows.filter((source) => !badUrls.has(source.url)),
  ]))
  const insufficient = [...filtered.entries()]
    .filter(([, rows]) => rows.length < 2)
    .map(([slug]) => slug)
  if (insufficient.length) {
    throw new Error(`유효한 심화 조사 출처가 2개보다 적다: ${insufficient.join(', ')}`)
  }
  return filtered
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
      return await rejectExplicitlyMissingDeepSources(researched)
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
    if (saved && (
      saved.identityHash !== deepResearchIdentityHash(profile, contextsByProfile.get(profile.id) ?? [])
      || !saved.sources.length
    )) {
      delete cache[profile.slug]
    }
  }
  const missing = profiles.filter((profile) => !cache[profile.slug])
  const batches = chunksOf(missing, Math.min(6, BATCH_SIZE))
  const lanes = Array.from({ length: Math.min(3, CONCURRENCY, batches.length) }, () => [] as ProfileRow[][])
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
        if (batch.length > 1) {
          for (const profile of batch) {
            try {
              const researched = await callDeepResearch([profile], contextsByProfile)
              cache[profile.slug] = {
                identityHash: deepResearchIdentityHash(profile, contextsByProfile.get(profile.id) ?? []),
                generatedAt: new Date().toISOString(),
                sources: researched.get(profile.slug) ?? [],
              }
              writeFileSync(DEEP_RESEARCH_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
              console.log(`DEEP RESEARCH RECOVER lane ${laneIndex + 1} | ${profile.slug}`)
            } catch (singleError) {
              logFailure([profile.slug], 'deep-research-single', singleError)
              console.error(`DEEP RESEARCH HOLD ${profile.slug} | ${singleError instanceof Error ? singleError.message : String(singleError)}`)
            }
          }
        }
      }
    }
  }
  await Promise.all(lanes.map((lane, index) => runResearchLane(index, lane)))
  return new Map(profiles.flatMap((profile) => cache[profile.slug]?.sources?.length
    ? [[profile.slug, cache[profile.slug].sources]]
    : []))
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
    guideEn: current?.plain_text_en ?? null,
  }
}

function existingReviewInputHash(material: Material): string {
  return createHash('sha256')
    .update(`${REVIEW_VERSION}\n${JSON.stringify(existingReviewInput(material))}`, 'utf8')
    .digest('hex')
}

function buildExistingReviewPrompt(materials: Material[]): string {
  return `아래 기존 한국어·영어 "인물 안내"를 계속 사용할 수 있는지 엄격히 판정하라. 글을 고치거나 새로 쓰지 않는다. 외부 검색도 하지 않는다.

pass는 다음 두 조건을 만족하면 준다.
1. 처음 보는 독자가 이 사람이 누구이고 무엇으로 알려졌는지 알아볼 수 있다.
2. 한국인이 처음부터 한국어로 쓴 글처럼 자연스럽게 읽힌다.

명백한 사실 오류, 한영 의미 차이, 이력·작품·수치만 늘어놓아 인물을 알아보기 어려운 경우만 rewrite다. 두 조건을 이미 만족하면 표현을 더 고칠 수 있다는 이유만으로 rewrite하지 않는다. 짧아도 인물을 알아볼 수 있고 자연스러우면 pass다. reason에는 판정 근거를 구체적으로 한 문장으로 적는다.

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

function readReviewDecisions(
  file: string,
  databaseSlugs: Set<string>,
  pendingSlugs: string[],
): Map<string, ExistingReview> {
  if (!existsSync(file)) throw new Error(`선검수 결정 파일이 없다: ${file}`)
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as unknown
  } catch (error) {
    throw new Error(`선검수 결정 파일 JSON을 읽지 못했다: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!Array.isArray(parsed)) throw new Error('선검수 결정 파일은 JSON 배열이어야 한다.')

  const rows = parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('선검수 결정 항목이 객체가 아니다.')
    const row = value as Record<string, unknown>
    if (typeof row.slug !== 'string' || typeof row.verdict !== 'string' || typeof row.reason !== 'string') {
      throw new Error('선검수 결정의 slug, verdict, reason은 문자열이어야 한다.')
    }
    const slug = row.slug.trim()
    const verdict = row.verdict.trim() as ExistingReview['verdict']
    const reason = row.reason.trim()
    if (!slug) throw new Error('선검수 결정 항목의 slug가 비어 있다.')
    if (!['pass', 'rewrite'].includes(verdict)) throw new Error(`${slug} 결정 verdict가 잘못됐다: ${verdict}`)
    if (!reason) throw new Error(`${slug} 결정 reason이 비어 있다.`)
    return { slug, verdict, reason }
  })

  const duplicates = rows
    .map((row) => row.slug)
    .filter((slug, index, slugs) => slugs.indexOf(slug) !== index)
  if (duplicates.length) {
    throw new Error(`선검수 결정 파일에 중복 slug가 있다: ${[...new Set(duplicates)].join(',')}`)
  }
  const unknown = rows.map((row) => row.slug).filter((slug) => !databaseSlugs.has(slug))
  if (unknown.length) throw new Error(`DB에 없는 선검수 결정 slug: ${unknown.join(',')}`)

  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  const missing = pendingSlugs.filter((slug) => !bySlug.has(slug))
  if (missing.length) throw new Error(`현재 선검수 대상의 결정이 빠졌다: ${missing.join(',')}`)
  return bySlug
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

async function reviewExistingMaterials(materials: Material[]): Promise<Map<string, ExistingReview>> {
  const results = new Map<string, ExistingReview>()
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
  const publishedAt = material.profile.publication_status === 'active'
    ? current.published_at ?? new Date().toISOString()
    : null
  const { data, error } = await db
    .from('celeb_explanations')
    .update({ review_status: 'ai_reviewed', published_at: publishedAt })
    .eq('profile_id', material.profile.id)
    .eq('updated_at', current.updated_at)
    .is('review_status', null)
    .select('review_status, published_at, interpretive_title, interpretive_text, interpretive_title_en, interpretive_text_en')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`${material.profile.slug}: 선검수 뒤 행이 바뀌어 상태 반영을 중단했다.`)
  if (data.review_status !== 'ai_reviewed') throw new Error(`${material.profile.slug}: AI 검수 상태 재조회가 일치하지 않는다.`)
  const returnedPublishedAt = data.published_at ? new Date(data.published_at).getTime() : null
  const expectedPublishedAt = publishedAt ? new Date(publishedAt).getTime() : null
  if (returnedPublishedAt !== expectedPublishedAt) {
    throw new Error(`${material.profile.slug}: 검수 상태 반영 중 게시 시각이 일치하지 않는다.`)
  }
  if (!interpretiveFieldsMatch(data, current)) {
    throw new Error(`${material.profile.slug}: 검수 상태 반영 중 닫힌 인물 탐구가 바뀌었다.`)
  }
  return 'reviewed'
}

function inputForModel(material: Material) {
  const { profile } = material
  return {
    slug: profile.slug,
    name: profile.nickname,
    nameEn: profile.nickname_en,
    type: profile.celeb_reality === 'FICTION' ? 'fiction' : 'real',
    profession: profile.profession,
    title: profile.title,
    nationality: profile.nationality,
    life: [profile.birth_date, profile.death_date].filter(Boolean).join(' ~ ') || null,
    bio: profile.bio,
    existingReadingToImprove: material.existingExplanation ? {
      guide: material.existingExplanation.plain_text,
      guideEn: material.existingExplanation.plain_text_en,
    } : null,
    rewriteReason: material.rewriteReason,
    verifiedResearch: material.research ? {
      identityOverview: {
        title: material.research.title,
        summary: material.research.summary,
        url: material.research.url,
        matchedBy: material.research.matchedBy,
      },
      authoritativeSources: material.research.additionalSources ?? [],
    } : null,
  }
}

function inputHash(material: Material): string {
  return createHash('sha256')
    .update(`${PIPELINE_VERSION}\n${JSON.stringify(inputForModel(material))}`, 'utf8')
    .digest('hex')
}

function buildDraftPrompt(materials: Material[]): string {
  return `아래 여러 인물에 대해 한국어 "인물 안내" 초안을 써라. 도구를 사용하거나 웹을 검색하지 말고 제공한 재료만 사용한다.

rewriteReason은 기존 글에서 고칠 문제를 알려 주는 편집 의견이며 사실 근거가 아니다. verifiedResearch가 있으면 기본 프로필과 그 출처 요약에 명시된 사실만 쓴다. 모델의 기억이나 일반 상식으로 사건·업적·인과를 보태지 않는다. 출처 요약끼리 충돌하거나 확인 범위가 좁으면 더 보수적으로 쓴다. 기본 프로필의 이름이 verifiedResearch 및 영문 이름과 명백히 충돌하고 여러 출처가 같은 인물을 하나의 통용 이름으로 일관되게 식별할 때만 안내 본문에 그 통용 이름을 쓴다. 근거 없이 이름을 고치지 않으며 프로필 값 자체를 수정하지 않는다. URL이나 조사 과정을 본문에 쓰지 않는다.

existingReadingToImprove가 있으면 기존 글부터 읽는다. 이 글만으로 인물이 누구이고 왜 알려졌는지 알 수 있으며 한국어가 자연스러우면 좋은 문장을 그대로 살린다. rewriteReason의 문제가 현재 글에도 남아 있으면 그 부분만 고친다. 기존 글로 인물을 알아보기 어렵거나 한국어가 전반적으로 어색할 때만 새로 구성한다.

rewriteReason이 영어 한 구절, 한국어 한 구절, 중복 문장처럼 국소적인 문제를 가리키면 그 부분만 고치고 나머지 언어와 문장은 그대로 둔다. 문제와 무관한 내용을 더 넣지 않는다.

생애와 업적을 줄줄이 적지 말고, 이 인물을 알아보는 데 필요한 행동·생각·사건을 중심으로 짧게 쓴다. 대표 업적은 남긴다. 날짜와 수치는 흐름에 꼭 필요한 것만 쓴다. 팀이나 조직의 일을 개인이 한 것처럼 쓰지 않고, 아직 실행되지 않은 계획을 완료된 결과처럼 쓰지 않는다. 극적인 일화·반전·교훈을 만들지 않는다.

한국인이 처음부터 한국어로 쓴 글처럼 자연스럽게 쓴다. 소리 내 읽었을 때 주어, 어순, 수식 관계가 바로 이해되어야 한다. 첫 문장에서 명사로 정체를 설명할 때는 "[인물명]은/는 …이다."인 완결문이나, 이름과 서술격 조사를 함께 생략한 "…명사."형 bio 명사구 중 하나를 쓴다. bio형도 인물의 정체를 알려야 하며 "본명 이혜빈."처럼 인적사항 한 조각만 쓰지 않는다. "하데스는 그리스 신화에서 망자들을 다스리는 신이다."와 "그리스 신화에서 망자들을 다스리는 신."은 모두 허용한다. "…신다."처럼 "이다"만 "다"로 줄이거나 "…신입니다."로 쓰지 않는다. bio형을 완결문으로 바꿀 때는 끝에 "이다"만 붙이지 말고 이름을 주어로 넣는다. 평범한 동사를 쓰고 번역투, 인명사전 말투, 장식용 문예어, 교훈형 결말을 피한다. 재료가 단순하면 짧게 끝낸다.

모든 인물의 안내를 반드시 작성한다. holdReason이나 작성 거절 사유를 출력하지 않는다. JSON 배열만 출력하고 코드펜스와 설명을 붙이지 않는다.
[{
  "slug": "입력 slug",
  "guide": "인물 안내"
}]

[재료]
${JSON.stringify(materials.map(inputForModel), null, 2)}`
}

function buildRevisionPrompt(materials: Material[], drafts: Reading[]): string {
  return `아래 인물별 재료, 기존 안내, 초안을 대조해 한국어 "인물 안내"를 완성하고 자연스러운 영어 안내를 작성하라. 도구를 사용하거나 웹을 검색하지 말고 제공된 범위만 사용한다. 기존 안내나 초안에 정확하고 자연스러운 문장이 있으면 그대로 살리고, 지적된 문제만 고친다. 전체 글로 인물을 알아보기 어렵거나 한국어가 전반적으로 어색할 때만 다시 구성한다.

rewriteReason이 영어 한 구절, 한국어 한 구절, 중복 문장처럼 국소적인 문제를 가리키면 그 부분만 고친다. 수정하지 않아도 되는 언어와 문장은 입력 그대로 복사한다. 문제와 무관한 업적이나 해석을 보태지 않는다.

rewriteReason은 기존 글에서 고칠 문제를 알려 주는 편집 의견이며 사실 근거가 아니다. verifiedResearch가 있으면 기본 프로필과 그 출처 요약에 명시된 사실만 쓴다. 초안이나 모델의 기억에만 있는 사건·업적·인과는 삭제한다. 출처 요약끼리 충돌하거나 확인 범위가 좁으면 더 보수적으로 쓴다. 기본 프로필의 이름이 verifiedResearch 및 영문 이름과 명백히 충돌하고 여러 출처가 같은 인물을 하나의 통용 이름으로 일관되게 식별할 때만 안내 본문에 그 통용 이름을 쓴다. 근거 없이 이름을 고치지 않으며 프로필 값 자체를 수정하지 않는다. URL이나 조사 과정을 본문에 쓰지 않는다.

처음 보는 독자가 이 사람이 누구이고 무엇으로 알려졌는지 알아볼 수 있게 쓴다. 생애·직함·작품·수상을 줄줄이 적지 않고 필요한 행동·생각·사건만 남긴다. 대표 업적은 보존하고 날짜와 수치는 흐름에 꼭 필요한 것만 쓴다. 팀이나 조직의 일을 개인이 한 것처럼 쓰지 않으며, 자료에 없는 동기·인과·감정을 만들지 않는다.

한국인이 처음부터 한국어로 쓴 글처럼 자연스럽게 쓴다. 소리 내 읽었을 때 주어, 어순, 수식 관계가 바로 이해되어야 한다. 첫 문장에서 명사로 정체를 설명할 때는 "[인물명]은/는 …이다."인 완결문이나, 이름과 서술격 조사를 함께 생략한 "…명사."형 bio 명사구 중 하나를 쓴다. bio형도 인물의 정체를 알려야 하며 "본명 이혜빈."처럼 인적사항 한 조각만 쓰지 않는다. "하데스는 그리스 신화에서 망자들을 다스리는 신이다."와 "그리스 신화에서 망자들을 다스리는 신."은 모두 허용한다. "…신다."처럼 "이다"만 "다"로 줄이거나 "…신입니다."로 쓰지 않는다. bio형을 완결문으로 바꿀 때는 끝에 "이다"만 붙이지 말고 이름을 주어로 넣는다. 평범한 동사를 쓰고 번역투, 인명사전 말투, 장식용 문예어, 교훈형 결말을 피한다. “시간을 붙잡다”, “감각을 따라가다”, “방향을 보여 주다”, “같은 태도가 보인다”처럼 사실 대신 분위기와 평가를 말하는 문장을 쓰지 않는다. 재료가 단순하면 짧게 끝낸다.

모든 인물의 한영 안내를 반드시 작성한다. holdReason이나 작성 거절 사유를 출력하지 않는다. JSON 배열만 출력하고 코드펜스와 설명을 붙이지 않는다. 입력의 모든 slug를 정확히 한 번씩 포함한다.
[{
  "slug": "입력 slug",
  "guide": "최종 인물 안내",
  "guideEn": "faithful and natural English guide"
}]

영문은 한국어 최종본에 없는 사실·인과·평가·확신을 보태거나 빼지 않는다. 기존 영어 안내가 한국어와 같은 사실을 담고 자연스럽다면 불필요하게 바꾸지 않는다. 한국어 어순을 옮기지 말고 영어권 독자가 자연스럽게 읽는 산문으로 쓴다. 작품명과 인명은 확실한 통용 영문 표기만 사용한다. 확실하지 않으면 보수적으로 음역한다. 한국어·한자·일본어, 마크다운, 번역자 주석, em dash와 en dash를 넣지 않는다.

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
  return `아래 한영 인물 안내는 검수에서 오류가 발견됐다. errors에 적힌 문제만 고친다. 문제와 관계없는 문장, 사실, 순서는 가능한 한 그대로 둔다. 전체 글로 인물을 알아보기 어렵거나 한국어가 전반적으로 어색할 때만 다시 구성한다.

재료 안의 사실만 사용한다. rewriteReason은 편집 의견일 뿐 사실 근거가 아니다. 자료에 없는 사실·연도·숫자·동기·인과를 만들지 않고, 팀이나 조직의 일을 개인의 일로 바꾸지 않는다. 대표 업적을 남기고 날짜와 수치는 흐름에 꼭 필요한 것만 쓴다.

처음 보는 독자가 이 사람이 누구이고 무엇으로 알려졌는지 알아볼 수 있게 쓴다. 한국어는 한국인이 처음부터 쓴 글처럼 자연스러워야 한다. 첫 문장에서 명사로 정체를 설명할 때는 "[인물명]은/는 …이다."인 완결문이나, 이름과 서술격 조사를 함께 생략한 "…명사."형 bio 명사구 중 하나를 쓴다. bio형도 인물의 정체를 알려야 하며 "본명 이혜빈."처럼 인적사항 한 조각만 쓰지 않는다. "하데스는 그리스 신화에서 망자들을 다스리는 신이다."와 "그리스 신화에서 망자들을 다스리는 신."은 모두 허용한다. "…신다."처럼 "이다"만 "다"로 줄이거나 "…신입니다."로 쓰지 않는다. bio형을 완결문으로 바꿀 때는 끝에 "이다"만 붙이지 말고 이름을 주어로 넣는다. 평범한 동사를 쓰고 번역투, 인명사전 말투, 장식용 문예어, 교훈형 결말을 피한다. 한국어를 먼저 확정하고 영어는 같은 사실과 확신의 정도를 자연스럽게 전달한다. 긴 대시는 쓰지 않는다.

모든 slug를 정확히 한 번 포함한 JSON 배열만 출력한다. holdReason, 코드펜스, 설명은 출력하지 않는다.
[{
  "slug": "입력 slug",
  "guide": "인물 안내",
  "guideEn": "English guide"
}]

[재료·현재 글·검수 오류]
${JSON.stringify(materials.map((material) => ({
    material: inputForModel(material),
    current: readings.find((reading) => reading.slug === material.profile.slug),
    errors: errorsBySlug.get(material.profile.slug) ?? [],
  })), null, 2)}`
}

function buildGuideAuditPrompt(materials: Material[], readings: Reading[]): string {
  return `아래 한영 인물 안내를 실제로 읽고 판정하라. 글을 새로 쓰지 않으며, 글자 수나 문장 수로 판단하지 않는다.

quality의 기준은 두 가지다.
1. 처음 보는 독자가 이 사람이 누구이고 무엇으로 알려졌는지 알아볼 수 있는가.
2. 한국인이 처음부터 한국어로 쓴 글처럼 자연스럽게 읽히는가.

명백한 사실 오류, 자료에 없는 동기·인과, 팀이나 조직의 일을 개인에게 돌린 표현, 인물을 알아보기 어려운 이력·작품·숫자 나열이 있으면 quality는 false다. 명사로 정체를 설명하는 첫 문장이 "[인물명]은/는 …이다."인 완결문도, 이름과 서술격 조사를 함께 생략한 "…명사."형 bio 명사구도 아니면 false다. bio형이 "본명 이혜빈."처럼 정체를 설명하지 못하는 인적사항 한 조각이어도 false다. "…신다."처럼 "이다"만 "다"로 줄이거나 "…신입니다."로 쓴 경우, bio형 끝에 "이다"만 붙여 이름 없는 불완전한 완결문을 만든 경우도 false다. “시간을 붙잡다”, “감각을 따라가다”, “방향을 보여 주다”, “같은 태도가 보인다”처럼 사실을 흐리는 AI식 평론이나 추상적인 마무리가 있어도 false다. 특정 문장 수나 이야기 공식에 맞지 않는다는 이유만으로 실패시키지 않는다. 기존의 좋은 문장을 그대로 살린 것은 실패가 아니다.

faithfulEnglish는 영어가 한국어와 같은 사실, 행동 주체, 완료 여부와 확신의 정도를 자연스럽게 전달할 때만 true다. 한국어에 없는 배경지식을 보태거나 한국어의 핵심을 빼면 false다.

readerLearns에는 이 글만 읽고 독자가 이 인물에 대해 알 수 있는 구체적인 내용을 적는다. 답할 수 없으면 "없음"이라고 적고 quality를 false로 판정한다.

모든 slug를 정확히 한 번 포함한 JSON 배열만 출력한다.
[{
  "slug": "입력 slug",
  "quality": true,
  "faithfulEnglish": true,
  "readerLearns": "독자가 새로 알게 되는 구체적인 내용 또는 없음",
  "reason": "판정 근거 한 문장"
}]

[재료와 최종본]
${JSON.stringify(materials.map((material) => ({
    material: inputForModel(material),
    reading: readings.find((reading) => reading.slug === material.profile.slug),
  })), null, 2)}`
}

function parseGuideAudit(raw: string, expectedSlugs: string[]): Map<string, string> {
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
      quality: row.quality === true,
      faithfulEnglish: row.faithfulEnglish === true,
      readerLearns: String(row.readerLearns ?? '').trim(),
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
  return new Map(rows.filter((row) => !row.quality || !row.faithfulEnglish).map((row) => {
    const labels = [
      !row.quality ? '안내 품질 미달' : null,
      !row.faithfulEnglish ? '한영 의미 불일치' : null,
    ].filter(Boolean).join(', ')
    const learned = row.readerLearns || '없음'
    return [row.slug, `${labels}: ${row.reason || '검수를 통과하지 못했다.'} 독자가 새로 아는 것: ${learned}`]
  }))
}

async function auditGuideQuality(
  materials: Material[],
  readings: Reading[],
): Promise<Map<string, string>> {
  const errors = new Map<string, string>()
  for (const auditMaterials of batchesOf(materials, 6)) {
    const auditSlugs = new Set(auditMaterials.map((material) => material.profile.slug))
    const auditReadings = readings.filter((reading) => auditSlugs.has(reading.slug))
    const raw = await callModel(buildGuideAuditPrompt(auditMaterials, auditReadings), 'medium')
    for (const [slug, error] of parseGuideAudit(raw, auditMaterials.map((material) => material.profile.slug))) {
      errors.set(slug, error)
    }
  }
  return errors
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
      guideEn: requireEnglish ? String(row.guideEn ?? '').trim() : '',
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

function validateReading(reading: Reading): string[] {
  if (reading.holdReason) return ['최종 보류 금지']
  const errors: string[] = []
  if (!reading.guide) errors.push('한국어 안내 누락')
  if (!reading.guideEn) errors.push('영어 안내 누락')

  if (reading.guide && !/[가-힣]/.test(reading.guide)) errors.push('한국어 안내 문자 깨짐')
  if ((reading.guide.match(/\?/g) ?? []).length > 3 || reading.guide.includes('�')) {
    errors.push('한국어 안내 문자 깨짐')
  }
  if (/[一-鿿]/.test(reading.guide)) errors.push('한자 혼입')
  if (/https?:\/\/|\]\(|```|^#{1,6}\s/m.test(reading.guide)) errors.push('URL 또는 마크다운 혼입')
  if (/[—–]/.test(reading.guide)) errors.push('긴 대시 혼입')
  if (/(^|[.!?]\s*)(나는|저는|내가|제가)\s/.test(reading.guide)) errors.push('가상독백식 1인칭 혼입')
  if (/(현재 제공된|제공된 기록|기록(?:되어 있지|이 없)|설명할 수 없|단서(?:가|는) 없|확인할 수 없)/.test(reading.guide)) {
    errors.push('자료 부재를 본문으로 대신함')
  }
  if (/(?:공식|외부) (?:프로필|기록|자료|출처)|신원 (?:확인|자료)|동명이인|구별하는 자료|명시되어 있/.test(reading.guide)) {
    errors.push('조사 메모를 본문으로 대신함')
  }
  if (/[0-9가-힣]+\s*명조/.test(reading.guide)) errors.push('비문: 명조')
  if (/(포개|벼리|빚어|꿰뚫|녹아들|스며들|깃들|아로새|눌러 담|길어 올|삶으로 증명|온몸으로 (?:증명|보여)|그렇게 한 시대의 문을 열)/.test(reading.guide)) {
    errors.push('상투적 문예어 또는 교훈형 마무리')
  }
  if (/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(reading.guideEn)) {
    errors.push('영어 안내 CJK 혼입')
  }
  if (/https?:\/\/|```|^#{1,6}\s|translator(?:'s)? note|\bas an ai\b/im.test(reading.guideEn)) {
    errors.push('영문 URL·마크다운·번역 메모 혼입')
  }
  if (/[—–]/.test(reading.guideEn)) errors.push('영문 긴 대시 혼입')
  return errors
}

function validateBatch(readings: Reading[]): Map<string, string[]> {
  const errors = new Map<string, string[]>()
  const seenOpenings = new Map<string, string>()
  for (const reading of readings) {
    if (reading.holdReason) continue
    const openingKey = reading.guide.replace(/\s+/g, ' ').slice(0, 24)
    const previous = seenOpenings.get(openingKey)
    if (previous) {
      errors.set(reading.slug, [...(errors.get(reading.slug) ?? []), `첫 문장 판박이: ${previous}`])
    } else {
      seenOpenings.set(openingKey, reading.slug)
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

function readingAlreadyApplied(reading: SavedReading, material: Material): boolean {
  const current = material.existingExplanation
  return Boolean(current
    && current.plain_text === reading.guide
    && current.plain_text_en === reading.guideEn
    && current.review_status === 'ai_reviewed'
    && Boolean(current.published_at) === (material.profile.publication_status === 'active'))
}

function isCompletedGuideOnlyRow(row: ExplanationRow | null): boolean {
  return Boolean(row
    && row.review_status === 'ai_reviewed'
    && row.interpretive_title === NEW_EXPLANATION_PLACEHOLDER
    && row.interpretive_text === NEW_EXPLANATION_PLACEHOLDER
    && row.interpretive_title_en === null
    && row.interpretive_text_en === null)
}

async function quarantineInsertedReading(row: ExplanationRow): Promise<void> {
  const { data, error } = await db
    .from('celeb_explanations')
    .update({ review_status: null, published_at: null })
    .eq('profile_id', row.profile_id)
    .eq('updated_at', row.updated_at)
    .select('profile_id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('신규 설명 행이 검증 실패 격리 전에 바뀌었다.')
}

async function applyReading(reading: SavedReading, material: Material): Promise<'written' | 'held' | 'existing'> {
  const current = material.existingExplanation
  if (current?.review_status === 'human_reviewed') return 'existing'
  if (readingAlreadyApplied(reading, material)) return 'existing'
  if (reading.inputHash !== inputHash(material)) {
    throw new Error('저장된 최종본의 조사 재료가 현재 재료와 달라 다시 생성해야 한다.')
  }
  const currentErrors = validateReading(reading)
  const persistentErrors = reading.validationErrors
  if (reading.holdReason || currentErrors.length || persistentErrors.length) {
    if (EXPLAIN_HOLDS) {
      console.log(`HOLD ${reading.slug} | model=${reading.holdReason ?? '-'} | current=${currentErrors.join('; ') || '-'} | saved=${persistentErrors.join('; ') || '-'}`)
    }
    return 'held'
  }
  if (current && !REWRITE_EXISTING) {
    throw new Error('기존 안내를 바꾸려면 --rewrite-existing을 명시해야 한다.')
  }

  const payload = {
    plain_text: reading.guide,
    plain_text_en: reading.guideEn,
    review_status: 'ai_reviewed',
    published_at: material.profile.publication_status === 'active'
      ? current?.published_at ?? new Date().toISOString()
      : null,
  }
  const expectedInterpretive: InterpretiveFields = current ?? {
    interpretive_title: NEW_EXPLANATION_PLACEHOLDER,
    interpretive_text: NEW_EXPLANATION_PLACEHOLDER,
    interpretive_title_en: null,
    interpretive_text_en: null,
  }
  let updated: ExplanationRow | null
  if (current) {
    const { data, error } = await db
      .from('celeb_explanations')
      .update(payload)
      .eq('profile_id', material.profile.id)
      .eq('updated_at', current.updated_at)
      .select('profile_id, plain_text, interpretive_title, interpretive_text, plain_text_en, interpretive_title_en, interpretive_text_en, review_status, published_at, updated_at')
      .maybeSingle()
    if (error) throw error
    updated = data
  } else {
    const { data, error } = await db
      .from('celeb_explanations')
      .insert({
        profile_id: material.profile.id,
        ...payload,
        ...expectedInterpretive,
      })
      .select('profile_id, plain_text, interpretive_title, interpretive_text, plain_text_en, interpretive_title_en, interpretive_text_en, review_status, published_at, updated_at')
      .single()
    if (error) throw error
    updated = data
  }

  if (!updated) throw new Error('기존 설명이 생성 뒤 바뀌어 조건부 교체를 중단했다.')
  const abortAppliedReading = async (message: string, cause?: unknown): Promise<never> => {
    if (!current) await quarantineInsertedReading(updated)
    if (cause !== undefined) throw cause
    throw new Error(message)
  }
  if (!interpretiveFieldsMatch(updated, expectedInterpretive)) {
    return abortAppliedReading('안내 반영 중 닫힌 인물 탐구가 바뀌었다.')
  }

  const { data: verified, error: verifyError } = await db
    .from('celeb_explanations')
    .select('plain_text, interpretive_title, interpretive_text, plain_text_en, interpretive_title_en, interpretive_text_en, review_status, published_at')
    .eq('profile_id', material.profile.id)
    .single()
  if (verifyError) return abortAppliedReading('DB 재조회에 실패했다.', verifyError)
  if (
    verified.plain_text !== reading.guide
    || verified.plain_text_en !== reading.guideEn
  ) {
    return abortAppliedReading('DB 재조회 한영 본문이 개선본과 다르다.')
  }
  if (!interpretiveFieldsMatch(verified, expectedInterpretive)) {
    return abortAppliedReading('DB 재조회에서 닫힌 인물 탐구가 바뀌었다.')
  }
  if (verified.review_status !== 'ai_reviewed') {
    return abortAppliedReading('DB 재조회 AI 검수 상태가 개선본과 다르다.')
  }
  if (material.profile.publication_status === 'active' && !verified.published_at) {
    return abortAppliedReading('활성 프로필의 게시 시각이 비어 있다.')
  }
  if (material.profile.publication_status !== 'active' && verified.published_at) {
    return abortAppliedReading('비활성·정지 프로필이 게시됐다.')
  }
  return 'written'
}

async function generateBatch(materials: Material[]): Promise<Map<string, SavedReading>> {
  const finals = new Map<string, SavedReading>()
  const toRevise: Material[] = []
  for (const material of materials) {
    const editorial = editorialCandidates.get(material.profile.slug)
    if (editorial) {
      const reading: Reading = {
        slug: editorial.slug,
        guide: editorial.guide,
        guideEn: editorial.guideEn,
        holdReason: null,
      }
      saveReading(FINAL_DIR, 'final', reading, material, validateReading(reading))
      finals.set(material.profile.slug, readSaved(FINAL_DIR, material.profile.slug)!)
      continue
    }
    const saved = RESUME ? readSaved(FINAL_DIR, material.profile.slug) : null
    const reusable = saved
      && (saved.inputHash === inputHash(material) || readingAlreadyApplied(saved, material))
      && !saved.holdReason
      && saved.validationErrors.length === 0
      && validateReading(saved).length === 0
    if (reusable) finals.set(material.profile.slug, saved)
    else toRevise.push(material)
  }

  const drafts = new Map<string, Reading>()
  const missingDrafts: Material[] = []

  for (const material of toRevise) {
    if (material.existingExplanation) {
      drafts.set(material.profile.slug, {
        slug: material.profile.slug,
        guide: material.existingExplanation.plain_text,
        guideEn: material.existingExplanation.plain_text_en ?? '',
        holdReason: null,
      })
      continue
    }
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

  if (toRevise.length) {
    const draftRows = toRevise.map((material) => drafts.get(material.profile.slug)!)
    const raw = await callModel(buildRevisionPrompt(toRevise, draftRows), 'medium')
    let revised = parseReadings(raw, toRevise.map((material) => material.profile.slug), true)
    const guideAuditErrors = await auditGuideQuality(toRevise, revised)

    for (let repairAttempt = 1; repairAttempt <= 2; repairAttempt += 1) {
      const batchErrors = validateBatch(revised)
      const errorsBySlug = new Map<string, string[]>()
      for (const reading of revised) {
        const errors = [
          ...validateReading(reading),
          ...(batchErrors.get(reading.slug) ?? []),
          ...(guideAuditErrors.has(reading.slug) ? [guideAuditErrors.get(reading.slug)!] : []),
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
      const repairedGuideAuditErrors = await auditGuideQuality(repairMaterials, repaired)
      for (const material of repairMaterials) guideAuditErrors.delete(material.profile.slug)
      for (const [slug, error] of repairedGuideAuditErrors) guideAuditErrors.set(slug, error)
    }

    const batchErrors = validateBatch(revised)
    for (const reading of revised) {
      const material = toRevise.find((item) => item.profile.slug === reading.slug)!
      const errors = [
        ...validateReading(reading),
        ...(batchErrors.get(reading.slug) ?? []),
        ...(guideAuditErrors.has(reading.slug) ? [guideAuditErrors.get(reading.slug)!] : []),
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
  const profileSelect = 'id,slug,nickname,nickname_en,bio,profession,title,nationality,birth_date,death_date,publication_status,celeb_tier,celeb_reality,wikidata_qid'
  const explanationSelect = 'profile_id,review_status,published_at,plain_text,interpretive_title,interpretive_text,plain_text_en,interpretive_title_en,interpretive_text_en,updated_at'
  let profiles: ProfileRow[]
  let explanations: ExplanationRow[]

  if (SLUGS) {
    // 명시적 배치는 긴 안내문 전수를 먼저 읽지 않는다. 대상 프로필을 고정한 뒤 그 ID의
    // 설명만 가져와 작은 배치도 statement timeout 없이 같은 검증 경로를 타게 한다.
    profiles = await fetchAll<ProfileRow>(
      'celebs',
      profileSelect,
      (query) => query
        .neq('publication_status', 'deleted')
        .in('slug', [...SLUGS])
        .order('id'),
    )
    const profileIds = profiles.map((profile) => profile.id)
    explanations = profileIds.length === 0
      ? []
      : await fetchAll<ExplanationRow>(
        'celeb_explanations',
        explanationSelect,
        (query) => query.in('profile_id', profileIds).order('profile_id'),
      )
  } else {
    [profiles, explanations] = await Promise.all([
      fetchAll<ProfileRow>(
        'celebs',
        profileSelect,
        (query) => query.neq('publication_status', 'deleted').order('id'),
      ),
      fetchAll<ExplanationRow>(
        'celeb_explanations',
        explanationSelect,
        (query) => query.order('profile_id'),
      ),
    ])
  }

  const existingIds = new Set(explanations.map((row) => row.profile_id))
  const selectedDatabaseSlugs = new Set(profiles.map((profile) => profile.slug))
  // Review-decision files may intentionally contain rows for other live profiles so the same
  // editorial ledger can be reused across explicit batches. The optimized --slugs query above
  // must not make those legitimate extra rows look like nonexistent profiles.
  const reviewDecisionDatabaseSlugs = REVIEW_DECISIONS_FILE && SLUGS
    ? new Set((await fetchAll<{ slug: string }>(
      'celebs',
      'slug',
      (query) => query.neq('publication_status', 'deleted').order('slug'),
    )).map((profile) => profile.slug))
    : selectedDatabaseSlugs

  const statusRank = { active: 0, inactive: 1 }
  let targets = profiles
    .filter((profile) => INCLUDE_EXISTING || REWRITE_EXISTING || !existingIds.has(profile.id))
    .filter((profile) => !SLUGS || SLUGS.has(profile.slug))
    .sort((a, b) => statusRank[a.publication_status] - statusRank[b.publication_status] || a.slug.localeCompare(b.slug))

  if (SLUGS) {
    const missing = [...SLUGS].filter((slug) => !selectedDatabaseSlugs.has(slug))
    if (missing.length) throw new Error(`프로필에 없는 slug: ${missing.join(', ')}`)
  }
  if (LIMIT !== Number.POSITIVE_INFINITY) targets = targets.slice(0, LIMIT)

  const explanationById = new Map(explanations.map((row) => [row.profile_id, row]))
  const preReviewMaterials: Material[] = targets.map((profile) => ({
    profile,
    existingExplanation: explanationById.get(profile.id) ?? null,
    rewriteReason: null,
    research: null,
  }))
  const humanReviewed = preReviewMaterials.filter((material) =>
    material.existingExplanation?.review_status === 'human_reviewed')
  const automaticMaterials = preReviewMaterials.filter((material) =>
    material.existingExplanation?.review_status !== 'human_reviewed')
  const newMaterials = automaticMaterials.filter((material) => !material.existingExplanation)
  const completedGuideOnlyMaterials = automaticMaterials.filter((material) =>
    !FULL_AUDIT
    && isCompletedGuideOnlyRow(material.existingExplanation)
    && !editorialCandidates.has(material.profile.slug))
  const existingAutomaticMaterials = automaticMaterials.filter((material) =>
    material.existingExplanation
    && (FULL_AUDIT
      || !isCompletedGuideOnlyRow(material.existingExplanation)
      || editorialCandidates.has(material.profile.slug)))
  let statusSkipped = humanReviewed.length + completedGuideOnlyMaterials.length
  let reviewPassed = 0
  let reviewRewrite = automaticMaterials.length
  let reviewStatusWritten = 0
  let selectedMaterials = automaticMaterials

  if (REVIEW_EXISTING && !STATS) {
    const pendingReview = FULL_AUDIT
      ? existingAutomaticMaterials
      : existingAutomaticMaterials.filter((material) => !material.existingExplanation?.review_status)
    statusSkipped += existingAutomaticMaterials.length - pendingReview.length
    const reviews = REVIEW_DECISIONS_FILE
      ? readReviewDecisions(
          REVIEW_DECISIONS_FILE,
          reviewDecisionDatabaseSlugs,
          pendingReview.map((material) => material.profile.slug),
        )
      : await reviewExistingMaterials(pendingReview)
    const passed = pendingReview.filter((material) => reviews.get(material.profile.slug)?.verdict === 'pass')
    selectedMaterials = [
      ...pendingReview.flatMap((material) => {
        const review = reviews.get(material.profile.slug)
        return review?.verdict === 'rewrite'
          ? [{ ...material, rewriteReason: review.reason }]
          : []
      }),
      ...newMaterials,
    ]
    reviewPassed = passed.length
    reviewRewrite = selectedMaterials.length

    if (APPLY) {
      for (const batch of chunksOf(passed, 16)) {
        const results = await Promise.all(batch.map((material) => markExistingReviewPassed(material)))
        reviewStatusWritten += results.filter((result) => result === 'reviewed').length
      }
    }
  }

  const researchFailedMaterials: Material[] = []
  let materials = selectedMaterials
  if (!STATS && RESEARCH && selectedMaterials.length) {
    const contextsByProfile = await loadFactionContexts()
    const profilesToResearch = selectedMaterials.map((material) => material.profile)
    const identityOverviews = await researchProfiles(profilesToResearch, contextsByProfile)
    const deepSources = DEEP_RESEARCH
      ? await researchProfilesDeep(profilesToResearch, contextsByProfile)
      : new Map<string, DeepResearchSource[]>()

    const researched: Material[] = []
    for (const material of selectedMaterials) {
      const overview = identityOverviews.get(material.profile.slug)
      const sources = deepSources.get(material.profile.slug)
      const attachedResearch = attachDeepResearch(overview ?? null, sources)
      const failed = DEEP_RESEARCH ? !sources?.length : !overview
      if (failed) {
        researchFailedMaterials.push(material)
        const reason = DEEP_RESEARCH && !sources?.length
          ? '권위·1차 자료 심화 조사 실패'
          : '신원·생애 개관 조사 실패'
        logFailure([material.profile.slug], 'research-missing', reason)
        console.error(`RESEARCH HOLD ${material.profile.slug} | ${reason}`)
        continue
      }
      researched.push({
        ...material,
        research: attachedResearch,
      })
    }
    materials = researched
  }

  if (STATS) {
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
    const byStatus = Object.fromEntries(['active', 'inactive'].map((status) => {
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
    }> = []
    const savedValidationSamples: Array<{ slug: string; errors: string[] }> = []
    for (const material of materials) {
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
      const currentErrors = validateReading(final)
      const persistentErrors = final.validationErrors
      if (currentErrors.length) {
        missingBreakdown.currentValidation += 1
        if (validationSamples.length < 16) {
          validationSamples.push({
            slug: final.slug,
            errors: currentErrors,
            guide: final.guide,
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
    const missingByStatus = Object.fromEntries(['active', 'inactive'].map((status) => [
      status,
      materials.filter((material) => material.profile.publication_status === status).length,
    ]))
    let publicRls: { visible: number | null; inactiveVisible: number | null; error: string | null } | null = null
    const anonKey = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
    if (anonKey) {
      const publicClient = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, anonKey, {
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
    RESEARCH ? `조사 보류 ${researchFailedMaterials.length}` : null,
    `묶음 ${BATCH_SIZE}`,
    `독립 릴레이 ${CONCURRENCY}`,
    `모델 ${MODEL}`,
    APPLY ? 'DB 조건부 반영' : 'DB 쓰기 없음',
  ].filter(Boolean).join(' | '))

  if (PLAN) {
    for (const material of materials) {
      console.log(`PLAN ${material.profile.publication_status.padEnd(9)} ${material.profile.celeb_tier ?? '-'} ${material.profile.slug} ${material.profile.nickname} | en=${material.profile.nickname_en ?? '-'} qid=${material.profile.wikidata_qid ?? '-'} nation=${material.profile.nationality ?? '-'} life=${material.profile.birth_date ?? '-'}~${material.profile.death_date ?? '-'} bio=${material.profile.bio?.length ?? 0}`)
      if (VERBOSE) console.log(JSON.stringify({
        material: inputForModel(material),
        existingExplanation: existingReviewInput(material),
      }, null, 2))
    }
    return
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

  console.log(`완료 | 검수 대상 ${targets.length} | 상태 스킵 ${statusSkipped} | 본문 유지 ${reviewPassed} | 검수상태 반영 ${reviewStatusWritten} | 조사 보류 ${researchFailedMaterials.length} | 재작성 처리 ${completed} | DB 본문 반영 ${written} | 이미 반영 ${alreadyApplied} | 보류 ${held} | 실패 ${failed} | ${Math.round((Date.now() - startedAt) / 1000)}s`)
  if (failed || researchFailedMaterials.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
