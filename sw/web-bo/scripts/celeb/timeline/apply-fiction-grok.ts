/**
 * 허구 인물 연표 그록 릴레이. 실존은 apply-grok.ts 가 쥔다.
 * 규칙: docs/project/celeb/celeb-timeline.md 「생부터 몰까지」·허구 서사 단계.
 *
 *   pnpm exec tsx scripts/celeb/timeline/apply-fiction-grok.ts run --empty --total 20 --lanes 6 --stage
 *   pnpm exec tsx scripts/celeb/timeline/apply-fiction-grok.ts run --caps --total 20 --lanes 6 --stage
 *   pnpm exec tsx scripts/celeb/timeline/apply-fiction-grok.ts commit
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { REPO_ROOT } from '../../lib/paths'
import { grokJson } from '../../../../../.agents/skills/grok-cli/scripts/grok-call.mjs'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const TIMELINE_DOC = resolve(REPO_ROOT, 'docs/project/celeb/celeb-timeline.md')
const RELAY_DOC = resolve(REPO_ROOT, 'docs/project/celeb/celeb-timeline-grok-relay.md')
const MIN_SKEPTIC_SOURCES = 2
const MAX_SKEPTIC_RETRIES = 4
const MAX_RESEARCH_RETRIES = 2
const MAX_FIX_RETRIES = 1
const MIN_EMPTY_EVENTS = 5

type Event = {
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
}

type Defect = { index: number; field: string; current_value: string; correct_value: string; evidence: string }

const EVENT_PROPS = {
  year: { type: ['integer', 'null'] },
  year_end: { type: ['integer', 'null'] },
  sequence_label: { type: 'string' },
  sequence_label_en: { type: 'string' },
  title: { type: 'string' },
  title_en: { type: 'string' },
  description: { type: 'string' },
  description_en: { type: 'string' },
  kind: {
    type: 'string',
    enum: ['birth', 'death', 'education', 'work', 'publish', 'battle', 'travel', 'office', 'meeting', 'other'],
  },
  place_name: { type: ['string', 'null'] },
  place_name_en: { type: ['string', 'null'] },
  lat: { type: ['number', 'null'] },
  lng: { type: ['number', 'null'] },
}

const RESEARCHER_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: EVENT_PROPS,
        required: ['sequence_label', 'sequence_label_en', 'title', 'title_en', 'description', 'description_en', 'kind'],
      },
    },
    dies_in_source: { type: 'boolean' },
  },
  required: ['events', 'dies_in_source'],
}

const SKEPTIC_SCHEMA = {
  type: 'object',
  properties: {
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          field: { type: 'string' },
          current_value: { type: 'string' },
          correct_value: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['index', 'field', 'current_value', 'correct_value', 'evidence'],
      },
    },
    zero_defects_indices: { type: 'array', items: { type: 'integer' } },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, url: { type: 'string' }, used_for: { type: 'string' } },
        required: ['name', 'used_for'],
      },
    },
  },
  required: ['defects', 'zero_defects_indices', 'sources'],
}

type Celeb = {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  birth_date: string | null
  sources: string
}

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

type PageFilter = {
  column: string
  operator: 'eq' | 'neq'
  value: string
}

async function page<T>(table: string, cols: string, filters: readonly PageFilter[] = []): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(cols)
    for (const filter of filters) {
      query = filter.operator === 'eq'
        ? query.eq(filter.column, filter.value)
        : query.neq(filter.column, filter.value)
    }
    const { data, error } = await query.range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return rows
  }
}

async function runGrok(prompt: string, schema: object) {
  const { raw } = await grokJson(prompt, schema, { effort: 'high', repoRoot: REPO_ROOT })
  return raw as { structuredOutput?: Record<string, unknown> }
}

function stripYears(events: Event[]): Event[] {
  return events.map((e) => ({ ...e, year: null, year_end: null }))
}

function inspect(events: Event[], requireDeath: boolean): string[] {
  const v: string[] = []
  for (const [i, e] of events.entries()) {
    if (!e.title?.trim()) v.push(`${i} 제목 없음`)
    if (!e.description?.trim()) v.push(`${i} 국문 없음`)
    if (!e.description_en?.trim()) v.push(`${i} 영문 없음`)
    if (!e.sequence_label?.trim() || !e.sequence_label_en?.trim()) v.push(`${i} 서사 단계 없음`)
  }
  if (!events.some((e) => e.kind === 'birth')) v.push('기원(birth) 없음')
  if (requireDeath && !events.some((e) => e.kind === 'death')) v.push('원전에 죽음이 있는데 death 없음')
  return v
}

function enforcePlace(events: Event[]) {
  for (const e of events) {
    if (e.lat == null || e.lng == null) {
      e.lat = null
      e.lng = null
      continue
    }
    if (!e.place_name?.trim() && !e.place_name_en?.trim()) {
      e.lat = null
      e.lng = null
    }
  }
}

function researcherPrompt(celeb: Celeb, mode: 'empty' | 'caps', existing: string): string {
  const emptyAsk = [
    `대표 원전 속 사건을 원전 순서대로 5~10개 만들어라.`,
    `year·year_end 는 반드시 null 이다. 신화·서사 사건을 역사 연도로 환산하지 마라.`,
    `각 사건에 sequence_label / sequence_label_en 을 붙여라. 예: 「탄생」「출정」「최후」.`,
    `첫 사건은 반드시 kind=birth (탄생·기원).`,
    `원전에 이 인물의 죽음이 있으면 마지막은 kind=death 이고 dies_in_source=true.`,
    `죽지 않는 신·개념이면 죽음을 만들지 말고 dies_in_source=false.`,
    `좌표는 실재 도시의 Wikidata P625 만. 아스가르드·올림포스·카멜롯은 장소명만.`,
  ]
  const capAsk = [
    `이미 있는 중간 사건은 다시 쓰지 마라. 빠진 양끝만 만들어라.`,
    existing,
    `birth 가 없으면 원전의 시작(탄생·기원) 한 건을 첫 사건으로 써라.`,
    `원전에 죽음이 있는데 death 가 없으면 최후 한 건을 마지막에 써라. dies_in_source=true.`,
    `죽지 않는 존재면 death 를 만들지 말고 dies_in_source=false.`,
    `year·year_end 는 null. sequence_label 필수. 역사 연도 환산 금지.`,
  ]
  return [
    `너는 허구 인물 연표 조사자다. 시작 전에 읽고 따른다.`,
    `- ${TIMELINE_DOC}`,
    `- ${RELAY_DOC}`,
    ``,
    `대상: ${celeb.nickname} (${celeb.slug}, id=${celeb.id})`,
    `영문 이름: ${celeb.nickname_en ?? '없음'}`,
    `창작 배경 연도(머리글용, 사건 year 로 쓰지 말 것): ${celeb.birth_date ?? '없음'}`,
    `대표 원전: ${celeb.sources || '미연결. 가장 알려진 원전을 검색으로 확정하라.'}`,
    ``,
    ...(mode === 'empty' ? emptyAsk : capAsk),
    ``,
    `서술 쓰기의 견본 수준으로 쓴다. 출력은 스키마 JSON 만.`,
  ].join('\n')
}

function skepticPrompt(celeb: Celeb, events: Event[]): string {
  const list = events
    .map((e, i) => `${i}. kind=${e.kind} seq=${e.sequence_label} title="${e.title}" place=${e.place_name ?? 'null'} ${e.description}`)
    .join('\n')
  return [
    `이 행들은 틀렸다. DB에 쓰지 마라. 너는 새 세션의 의심자다.`,
    `읽고 따른다: ${RELAY_DOC}`,
    `허구이므로 역사 연도 환산·실존 생몰 대조는 결함이다. 원전 속 사건인지만 검증하라.`,
    `대상: ${celeb.nickname} (${celeb.slug}) 원전: ${celeb.sources}`,
    list,
    `무죄가 안 되면 결함. 웹을 검색하고 sources 에 2곳 이상. 순수 JSON.`,
  ].join('\n')
}

function fixerPrompt(celeb: Celeb, events: Event[], defects: Defect[]): string {
  return [
    `너는 이 허구 인물 연표를 쓴 조사자다. 결함을 반영해 다시 써라.`,
    `읽고 따른다: ${TIMELINE_DOC} 「서술 쓰기」`,
    `대상: ${celeb.nickname} (${celeb.slug})`,
    JSON.stringify(events, null, 1),
    `결함:`,
    defects.map((d) => `- ${d.index} ${d.field} ${d.current_value} → ${d.correct_value} (${d.evidence})`).join('\n'),
    `사건을 함부로 지우지 마라. year 는 null. 순수 JSON.`,
  ].join('\n')
}

async function runSkeptic(celeb: Celeb, events: Event[], say: (m: string) => void) {
  const prompt = skepticPrompt(celeb, events)
  for (let attempt = 1; attempt <= 1 + MAX_SKEPTIC_RETRIES; attempt++) {
    try {
      const res = await runGrok(prompt, SKEPTIC_SCHEMA)
      const sources = (res.structuredOutput?.sources ?? []) as { name: string }[]
      if (sources.length >= MIN_SKEPTIC_SOURCES) {
        return { defects: (res.structuredOutput?.defects ?? []) as Defect[], sources: sources.length, attempt }
      }
      say(`  의심자 ${attempt}회차 출처 ${sources.length}곳 — 재시도`)
    } catch (e) {
      say(`  의심자 ${attempt}회차 실패(${(e as Error).message.slice(0, 80)}) — 재시도`)
    }
  }
  return null
}

async function loadSources(): Promise<Map<string, string>> {
  const links = await page<{ celeb_id: string; content_id: string; relation_type: string }>(
    'fiction_source_characters',
    'celeb_id,content_id,relation_type',
  )
  const ids = [...new Set(links.map((l) => l.content_id))]
  const titles = new Map<string, string>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from('content_locales')
      .select('content_id,title,locale')
      .in('content_id', ids.slice(i, i + 200))
      .in('locale', ['ko', 'en'])
    for (const row of data ?? []) {
      if (row.locale === 'ko' || !titles.has(row.content_id)) titles.set(row.content_id, row.title)
    }
  }
  const map = new Map<string, string[]>()
  for (const l of links) {
    const list = map.get(l.celeb_id) ?? []
    list.push(`${titles.get(l.content_id) ?? l.content_id}(${l.relation_type})`)
    map.set(l.celeb_id, list)
  }
  return new Map([...map].map(([k, v]) => [k, v.join(', ')]))
}

async function loadTargets(mode: 'empty' | 'caps'): Promise<Celeb[]> {
  const celebs = await page<{
    id: string; slug: string; nickname: string; nickname_en: string | null; birth_date: string | null
  }>('celebs', 'id,slug,nickname,nickname_en,birth_date', [
    { column: 'publication_status', operator: 'eq', value: 'active' },
    { column: 'celeb_tier', operator: 'eq', value: 'fiction' },
  ])
  const events = await page<{ celeb_id: string; kind: string }>('celeb_timeline_events', 'id,celeb_id,kind')
  const kinds = new Map<string, Set<string>>()
  for (const e of events) {
    const set = kinds.get(e.celeb_id) ?? new Set()
    set.add(e.kind)
    kinds.set(e.celeb_id, set)
  }
  const sources = await loadSources()
  return celebs.filter((c) => {
    const k = kinds.get(c.id)
    if (mode === 'empty') return !k
    if (!k) return false
    return !k.has('birth')
  }).map((c) => ({ ...c, sources: sources.get(c.id) ?? '' }))
}

async function processOne(celeb: Celeb, mode: 'empty' | 'caps', stageDir: string, say: (m: string) => void) {
  const { count } = await db.from('celeb_timeline_events').select('id', { count: 'exact', head: true }).eq('celeb_id', celeb.id)
  if (mode === 'empty' && (count ?? 0) > 0) {
    say(`SKIPPED ${celeb.slug} — 이미 ${count}건`)
    return 'skipped' as const
  }

  let existingNote = ''
  if (mode === 'caps') {
    const { data } = await db
      .from('celeb_timeline_events')
      .select('kind,title,sort_order')
      .eq('celeb_id', celeb.id)
      .order('sort_order')
    const ev = data ?? []
    existingNote = `기존 ${ev.length}건: ` + ev.map((e) => `${e.kind}:${e.title}`).join(' / ')
    if (ev.some((e) => e.kind === 'birth')) {
      say(`SKIPPED ${celeb.slug} — 이미 birth 있음`)
      return 'skipped' as const
    }
  }

  say(`조사 시작: ${celeb.slug} (${celeb.nickname})`)
  let events: Event[] = []
  let dies = false
  const min = mode === 'empty' ? MIN_EMPTY_EVENTS : 1
  for (let attempt = 1; attempt <= 1 + MAX_RESEARCH_RETRIES; attempt++) {
    try {
      const res = await runGrok(researcherPrompt(celeb, mode, existingNote), RESEARCHER_SCHEMA)
      events = stripYears((res.structuredOutput?.events ?? []) as Event[])
      dies = !!res.structuredOutput?.dies_in_source
    } catch (e) {
      say(`  조사 ${attempt}회차 실패(${(e as Error).message.slice(0, 80)}) — 재시도`)
      continue
    }
    if (events.length >= min) break
    say(`  조사 ${attempt}회차 ${events.length}건 — 재시도`)
  }
  if (events.length < min) {
    say(`FAILED ${celeb.slug} — 사건 ${events.length}건`)
    return 'failed' as const
  }

  const skeptic = await runSkeptic(celeb, events, say)
  if (!skeptic) {
    say(`FAILED ${celeb.slug} — 의심자 출처 부족`)
    return 'failed' as const
  }
  if (skeptic.defects.length > 0) {
    const allowedLoss = Math.max(1, skeptic.defects.length)
    let accepted = false
    for (let attempt = 1; attempt <= 1 + MAX_FIX_RETRIES; attempt++) {
      try {
        const fixed = await runGrok(fixerPrompt(celeb, events, skeptic.defects), RESEARCHER_SCHEMA)
        const candidate = stripYears((fixed.structuredOutput?.events ?? []) as Event[])
        if (candidate.length > 0 && events.length - candidate.length <= allowedLoss) {
          events = candidate
          if (fixed.structuredOutput?.dies_in_source != null) dies = !!fixed.structuredOutput.dies_in_source
          accepted = true
          break
        }
      } catch (e) {
        say(`  수정 ${attempt}회차 실패 — ${(e as Error).message.slice(0, 60)}`)
      }
    }
    if (!accepted) {
      say(`FAILED ${celeb.slug} — 수정 실패`)
      return 'failed' as const
    }
  }

  enforcePlace(events)
  const broken = inspect(events, dies && mode === 'empty')
  if (broken.length) {
    say(`FAILED ${celeb.slug} — ${broken.join('; ')}`)
    return 'failed' as const
  }

  mkdirSync(stageDir, { recursive: true })
  writeFileSync(
    resolve(stageDir, `${celeb.slug}.json`),
    JSON.stringify({ slug: celeb.slug, celeb_id: celeb.id, mode, dies_in_source: dies, events }, null, 1),
    'utf8',
  )
  say(`STAGED ${celeb.slug} — ${events.length}건, 죽음=${dies}`)
  return 'ok' as const
}

async function commitStaged() {
  const dir = argOf('dir') ?? '.tmp-celeb-timeline-grok/fiction-staged'
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  const doneDir = resolve(dir, '..', 'fiction-applied')
  mkdirSync(doneDir, { recursive: true })
  let ok = 0, failed = 0, skipped = 0
  for (const f of files) {
    const full = resolve(dir, f)
    const { slug, celeb_id, mode, events } = JSON.parse(readFileSync(full, 'utf8')) as {
      slug: string; celeb_id: string; mode: 'empty' | 'caps'; events: Event[]
    }
    const { data: existing } = await db
      .from('celeb_timeline_events')
      .select('id,kind,sort_order')
      .eq('celeb_id', celeb_id)
      .order('sort_order')
    if (mode !== 'caps' && (existing?.length ?? 0) > 0) {
      console.log(`SKIPPED ${slug}`)
      skipped++
      renameSync(full, resolve(doneDir, f))
      continue
    }
    const rows = events.map((e, i) => {
      const min = existing?.[0]?.sort_order ?? 0
      const max = existing?.[existing.length - 1]?.sort_order ?? 0
      const sort_order = mode === 'caps' && e.kind === 'birth'
        ? min - 1 - i
        : mode === 'caps'
          ? max + 1 + i
          : (i + 1) * 10
      return { celeb_id, ...e, year: null, year_end: null, source: 'research', sort_order }
    })
    const { data: inserted, error } = await db.from('celeb_timeline_events').insert(rows).select('id,title')
    if (error || !inserted) {
      console.log(`FAILED ${slug} — ${error?.message}`)
      failed++
      continue
    }
    try { renameSync(full, resolve(doneDir, f)) } catch { rmSync(full, { force: true }) }
    console.log(`OK   ${slug} — ${inserted.length}건`)
    ok++
  }
  console.log(JSON.stringify({ ok, skipped, failed }))
  if (failed) process.exit(1)
}

async function main() {
  if (process.argv[2] === 'commit') {
    await commitStaged()
    return
  }
  if (process.argv[2] !== 'run') {
    console.error('사용법: run --empty|--caps [--total N] [--lanes N] --stage')
    process.exit(1)
  }
  const mode = process.argv.includes('--caps') ? 'caps' : 'empty'
  const stageDir = resolve(argOf('dir') ?? '.tmp-celeb-timeline-grok/fiction-staged')
  const targets = await loadTargets(mode)
  const totalArg = argOf('total')
  const total = totalArg ? Math.min(Number.parseInt(totalArg, 10), targets.length) : targets.length
  const lanes = Math.max(1, Number.parseInt(argOf('lanes') ?? '6', 10))
  console.log(`허구 ${mode} 후보 ${targets.length}명 중 ${total}명, 레인 ${lanes}`)
  const queue = targets.slice(0, total)
  let ok = 0, skipped = 0, failed = 0, started = 0, done = 0
  const lane = async (n: number) => {
    for (;;) {
      const celeb = queue.shift()
      if (!celeb) return
      const seq = ++started
      const lines: string[] = []
      const r = await processOne(celeb, mode, stageDir, (m) => lines.push(m))
      done++
      console.log([`--- 레인${n} [${seq}/${total}] ${celeb.slug} (완료 ${done})`, ...lines].join('\n'))
      if (r === 'ok') ok++
      else if (r === 'skipped') skipped++
      else failed++
    }
  }
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, (_, i) => lane(i + 1)))
  console.log(`\n## 결과`)
  console.log(JSON.stringify({ ok, skipped, failed }))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
