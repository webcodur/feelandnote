/**
 * 셀럽 active 전환 준비도 감사 및 선택적 일괄 활성화.
 *
 * 기본은 읽기 전용이다. --apply를 명시해야 inactive 후보만 active로 바꾼다.
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --json
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --apply
 *   pnpm exec tsx scripts/audit-celeb-activation-readiness.ts --slugs=slug-a,slug-b
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS, domainRevalidationTags } from '@feelandnote/shared/constants/cache-tags'

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

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const JSON_OUTPUT = args.includes('--json')
const SKIP_LINK_CHECK = args.includes('--skip-link-check')
const STATUS = (args.find((arg) => arg.startsWith('--status='))?.split('=', 2)[1] ?? 'inactive') as
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

// Supabase의 테이블별 생성 타입을 이 운영 스크립트에 전부 끌어오지 않고 동적 감사한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type LinkResult = { ok: boolean; status: number; error?: string }
type AuditRow = {
  id: string
  slug: string
  nickname: string
  tier: string
  publicationStatus: string
  gaps: string[]
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
        'id', 'slug', 'nickname', 'nickname_en', 'title', 'title_en', 'bio', 'bio_en',
        'profession', 'nationality', 'birth_date', 'publication_status', 'celeb_tier', 'speech_tone',
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
  for (let index = 0; index < unique.length; index += LINK_CONCURRENCY) {
    const group = unique.slice(index, index + LINK_CONCURRENCY)
    const checked = await Promise.all(group.map(async (sourceUrl) => [sourceUrl, await checkUrl(sourceUrl)] as const))
    for (const [sourceUrl, state] of checked) result.set(sourceUrl, state)
  }
  return result
}

function addProfileGaps(profile: Row, gaps: string[]) {
  const tier = profile.celeb_tier ?? 'full'
  const common = ['nickname', 'nickname_en', 'slug', 'profession', 'title', 'title_en', 'bio', 'bio_en', 'avatar_url']
  for (const field of common) if (blank(profile[field])) gaps.push(`basic:${field}`)
  if (tier !== 'fiction') {
    for (const field of ['nationality', 'birth_date']) {
      if (blank(profile[field])) gaps.push(`basic:${field}`)
    }
  }
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

function addLocaleGaps(contentId: string, content: Row | undefined, locales: Row[], gaps: string[]) {
  for (const locale of ['ko', 'en']) {
    const row = locales.find((item) => item.locale === locale)
    if (!row) {
      gaps.push(`content:${contentId}.${locale}.row`)
      continue
    }
    for (const field of ['title', 'creator', 'thumbnail_url']) {
      if (blank(row[field])) gaps.push(`content:${contentId}.${locale}.${field}`)
    }
    if (content?.type === 'BOOK' && blank(row.isbn)) gaps.push(`content:${contentId}.${locale}.isbn`)
  }
}

async function revalidateCaches() {
  const secret = process.env.CRON_SECRET
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  if (!secret) return { ok: false, detail: 'CRON_SECRET 없음' }
  try {
    const response = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tag: domainRevalidationTags([
          CACHE_TAGS.CELEBS,
          CACHE_TAGS.DIALOGUES,
          CACHE_TAGS.SPECTRUM,
          CACHE_TAGS.TAGS,
        ]),
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
  const [influences, spectra, dialogues, celebContents, fictionSources] = await Promise.all([
    byIds('celeb_influence', '*', ids),
    byIds('celeb_persona', 'celeb_id,spectrum:persona', ids),
    byIds('celeb_dialogues', 'celeb_id,lines,lines_en', ids),
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
  const contentById = new Map(contents.map((row) => [row.id, row]))

  const audited: AuditRow[] = profiles.map((profile) => {
    const tier = profile.celeb_tier ?? 'full'
    const gaps: string[] = []
    const linked = celebContents.filter((row) => row.celeb_id === profile.id)
    const sources = fictionSources.filter((row) => row.celeb_id === profile.id)

    addProfileGaps(profile, gaps)
    if (tier === 'full' || tier === 'light') {
      if (blank(profile.speech_tone)) gaps.push('speech:tone')
      addInfluenceGaps(profile, influenceById.get(profile.id), gaps)
      addSpectrumGaps(spectrumById.get(profile.id), gaps)
      addDialogueGaps(dialogueById.get(profile.id), gaps)
    }

    if (tier === 'full') {
      if (linked.length === 0) gaps.push('content:full_without_content')
      for (const item of linked) {
        if (item.status !== 'FINISHED') gaps.push(`content:${item.content_id}.status`)
        if (blank(item.review)) gaps.push(`content:${item.content_id}.review`)
        if (blank(item.review_en)) gaps.push(`content:${item.content_id}.review_en`)
        if (blank(item.source_url)) gaps.push(`content:${item.content_id}.source_url`)
        addLocaleGaps(
          item.content_id,
          contentById.get(item.content_id),
          locales.filter((row) => row.content_id === item.content_id),
          gaps,
        )
      }
    } else if (tier === 'light') {
      if (linked.length > 0) gaps.push('content:light_has_content')
      if (blank(profile.content_research_confirmed_empty_at)) gaps.push('content:empty_not_confirmed')
    } else if (tier === 'fiction') {
      if (sources.length === 0) gaps.push('fiction:source_missing')
      for (const source of sources) {
        addLocaleGaps(
          source.content_id,
          contentById.get(source.content_id),
          locales.filter((row) => row.content_id === source.content_id),
          gaps,
        )
      }
    } else {
      gaps.push(`tier:unsupported(${tier})`)
    }

    return {
      id: profile.id,
      slug: profile.slug ?? '',
      nickname: profile.nickname ?? '',
      tier,
      publicationStatus: profile.publication_status,
      gaps: [...new Set(gaps)],
    }
  })

  if (!SKIP_LINK_CHECK) {
    const dbReadyIds = new Set(audited.filter((row) => row.gaps.length === 0 && row.tier === 'full').map((row) => row.id))
    const linkItems = celebContents.filter((row) => dbReadyIds.has(row.celeb_id) && !blank(row.source_url))
    const linkStates = await checkUrls(linkItems.map((row) => row.source_url))
    for (const item of linkItems) {
      const state = linkStates.get(item.source_url)
      if (!state?.ok) {
        const target = audited.find((row) => row.id === item.celeb_id)
        target?.gaps.push(`content:${item.content_id}.source_http(${state?.status ?? 0})`)
      }
    }
  }

  const ready = audited.filter((row) => row.gaps.length === 0)
  const gapCounts = new Map<string, number>()
  for (const row of audited) {
    for (const gap of new Set(row.gaps.map((item) => item.replace(/:[^.]+\.[^.]+\./, ':')))) {
      gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1)
    }
  }

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

  const summary = {
    scope: profiles.length,
    ready: ready.length,
    readyByTier: Object.fromEntries(
      ['full', 'light', 'fiction'].map((tier) => [tier, ready.filter((row) => row.tier === tier).length]),
    ),
    activated: activated.length,
    cache,
    linkCheck: SKIP_LINK_CHECK ? 'skipped' : 'required',
    candidates: ready.map((row) => ({
      slug: row.slug,
      nickname: row.nickname,
      tier: row.tier,
      publicationStatus: row.publicationStatus,
      gaps: row.gaps,
    })),
    gapCounts: Object.fromEntries([...gapCounts].sort((a, b) => b[1] - a[1])),
    rows: audited,
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  console.log(`범위 ${summary.scope}명 · 활성화 준비 ${summary.ready}명 · 실제 반영 ${summary.activated}명`)
  console.log(`티어별 준비: full ${summary.readyByTier.full} · light ${summary.readyByTier.light} · fiction ${summary.readyByTier.fiction}`)
  for (const row of ready.sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))) {
    console.log(`  READY ${row.tier.padEnd(7)} ${row.nickname} (${row.slug})`)
  }
  if (cache) console.log(`캐시 무효화: ${cache.ok ? '성공' : '실패'} (${cache.detail})`)
  console.log('\n주요 탈락 사유')
  for (const [gap, count] of [...gapCounts].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${gap.padEnd(48)} ${count}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
