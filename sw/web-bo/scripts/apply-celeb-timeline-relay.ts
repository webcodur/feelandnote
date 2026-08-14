/**
 * 인물 연표 릴레이 DB 반영 관문.
 * 규칙 SSoT: docs/project/celeb/celeb-timeline.md
 *
 * 에이전트 산출 JSON을 받아 규격 검사를 통과한 인물만 반영한다.
 * 레인이 각자 DB 코드를 짜지 않게 하려고 만든 단일 통로다.
 *
 * 안전장치
 *  - 이미 사건이 있는 인물은 건너뛴다(--replace 없이는 덮지 않는다)
 *  - life/fiction 형식, 좌표 짝, 연도 역전, 사건 종류를 전부 검사한다
 *  - 한 인물의 사건 중 하나라도 규격을 어기면 그 인물 전체를 반려한다
 *  - 원장(ledger.json)에 반영·반려 사유를 남겨 재개 지점을 만든다
 *
 * 실행:
 *   pnpm exec tsx scripts/apply-celeb-timeline-relay.ts --file=<결과.json> [--dry] [--replace]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const LEDGER_PATH = resolve(process.cwd(), '../../data/celeb/timeline-relay/ledger.json')

const KINDS = [
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
] as const

const MIN_EVENTS = 5

type EventInput = {
  year?: number | null
  year_end?: number | null
  sequence_label?: string | null
  sequence_label_en?: string | null
  title?: string
  title_en?: string
  description?: string
  description_en?: string
  kind?: string
  place_name?: string | null
  place_name_en?: string | null
  lat?: number | null
  lng?: number | null
}

type Person = { slug: string; events: EventInput[] }

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** 사건 하나를 규격에 대고 검사한다. 통과하면 빈 배열. */
function checkEvent(e: EventInput, index: number, isFiction: boolean): string[] {
  const at = `${index + 1}번째 사건`
  const bad: string[] = []

  for (const [field, label] of [
    ['title', '한국어 제목'],
    ['title_en', '영문 제목'],
    ['description', '한국어 설명'],
    ['description_en', '영문 설명'],
  ] as const) {
    if (!text(e[field])) bad.push(`${at}: ${label}이 비었다`)
  }
  if (text(e.description).length < 15) bad.push(`${at}: 한국어 설명이 너무 짧다`)
  if (!e.kind || !(KINDS as readonly string[]).includes(e.kind)) {
    bad.push(`${at}: 사건 종류 '${e.kind ?? ''}'는 쓸 수 없다`)
  }

  const hasSeq = !!text(e.sequence_label)
  const hasSeqEn = !!text(e.sequence_label_en)
  if (isFiction) {
    if (e.year != null || e.year_end != null) bad.push(`${at}: fiction에는 연도를 넣지 않는다`)
    if (!hasSeq || !hasSeqEn) bad.push(`${at}: fiction에는 한영 서사 단계가 모두 필요하다`)
  } else {
    if (e.year != null && !Number.isInteger(e.year)) bad.push(`${at}: 연도는 정수여야 한다`)
    if (hasSeq || hasSeqEn) bad.push(`${at}: 실존 인물에는 서사 단계를 넣지 않는다`)
    if (e.year == null && e.year_end != null) bad.push(`${at}: 시점 미상인데 끝 연도가 있다`)
    if (e.year != null && e.year_end != null && e.year_end < e.year) {
      bad.push(`${at}: 끝 연도가 시작 연도보다 앞선다`)
    }
  }

  const hasLat = e.lat != null
  const hasLng = e.lng != null
  if (hasLat !== hasLng) bad.push(`${at}: 위도와 경도는 둘 다 넣거나 둘 다 비운다`)
  if (hasLat && (e.lat! < -90 || e.lat! > 90)) bad.push(`${at}: 위도가 범위를 벗어났다`)
  if (hasLng && (e.lng! < -180 || e.lng! > 180)) bad.push(`${at}: 경도가 범위를 벗어났다`)
  if (hasLat && !text(e.place_name)) bad.push(`${at}: 좌표를 넣었으면 장소명도 넣는다`)
  if (text(e.place_name) && !text(e.place_name_en)) bad.push(`${at}: 장소명은 한영을 함께 넣는다`)

  return bad
}

async function applyPerson(p: Person, dry: boolean, replace: boolean) {
  const slug = text(p.slug)
  if (!slug) return { slug: '(미상)', ok: false, reason: 'slug가 없다' }

  const { data: celeb, error: celebErr } = await supabase
    .from('celebs')
    .select('id, nickname, celeb_tier')
    .eq('slug', slug)
    .maybeSingle()
  if (celebErr) return { slug, ok: false, reason: `인물 조회 실패: ${celebErr.message}` }
  if (!celeb) return { slug, ok: false, reason: '그 slug의 인물이 없다' }

  const events = Array.isArray(p.events) ? p.events : []
  if (events.length < MIN_EVENTS) {
    return { slug, ok: false, reason: `사건이 ${events.length}건뿐이다(최소 ${MIN_EVENTS})` }
  }

  const isFiction = celeb.celeb_tier === 'fiction'
  const bad = events.flatMap((e, i) => checkEvent(e, i, isFiction))
  if (bad.length) return { slug, ok: false, reason: bad.slice(0, 4).join(' / ') }

  const { count, error: countErr } = await supabase
    .from('celeb_timeline_events')
    .select('id', { count: 'exact', head: true })
    .eq('celeb_id', celeb.id)
  if (countErr) return { slug, ok: false, reason: `기존 사건 조회 실패: ${countErr.message}` }
  if ((count ?? 0) > 0 && !replace) {
    return { slug, ok: false, reason: `이미 사건 ${count}건이 있다(덮으려면 --replace)`, skipped: true }
  }

  if (dry) return { slug, ok: true, applied: events.length, dry: true }

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from('celeb_timeline_events').delete().eq('celeb_id', celeb.id)
    if (error) return { slug, ok: false, reason: `기존 사건 삭제 실패: ${error.message}` }
  }

  const rows = events.map((e, i) => ({
    celeb_id: celeb.id,
    year: e.year ?? null,
    year_end: e.year_end ?? null,
    sequence_label: text(e.sequence_label) || null,
    sequence_label_en: text(e.sequence_label_en) || null,
    title: text(e.title),
    title_en: text(e.title_en),
    description: text(e.description),
    description_en: text(e.description_en),
    kind: e.kind!,
    place_name: text(e.place_name) || null,
    place_name_en: text(e.place_name_en) || null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    source: 'research',
    sort_order: i,
  }))

  const { error } = await supabase.from('celeb_timeline_events').insert(rows)
  if (error) return { slug, ok: false, reason: `반영 실패: ${error.message}` }
  return { slug, ok: true, applied: rows.length, nickname: celeb.nickname }
}

/**
 * 원장은 재개 지점을 알려 주는 보조 기록일 뿐이다.
 * 레인 여럿이 동시에 쓰면 읽는 순간 반쯤 쓰인 파일을 만날 수 있는데,
 * 그때 예외를 던지면 **이미 DB에 잘 들어간 작업이 실패로 보고된다.**
 * 그래서 원장 사고는 전부 삼키고 경고만 남긴다. 정본은 언제나 DB다.
 */
function recordLedger(results: Awaited<ReturnType<typeof applyPerson>>[]) {
  try {
    mkdirSync(dirname(LEDGER_PATH), { recursive: true })
    let prev: Record<string, unknown> = {}
    if (existsSync(LEDGER_PATH)) {
      try {
        prev = JSON.parse(readFileSync(LEDGER_PATH, 'utf8')) as Record<string, unknown>
      } catch {
        console.warn('[원장] 기존 파일을 읽지 못해 새로 쓴다. 반영 결과와는 무관하다.')
      }
    }
    for (const r of results) prev[r.slug] = r
    writeFileSync(LEDGER_PATH, JSON.stringify(prev, null, 1), 'utf8')
  } catch (e) {
    console.warn(`[원장] 기록 실패(무시): ${e instanceof Error ? e.message : e}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const fileArg = args.find((a) => a.startsWith('--file='))?.slice(7)
  const dry = args.includes('--dry')
  const replace = args.includes('--replace')
  if (!fileArg) throw new Error('--file=<결과.json>이 필요하다')

  const raw = JSON.parse(readFileSync(resolve(process.cwd(), fileArg), 'utf8'))
  const people: Person[] = Array.isArray(raw) ? raw : [raw]

  const results = []
  for (const p of people) results.push(await applyPerson(p, dry, replace))
  if (!dry) recordLedger(results)

  const ok = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)
  console.log(`반영 ${ok.length}명 / 반려 ${failed.length}명${dry ? ' (모의 실행)' : ''}`)
  for (const r of ok) console.log(`  OK   ${r.slug} — 사건 ${r.applied}건`)
  for (const r of failed) console.log(`  반려 ${r.slug} — ${r.reason}`)
  if (failed.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
