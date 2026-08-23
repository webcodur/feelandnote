/**
 * 셀럽 active 전환 준비도 감사 및 선택적 일괄 활성화.
 *
 * 기본은 읽기 전용이다. --apply를 명시해야 inactive 후보만 active로 바꾼다.
 *
 * 판정은 두 갈래다.
 * - gaps: 활성화 탈락 사유. 인물 자신의 데이터와 DB 트리거가 강제하는 조건만 센다.
 * - warnings: 품질 경고. 인물이 소비한 콘텐츠의 메타(제목·저자·표지·ISBN·locale 행)
 *   결손이며 활성화를 막지 않는다. 이 메타는 인물 데이터가 아니라 콘텐츠 데이터이고,
 *   표지·ISBN은 수집 API가 주지 않으면 인물 쪽 작업으로 풀 수 없다.
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --json
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --apply
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --slugs=slug-a,slug-b
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --status=all --skip-link-check
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --html --skip-link-check
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { isCelebContentResearchTarget } from '@feelandnote/shared/constants/celeb-content-research'
import { writeCelebReadinessHtml } from '../lib/celeb-readiness-report'
import { activationRevalidationRequest } from './audit-activation-revalidation'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const PAGE = 1000
const CHUNK = 100
const LINK_CONCURRENCY = 6
const LINK_TIMEOUT_MS = 15_000

const INFLUENCE_AXES = [
  'political', 'strategic', 'tech', 'social', 'economic', 'cultural', 'transhistoricity',
] as const
const SPECTRUM_GROUPS = {
  abilities: ['command', 'martial', 'intellect', 'charm'],
  inner_virtues: ['temperance', 'diligence', 'reflection', 'courage'],
  outer_virtues: ['loyalty', 'benevolence', 'fairness', 'humility'],
  dispositions: ['pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold'],
} as const
const DIALOGUE_KEYS = [
  'greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack',
] as const
const COVERAGE_DOMAINS = ['basic', 'influence', 'spectrum', 'speech', 'content', 'source'] as const

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const JSON_OUTPUT = args.includes('--json')
const SKIP_LINK_CHECK = args.includes('--skip-link-check')
const HTML_ARG = args.find((arg) => arg === '--html' || arg.startsWith('--html='))
const HTML_ARG_VALUE = HTML_ARG?.startsWith('--html=') ? HTML_ARG.split('=', 2)[1]?.trim() : ''
const HTML_OUTPUT = HTML_ARG
  ? path.resolve(process.cwd(), HTML_ARG_VALUE || '../../.artifacts/celeb-data-readiness.html')
  : null
const STATUS = (args.find((arg) => arg.startsWith('--status='))?.split('=', 2)[1]
  ?? (HTML_OUTPUT ? 'all' : 'inactive')) as
  | 'inactive'
  | 'active'
  | 'all'
const SLUGS = new Set(
  (args.find((arg) => arg.startsWith('--slugs='))?.split('=', 2)[1] ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean),
)

if (APPLY && STATUS !== 'inactive') {
  throw new Error('--apply는 --status=inactive 범위에서만 허용됩니다.')
}
if (APPLY && HTML_OUTPUT) throw new Error('--apply와 --html은 함께 사용할 수 없습니다.')
if (JSON_OUTPUT && HTML_OUTPUT) throw new Error('--json과 --html은 함께 사용할 수 없습니다.')

// Supabase의 테이블별 생성 타입을 이 운영 스크립트에 전부 끌어오지 않고 동적 감사한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type LinkResult = { ok: boolean; status: number; error?: string }
type LinkAudit = {
  mode: 'skipped' | 'checked'
  checked: number
  passed: number
  failed: number
  failureStatusCounts: Record<string, number>
}
type CoverageDomain = (typeof COVERAGE_DOMAINS)[number]
type Coverage = {
  complete: number
  required: number
  percentage: number
  completeDomains: CoverageDomain[]
  missingDomains: CoverageDomain[]
}
type AuditRow = {
  id: string
  slug: string
  nickname: string
  tier: string
  publicationStatus: string
  gaps: string[]
  warnings: string[]
  coverage: Coverage
}

const blank = (value: unknown) => value === null || value === undefined || String(value).trim() === ''
const chunks = <T>(values: T[], size = CHUNK): T[][] =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size))

async function allProfiles(): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    let query = db
      .from('celebs')
      .select([
        'id', 'slug', 'nickname', 'nickname_en', 'headline', 'headline_en', 'title', 'title_en', 'bio', 'bio_en',
        'profession', 'nationality', 'gender', 'birth_date', 'publication_status', 'celeb_tier', 'speech_tone',
        'avatar_url', 'content_research_confirmed_empty_at',
      ].join(','))
      .order('id')
      .range(from, from + PAGE - 1)

    if (STATUS !== 'all') query = query.eq('publication_status', STATUS)
    if (SLUGS.size > 0) query = query.in('slug', [...SLUGS])

    const { data, error } = await query
    if (error) throw new Error(`celebs 조회 실패: ${error.message}`)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

async function byIds(table: string, select: string, ids: string[], column = 'celeb_id'): Promise<Row[]> {
  if (ids.length === 0) return []
  const out: Row[] = []
  for (const group of chunks(ids)) {
    const { data, error } = await db.from(table).select(select).in(column, group)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    out.push(...(data ?? []))
  }
  return out
}

async function byContentIds(table: string, select: string, ids: string[]): Promise<Row[]> {
  if (ids.length === 0) return []
  const out: Row[] = []
  for (const group of chunks(ids)) {
    const { data, error } = await db.from(table).select(select).in('content_id', group)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    out.push(...(data ?? []))
  }
  return out
}

async function checkUrl(sourceUrl: string): Promise<LinkResult> {
  try {
    const response = await fetch(sourceUrl, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; FeelAndNoteActivationAudit/1.0)' },
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
    })
    await response.body?.cancel()
    return { ok: response.ok, status: response.status }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    }
  }
}

async function checkUrls(urls: string[]): Promise<Map<string, LinkResult>> {
  const result = new Map<string, LinkResult>()
  const unique = [...new Set(urls)]
  let nextProgress = 60
  console.error(`출처 링크 검사 시작: ${unique.length}개`)
  for (let index = 0; index < unique.length; index += LINK_CONCURRENCY) {
    const group = unique.slice(index, index + LINK_CONCURRENCY)
    const checked = await Promise.all(group.map(async (sourceUrl) => [sourceUrl, await checkUrl(sourceUrl)] as const))
    for (const [sourceUrl, state] of checked) result.set(sourceUrl, state)
    const completed = Math.min(index + group.length, unique.length)
    if (completed >= nextProgress || completed === unique.length) {
      const failed = [...result.values()].filter((state) => !state.ok).length
      console.error(`출처 링크 검사: ${completed}/${unique.length} · 현재 실패 ${failed}`)
      nextProgress = completed + 60
    }
  }
  return result
}

function addProfileGaps(profile: Row, gaps: string[]) {
  const tier = profile.celeb_tier ?? 'full'
  const common = [
    'nickname', 'nickname_en', 'slug', 'headline', 'headline_en', 'profession', 'title', 'title_en', 'bio', 'bio_en',
    'nationality', 'avatar_url',
  ]
  for (const field of common) if (blank(profile[field])) gaps.push(`basic:${field}`)
  if (profile.gender === null || profile.gender === undefined) gaps.push('basic:gender')
  if (tier !== 'fiction' && blank(profile.birth_date)) gaps.push('basic:birth_date')
}

// 인물 탐구(interpretive_*)를 화면에서 닫은 뒤(2026-08-22) 읽어보기 구획에 남은 산문은
// 인물 안내(plain_text)뿐이다. 안내가 없으면 구획이 통째로 빈 채 노출되므로 전 티어 필수다.
// 안내는 인물 자신의 데이터이므로 basic 영역으로 센다.
function addReadingGaps(explanation: Row | undefined, gaps: string[]) {
  if (!explanation) {
    gaps.push('basic:explanation_row')
    return
  }
  if (blank(explanation.plain_text)) gaps.push('basic:plain_text')
  if (blank(explanation.plain_text_en)) gaps.push('basic:plain_text_en')
}

function addInfluenceGaps(profile: Row, influence: Row | undefined, gaps: string[]) {
  if (!influence) {
    gaps.push('influence:row')
    return
  }
  for (const axis of INFLUENCE_AXES) {
    if (influence[axis] === null || influence[axis] === undefined) gaps.push(`influence:${axis}`)
    if (blank(influence[`${axis}_exp`])) gaps.push(`influence:${axis}_exp`)
    if (blank(influence[`${axis}_exp_en`])) gaps.push(`i18n:${axis}_exp_en`)
  }
  if (influence.total_score === null || influence.total_score === undefined) gaps.push('influence:total_score')
}

function addSpectrumGaps(spectrumRow: Row | undefined, gaps: string[]) {
  const spectrum = spectrumRow?.spectrum
  if (!spectrum) {
    gaps.push('spectrum:row')
    return
  }
  if (blank(spectrum.rationale_ko)) gaps.push('spectrum:rationale_ko')
  if (blank(spectrum.rationale_en)) gaps.push('spectrum:rationale_en')
  for (const [group, keys] of Object.entries(SPECTRUM_GROUPS)) {
    for (const key of keys) {
      const value = spectrum?.[group]?.[key]
      if (!value || typeof value.score !== 'number' || blank(value.reason_ko) || blank(value.reason_en)) {
        gaps.push(`spectrum:${group}.${key}`)
      }
    }
  }
}

function addDialogueGaps(dialogue: Row | undefined, gaps: string[]) {
  if (!dialogue) {
    gaps.push('speech:dialogue_row')
    return
  }
  if (blank(dialogue.lines?.quote)) gaps.push('speech:quote')
  if (blank(dialogue.lines_en?.quote)) gaps.push('i18n:quote_en')
  for (const key of DIALOGUE_KEYS) {
    const ko = dialogue.lines?.[key]
    const en = dialogue.lines_en?.[key]
    if (!Array.isArray(ko) || ko.length !== 3 || ko.some(blank)) gaps.push(`speech:ko.${key}`)
    if (!Array.isArray(en) || en.length !== 3 || en.some(blank)) gaps.push(`i18n:en.${key}`)
  }
}

// 콘텐츠 메타는 인물 데이터가 아니라 콘텐츠 데이터다. 활성화를 막지 않고 품질 경고로만 센다.
function addLocaleWarnings(contentId: string, content: Row | undefined, locales: Row[], warnings: string[]) {
  for (const locale of ['ko', 'en']) {
    const row = locales.find((item) => item.locale === locale)
    if (!row) {
      warnings.push(`content:${contentId}.${locale}.row`)
      continue
    }
    for (const field of ['title', 'creator', 'thumbnail_url']) {
      if (blank(row[field])) warnings.push(`content:${contentId}.${locale}.${field}`)
    }
    if (content?.type === 'BOOK' && blank(row.isbn)) warnings.push(`content:${contentId}.${locale}.isbn`)
  }
}

function requiredCoverageDomains(tier: string): CoverageDomain[] {
  if (tier === 'full' || tier === 'light') {
    return ['basic', 'influence', 'spectrum', 'speech', 'content']
  }
  if (tier === 'fiction') return ['basic', 'source']
  return ['basic']
}

function hasDomainGap(domain: CoverageDomain, gaps: string[]): boolean {
  if (domain === 'basic') return gaps.some((gap) => gap.startsWith('basic:'))
  if (domain === 'influence') {
    return gaps.some((gap) => gap.startsWith('influence:') || /^i18n:[a-z_]+_exp_en$/.test(gap))
  }
  if (domain === 'spectrum') return gaps.some((gap) => gap.startsWith('spectrum:'))
  if (domain === 'speech') {
    return gaps.some((gap) =>
      gap.startsWith('speech:') || gap === 'i18n:quote_en' || gap.startsWith('i18n:en.'),
    )
  }
  if (domain === 'content') return gaps.some((gap) => gap.startsWith('content:'))
  return gaps.some((gap) => gap.startsWith('fiction:'))
}

function coverageOf(tier: string, gaps: string[]): Coverage {
  const domains = requiredCoverageDomains(tier)
  const completeDomains = domains.filter((domain) => !hasDomainGap(domain, gaps))
  const missingDomains = domains.filter((domain) => hasDomainGap(domain, gaps))
  return {
    complete: completeDomains.length,
    required: domains.length,
    percentage: Math.round((completeDomains.length / domains.length) * 1000) / 10,
    completeDomains,
    missingDomains,
  }
}

function summarizeCoverage(rows: AuditRow[]) {
  const percentages = rows.map((row) => row.coverage.percentage)
  const domainCoverage = Object.fromEntries(
    COVERAGE_DOMAINS.flatMap((domain) => {
      const applicable = rows.filter((row) => requiredCoverageDomains(row.tier).includes(domain))
      if (applicable.length === 0) return []
      const complete = applicable.filter((row) => row.coverage.completeDomains.includes(domain)).length
      return [[domain, {
        complete,
        applicable: applicable.length,
        percentage: Math.round((complete / applicable.length) * 1000) / 10,
      }]]
    }),
  )

  return {
    averagePercentage: percentages.length > 0
      ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 10) / 10
      : 0,
    bands: {
      '100': percentages.filter((value) => value === 100).length,
      '80-99': percentages.filter((value) => value >= 80 && value < 100).length,
      '60-79': percentages.filter((value) => value >= 60 && value < 80).length,
      '40-59': percentages.filter((value) => value >= 40 && value < 60).length,
      '20-39': percentages.filter((value) => value >= 20 && value < 40).length,
      '0-19': percentages.filter((value) => value < 20).length,
    },
    domains: domainCoverage,
  }
}

function normalizeGap(gap: string): string {
  return gap.replace(/^content:[^.]+(?:\.(?:ko|en))?\./, 'content:')
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const key = keyOf(row)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

async function revalidateCaches() {
  const secret = process.env.CRON_SECRET
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  if (!secret) return { ok: false, detail: 'CRON_SECRET 없음' }
  try {
    const request = activationRevalidationRequest()
    const response = await fetch(`${webUrl}${request.endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tag: request.tags,
        secret,
      }),
    })
    return { ok: response.ok, detail: `HTTP ${response.status}` }
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

async function main() {
  const profiles = await allProfiles()
  const ids = profiles.map((profile) => profile.id)
  const [influences, spectra, dialogues, explanations, celebContents, fictionSources] = await Promise.all([
    byIds('celeb_influence', '*', ids),
    byIds('celeb_persona', 'celeb_id,spectrum:persona', ids),
    byIds('celeb_dialogues', 'celeb_id,lines,lines_en', ids),
    byIds('celeb_explanations', 'profile_id,plain_text,plain_text_en', ids, 'profile_id'),
    byIds('celeb_contents', 'celeb_id,content_id,status,review,review_en,source_url', ids, 'celeb_id'),
    byIds('fiction_source_characters', 'celeb_id,content_id,relation_type', ids),
  ])

  const contentIds = [...new Set([
    ...celebContents.map((row) => row.content_id),
    ...fictionSources.map((row) => row.content_id),
  ])]
  const [contents, locales] = await Promise.all([
    byIds('contents', 'id,type,external_source', contentIds, 'id'),
    byContentIds('content_locales', 'content_id,locale,title,creator,thumbnail_url,isbn', contentIds),
  ])

  const influenceById = new Map(influences.map((row) => [row.celeb_id, row]))
  const spectrumById = new Map(spectra.map((row) => [row.celeb_id, row]))
  const dialogueById = new Map(dialogues.map((row) => [row.celeb_id, row]))
  const explanationById = new Map(explanations.map((row) => [row.profile_id, row]))
  const contentById = new Map(contents.map((row) => [row.id, row]))
  const celebContentsByCeleb = groupBy(celebContents, (row) => row.celeb_id)
  const fictionSourcesByCeleb = groupBy(fictionSources, (row) => row.celeb_id)
  const localesByContent = groupBy(locales, (row) => row.content_id)

  const audited: AuditRow[] = profiles.map((profile) => {
    const tier = profile.celeb_tier ?? 'full'
    const gaps: string[] = []
    const warnings: string[] = []
    const linked = celebContentsByCeleb.get(profile.id) ?? []
    const sources = fictionSourcesByCeleb.get(profile.id) ?? []

    addProfileGaps(profile, gaps)
    addReadingGaps(explanationById.get(profile.id), gaps)
    if (tier === 'full' || tier === 'light') {
      if (blank(profile.speech_tone)) gaps.push('speech:tone')
      addInfluenceGaps(profile, influenceById.get(profile.id), gaps)
      addSpectrumGaps(spectrumById.get(profile.id), gaps)
      addDialogueGaps(dialogueById.get(profile.id), gaps)
    }

    if (tier === 'full') {
      if (linked.length === 0) gaps.push('content:full_without_content')
      // 읽고 싶은 책을 담아 두는 것은 서비스의 정상 기능이다. FINISHED 가 한 건도 없을 때만 막는다.
      // 전부 FINISHED 를 요구하면 WANT 한 건 때문에 완비 인물이 탈락한다(실측 3명).
      if (!linked.some((x) => x.status === 'FINISHED')) gaps.push('content:no_finished')
      for (const item of linked) {
        if (blank(item.review)) gaps.push(`content:${item.content_id}.review`)
        if (blank(item.review_en)) gaps.push(`content:${item.content_id}.review_en`)
        if (blank(item.source_url)) gaps.push(`content:${item.content_id}.source_url`)
        addLocaleWarnings(
          item.content_id,
          contentById.get(item.content_id),
          localesByContent.get(item.content_id) ?? [],
          warnings,
        )
      }
    } else if (tier === 'light') {
      if (linked.length > 0) gaps.push('content:light_has_content')
      if (blank(profile.content_research_confirmed_empty_at)) gaps.push('content:empty_not_confirmed')
    } else if (tier === 'fiction') {
      if (sources.length === 0) gaps.push('fiction:source_missing')
      for (const source of sources) {
        addLocaleWarnings(
          source.content_id,
          contentById.get(source.content_id),
          localesByContent.get(source.content_id) ?? [],
          warnings,
        )
      }
    } else {
      gaps.push(`tier:unsupported(${tier})`)
    }

    const uniqueGaps = [...new Set(gaps)]
    return {
      id: profile.id,
      slug: profile.slug ?? '',
      nickname: profile.nickname ?? '',
      tier,
      publicationStatus: profile.publication_status,
      gaps: uniqueGaps,
      warnings: [...new Set(warnings)],
      coverage: coverageOf(tier, uniqueGaps),
    }
  })

  let linkAudit: LinkAudit = {
    mode: SKIP_LINK_CHECK ? 'skipped' : 'checked',
    checked: 0,
    passed: 0,
    failed: 0,
    failureStatusCounts: {},
  }
  if (!SKIP_LINK_CHECK) {
    const dbReadyIds = new Set(audited.filter((row) => row.gaps.length === 0 && row.tier === 'full').map((row) => row.id))
    const linkItems = celebContents.filter((row) => dbReadyIds.has(row.celeb_id) && !blank(row.source_url))
    const linkStates = await checkUrls(linkItems.map((row) => row.source_url))
    const failedStates = [...linkStates.values()].filter((state) => !state.ok)
    const failureStatusCounts = new Map<string, number>()
    for (const state of failedStates) {
      const key = state.status === 0 ? 'network_or_timeout' : String(state.status)
      failureStatusCounts.set(key, (failureStatusCounts.get(key) ?? 0) + 1)
    }
    linkAudit = {
      mode: 'checked',
      checked: linkStates.size,
      passed: linkStates.size - failedStates.length,
      failed: failedStates.length,
      failureStatusCounts: Object.fromEntries(
        [...failureStatusCounts].sort((a, b) => b[1] - a[1]),
      ),
    }
    for (const item of linkItems) {
      const state = linkStates.get(item.source_url)
      if (!state?.ok) {
        const target = audited.find((row) => row.id === item.celeb_id)
        if (target) {
          target.gaps.push(`content:${item.content_id}.source_http(${state?.status ?? 0})`)
          target.coverage = coverageOf(target.tier, target.gaps)
        }
      }
    }
  }

  const ready = audited.filter((row) => row.gaps.length === 0)
  const lightUnconfirmed = audited.filter(
    (row) => row.tier === 'light' && row.gaps.includes('content:empty_not_confirmed'),
  )
  const contentResearchTargets = lightUnconfirmed.filter((row) =>
    isCelebContentResearchTarget(row.tier, row.publicationStatus),
  )
  const gapCounts = new Map<string, number>()
  for (const row of audited) {
    for (const gap of new Set(row.gaps.map(normalizeGap))) {
      gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1)
    }
  }
  const warningCounts = new Map<string, number>()
  for (const row of audited) {
    for (const warning of new Set(row.warnings.map(normalizeGap))) {
      warningCounts.set(warning, (warningCounts.get(warning) ?? 0) + 1)
    }
  }
  const warned = audited.filter((row) => row.warnings.length > 0)
  const readyWithWarnings = ready.filter((row) => row.warnings.length > 0)

  let activated: Row[] = []
  let cache = null
  if (APPLY && ready.length > 0) {
    const { data, error } = await db
      .from('celebs')
      .update({ publication_status: 'active' })
      .in('id', ready.map((row) => row.id))
      .eq('publication_status', 'inactive')
      .select('id,slug,nickname,publication_status')
    if (error) throw new Error(`활성화 실패: ${error.message}`)
    activated = data ?? []
    if (activated.length !== ready.length) {
      throw new Error(`활성화 수 불일치: 후보 ${ready.length}, 반영 ${activated.length}`)
    }
    cache = await revalidateCaches()
  }

  const scopeByTier = Object.fromEntries(
    ['full', 'light', 'fiction'].map((tier) => [tier, audited.filter((row) => row.tier === tier).length]),
  )
  const statuses = [...new Set(audited.map((row) => row.publicationStatus))].sort()
  const scopeByPublicationStatus = Object.fromEntries(
    statuses.map((status) => [status, audited.filter((row) => row.publicationStatus === status).length]),
  )
  const readinessByTier = Object.fromEntries(
    ['full', 'light', 'fiction'].map((tier) => {
      const rows = audited.filter((row) => row.tier === tier)
      const tierReady = rows.filter((row) => row.gaps.length === 0).length
      return [tier, {
        scope: rows.length,
        ready: tierReady,
        readyPercentage: rows.length > 0 ? Math.round((tierReady / rows.length) * 1000) / 10 : 0,
        coverage: summarizeCoverage(rows),
      }]
    }),
  )
  const readinessByPublicationStatus = Object.fromEntries(
    statuses.map((status) => {
      const rows = audited.filter((row) => row.publicationStatus === status)
      const statusReady = rows.filter((row) => row.gaps.length === 0).length
      return [status, {
        scope: rows.length,
        ready: statusReady,
        readyPercentage: rows.length > 0 ? Math.round((statusReady / rows.length) * 1000) / 10 : 0,
        coverage: summarizeCoverage(rows),
      }]
    }),
  )

  const summary = {
    measuredAt: new Date().toISOString(),
    scope: profiles.length,
    scopeByTier,
    scopeByPublicationStatus,
    ready: ready.length,
    readyPercentage: profiles.length > 0 ? Math.round((ready.length / profiles.length) * 1000) / 10 : 0,
    readyByTier: Object.fromEntries(
      ['full', 'light', 'fiction'].map((tier) => [tier, ready.filter((row) => row.tier === tier).length]),
    ),
    readinessByTier,
    readinessByPublicationStatus,
    coverage: summarizeCoverage(audited),
    contentResearch: {
      rawUnconfirmed: lightUnconfirmed.length,
      targets: contentResearchTargets.length,
      excludedByPublicationStatus: lightUnconfirmed.length - contentResearchTargets.length,
    },
    activated: activated.length,
    cache,
    linkCheck: SKIP_LINK_CHECK ? 'skipped' : 'required',
    linkAudit,
    candidates: ready.map((row) => ({
      slug: row.slug,
      nickname: row.nickname,
      tier: row.tier,
      publicationStatus: row.publicationStatus,
      gaps: row.gaps,
      warnings: row.warnings,
    })),
    gapCounts: Object.fromEntries([...gapCounts].sort((a, b) => b[1] - a[1])),
    qualityWarnings: {
      celebs: warned.length,
      readyCelebs: readyWithWarnings.length,
      counts: Object.fromEntries([...warningCounts].sort((a, b) => b[1] - a[1])),
    },
    rows: audited,
  }

  if (HTML_OUTPUT) {
    await writeCelebReadinessHtml(summary, HTML_OUTPUT)
    console.log(`HTML 보고서 생성: ${HTML_OUTPUT}`)
    return
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  console.log(
    `범위 ${summary.scope}명 · 데이터 완비 ${summary.ready}명 (${summary.readyPercentage}%) · `
    + `영역 평균 보유율 ${summary.coverage.averagePercentage}% · 실제 반영 ${summary.activated}명`,
  )
  console.log(
    `콘텐츠 조사 대상 ${summary.contentResearch.targets}명 · `
    + `전체 상태 light 0건·미확정 ${summary.contentResearch.rawUnconfirmed}명 `
    + `(상태 제외 ${summary.contentResearch.excludedByPublicationStatus}명)`,
  )
  if (summary.linkAudit.mode === 'checked') {
    console.log(
      `출처 링크 ${summary.linkAudit.checked}개 검사 · 통과 ${summary.linkAudit.passed}개 · 실패 ${summary.linkAudit.failed}개`,
    )
  } else {
    console.log('출처 링크 검사 생략 · 구조 보유율 기준')
  }
  console.log('\n티어별')
  for (const tier of ['full', 'light', 'fiction']) {
    const state = summary.readinessByTier[tier]
    console.log(
      `  ${tier.padEnd(7)} ${String(state.scope).padStart(4)}명 · 완비 ${String(state.ready).padStart(4)}명 `
      + `(${String(state.readyPercentage).padStart(5)}%) · 영역 평균 ${state.coverage.averagePercentage}%`,
    )
  }
  console.log('\n공개 상태별')
  for (const status of statuses) {
    const state = summary.readinessByPublicationStatus[status]
    console.log(
      `  ${status.padEnd(10)} ${String(state.scope).padStart(4)}명 · 완비 ${String(state.ready).padStart(4)}명 `
      + `(${String(state.readyPercentage).padStart(5)}%) · 영역 평균 ${state.coverage.averagePercentage}%`,
    )
  }
  console.log('\n영역별 완비')
  for (const domain of COVERAGE_DOMAINS) {
    const state = summary.coverage.domains[domain]
    if (!state) continue
    console.log(
      `  ${domain.padEnd(10)} ${String(state.complete).padStart(4)} / ${String(state.applicable).padEnd(4)} `
      + `(${state.percentage}%)`,
    )
  }
  console.log('\n인물별 영역 보유 구간')
  for (const [band, count] of Object.entries(summary.coverage.bands)) {
    console.log(`  ${band.padEnd(6)} ${String(count).padStart(4)}명`)
  }
  if (STATUS === 'inactive' || SLUGS.size > 0 || args.includes('--list-ready')) {
    console.log('\n완비 인물')
    for (const row of ready.sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))) {
      console.log(`  READY ${row.tier.padEnd(7)} ${row.nickname} (${row.slug})`)
    }
  }
  if (cache) console.log(`캐시 무효화: ${cache.ok ? '성공' : '실패'} (${cache.detail})`)
  console.log('\n주요 탈락 사유')
  for (const [gap, count] of [...gapCounts].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${gap.padEnd(48)} ${count}`)
  }
  console.log(
    `\n품질 경고 — 콘텐츠 메타 결손 (활성화 비차단) · 대상 ${warned.length}명 `
    + `(그중 완비 후보 ${readyWithWarnings.length}명)`,
  )
  for (const [warning, count] of [...warningCounts].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${warning.padEnd(48)} ${count}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
