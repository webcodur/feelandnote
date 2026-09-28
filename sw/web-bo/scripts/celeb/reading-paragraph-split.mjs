/**
 * 인물 안내(읽어보기) 본문 문단 나누기 배치.
 * 화면이 ≥360자 단일 문단을 기계적으로 2분할해 보여주던 위치를 원문에 그대로 반영한다.
 *
 * 실행 예:
 *   node --env-file=.env --import tsx scripts/celeb/reading-paragraph-split.mjs --propose
 *   node --env-file=.env --import tsx scripts/celeb/reading-paragraph-split.mjs --apply --proposals <file>
 *   node --env-file=.env --import tsx scripts/celeb/reading-paragraph-split.mjs --status
 *
 * --propose: 후보 전수를 읽어 문장 경계를 계산, proposals JSONL을 data/celeb/reading-paragraph-split/에 쓴다.
 * --dump:    후보 전수를 문장 번호가 달린 정독용 배치 파일(reading/*.txt)과
 *            candidates.json 인덱스로 내보낸다. 사람이 전문을 읽고 결정하는 단계용.
 * --apply:   decisions.jsonl(정독 결정 누적본)을 DB에 적용한다. 읽은 값 대조 가드 +
 *            진행 중인 reading-voice manifest의 text/sourceHash 동기 갱신을 함께 한다.
 *            splits:[] 결정은 '분할 안 함'으로 applied에만 기록한다.
 * --status:  제안·적용 진행 상황만 출력한다.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { readingSentences } from './reading-voice-timing.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WORK = resolve(HERE, '../../../../data/celeb/reading-paragraph-split')
const PROPOSALS = join(WORK, 'proposals.jsonl')
const APPLIED = join(WORK, 'applied.jsonl')
const CANDIDATES = join(WORK, 'candidates.json')
const DECISIONS = join(WORK, 'decisions.jsonl')
const DUMP_DIR = join(WORK, 'reading')
const DUMP_BATCH = 45
const READING_RUN = 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908'
const READING_MANIFEST = join(READING_RUN, 'manifest.json')
const MIN_CHARS = 360
const sha = (v) => createHash('sha256').update(v).digest('hex')
const required = (name) => { if (!process.env[name]) throw new Error(`Missing ${name}`); return process.env[name] }

function parseArgs(argv) {
  const flags = new Set(['--propose', '--apply', '--status', '--dry-run', '--dump'])
  const values = new Set(['--proposals', '--locale', '--limit'])
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (flags.has(k)) out[k.slice(2)] = true
    else if (values.has(k) && argv[i + 1] && !argv[i + 1].startsWith('--')) out[k.slice(2)] = argv[++i]
    else throw new Error(`Unknown argument: ${k}`)
  }
  if (out.limit) out.limit = Number(out.limit)
  return out
}

/* 문장 분해는 발행 타이밍과 같은 readingSentences(Intl.Segmenter + en 경칭 병합)를 쓴다.
   단, 「H.O.T.의」「01.AI를」「《WHO!》로」처럼 축약 마침표·부호 안 문장부호가 만드는
   가짜 경계는 병합한다 — 진짜 문장 경계는 항상 공백을 동반하므로 공백 없는 경계는 토큰 내부다.
   원문 재조합 없이 경계에 '\n\n'만 삽입한다. */
const EN_ABBREV = /\b(Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|Sen|Rep|Gov|Gen|Col|Capt|Lt|Sgt|Rev|Hon|Pres|Mt|Ft|vs|No|Nos|Vol|Fig|Eq|Secs?|Est|approx|Dept|Assn|Bros|Co|Inc|Ltd|Corp|Dist|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|[A-Z])$/
const OPEN_BRACKETS = /[「『《〈“‘"(\[]/g
const CLOSE_BRACKETS = /[」』》〉”’")\]]/g

function rawSentenceSpans(text, locale) {
  return readingSentences(text, locale).map((s) => ({ start: s.textStart, end: s.textEnd }))
}

function bracketDepth(text) {
  const open = (text.match(OPEN_BRACKETS) || []).length
  const close = (text.match(CLOSE_BRACKETS) || []).length
  return open - close
}

/** 가짜 경계를 병합한 문장 범위를 돌려준다. 경계 판별 불가한 축약어 경계는 flags에 남긴다. */
function sentenceSpans(text, locale) {
  const raw = rawSentenceSpans(text, locale)
  if (raw.length < 2) return { spans: raw, flags: [] }
  const flags = []
  const merged = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const prev = merged.at(-1)
    const span = raw[i]
    const gap = text.slice(prev.end, span.start)
    const leftText = text.slice(prev.start, prev.end)
    const rightText = text.slice(span.start, span.end)
    // 1) 공백 없는 경계 — 토큰 내부(H.O.T.의·01.AI·WHO!》로)라 항상 병합
    if (!/\s/.test(gap)) { prev.end = span.end; continue }
    // 2) 미닫힌 괄호·인용 안의 경계 — 제목 안이라 병합
    if (bracketDepth(text.slice(0, span.start)) > 0) { prev.end = span.end; continue }
    // 3) 왼쪽이 경칭·축약어로 끝나는 경계 — 병합
    if (locale === 'en' && EN_ABBREV.test(leftText.replace(/["'”’」』〉》)\]]+$/, ''))) { prev.end = span.end; continue }
    // 4) 왼쪽 꼬리가 점 들어간 이니셜리즘(U.S·D.C) — 실문장 끝과 구분이 어려워 플래그
    if (/\b(?:[A-Z]\.)+[A-Z]?$/.test(leftText)) flags.push('abbrev-boundary')
    merged.push({ ...span })
  }
  return { spans: merged, flags }
}

/** splitReadableParagraphs와 동일한 규칙: 4문장 이상이면 길이 중간에 가장 가까운 문장 경계로 2분할 */
function chooseSplit(text, locale) {
  const { spans, flags } = sentenceSpans(text, locale)
  if (spans.length < 4) return null
  const total = spans.reduce((s, x) => s + (x.end - x.start), 0)
  let left = 0, splitAt = 2, best = Infinity
  for (let i = 0; i < spans.length - 2; i++) {
    left += spans[i].end - spans[i].start
    if (i < 1) continue
    const d = Math.abs(total / 2 - left)
    if (d < best) { best = d; splitAt = i + 1 }
  }
  if (splitAt < 2 || spans.length - splitAt < 2) return null
  return { spans, splitAt, flags }
}

/* 같은 주제 연속 신호(대명사 연속)가 아닌 경계를 중간 창 안에서 우선한다. */
const CONTINUATION = /^(그는|그녀는|그가|그녀가|이는|또한|그리고|하지만|그러나|He |She |It |They |His |Her |Their |But |And |Also |However |Later |Then )/u
function pickBoundary(text, locale) {
  const picked = chooseSplit(text, locale)
  if (!picked) return null
  const { spans, splitAt, flags = [] } = picked
  const n = spans.length
  const lo = Math.max(2, Math.floor(n * 0.35)), hi = Math.min(n - 2, Math.ceil(n * 0.65))
  for (let i = lo; i <= hi; i++) {
    const next = text.slice(spans[i].start, spans[i].end)
    if (!CONTINUATION.test(next)) return { spans, splitAt: i, reason: 'cue', flags }
  }
  return { spans, splitAt, reason: 'midpoint', flags }
}

function insertBreak(text, spans, splitAt) {
  const leftEnd = spans[splitAt - 1].end
  const rightStart = spans[splitAt].start
  return text.slice(0, leftEnd) + '\n\n' + text.slice(rightStart)
}

/* 결정 splits([i,j] = i번·j번 문장 뒤에 분할)을 여러 번 삽입한다. */
function insertBreaks(text, spans, splits) {
  let revised = text
  for (const splitAt of [...splits].sort((a, b) => b - a)) {
    revised = insertBreak(revised, spans, splitAt)
  }
  return revised
}

/** --propose와 --dump가 공유하는 후보 추출. spans까지 계산해 반환한다. */
function candidateFor(row, locale, stats) {
  const field = locale === 'ko' ? 'plain_text' : 'plain_text_en'
  const text = String(row[field] || '').trim()
  if (!text) return null
  if (/\n\s*\n/.test(text)) { if (stats) stats.skipExisting++; return null }
  if (text.length < MIN_CHARS) { if (stats) stats.skipShort++; return null }
  const { spans, flags } = sentenceSpans(text, locale)
  if (spans.length < 4) { if (stats) stats.skipFewSentences++; return null }
  if (stats) stats.candidates++
  return { field, text, spans, flags }
}

async function allRows(db) {
  const rows = []
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db.from('celeb_explanations')
      .select('profile_id, plain_text, plain_text_en, updated_at')
      .range(off, off + 999)
    if (error) throw new Error(`celeb_explanations query failed: ${error.message}`)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
  }
  const slugs = new Map()
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db.from('celebs').select('id, slug').range(off, off + 999)
    if (error) throw new Error(`celebs query failed: ${error.message}`)
    if (!data?.length) break
    for (const c of data) slugs.set(c.id, c.slug)
    if (data.length < 1000) break
  }
  return rows.map((r) => ({ ...r, slug: slugs.get(r.profile_id) || r.profile_id }))
}

async function propose(db, options) {
  mkdirSync(WORK, { recursive: true })
  const rows = await allRows(db)
  const locales = options.locale ? [options.locale] : ['ko', 'en']
  const out = []
  const stats = { rows: rows.length, skipExisting: 0, skipShort: 0, skipFewSentences: 0, candidates: 0 }
  for (const row of rows.slice(0, options.limit || rows.length)) {
    for (const locale of locales) {
      const cand = candidateFor(row, locale, stats)
      if (!cand) continue
      const { field, text, spans, flags } = cand
      const picked = pickBoundary(text, locale)
      if (!picked) continue
      out.push({
        profileId: row.profile_id,
        slug: row.slug,
        locale,
        field,
        sourceHash: sha(text),
        characters: text.length,
        sentences: spans.length,
        splitAfter: picked.splitAt,
        reason: picked.reason,
        flags,
        before: text.slice(spans[picked.splitAt - 1].start, spans[picked.splitAt - 1].end),
        after: text.slice(spans[picked.splitAt].start, spans[picked.splitAt].end),
        revised: insertBreak(text, spans, picked.splitAt),
      })
    }
  }
  writeFileSync(PROPOSALS, out.map((p) => JSON.stringify(p)).join('\n') + '\n')
  console.log(JSON.stringify({ wrote: PROPOSALS, ...stats }, null, 1))
}

/* 정독용 덤프: 문장 번호가 달린 배치 파일 + candidates.json(오프셋·해시 인덱스). */
async function dump(db, options) {
  mkdirSync(DUMP_DIR, { recursive: true })
  const rows = await allRows(db)
  const locales = options.locale ? [options.locale] : ['ko', 'en']
  const stats = { rows: rows.length, skipExisting: 0, skipShort: 0, skipFewSentences: 0, candidates: 0 }
  const index = []
  const batches = new Map()
  for (const row of rows) {
    for (const locale of locales) {
      const cand = candidateFor(row, locale, stats)
      if (!cand) continue
      const { field, text, spans, flags } = cand
      index.push({
        profileId: row.profile_id, slug: row.slug, locale, field,
        sourceHash: sha(text), characters: text.length,
        sentences: spans.length, spans, flags,
      })
      const lines = [`=== ${locale} | ${row.slug} | ${spans.length} sent | ${text.length} ch${flags.length ? ' | ' + flags.join(',') : ''}`]
      spans.forEach((s, i) => lines.push(`[${i + 1}] ${text.slice(s.start, s.end)}`))
      if (!batches.has(locale)) batches.set(locale, [])
      batches.get(locale).push(lines.join('\n'))
    }
  }
  writeFileSync(CANDIDATES, JSON.stringify(index))
  const files = []
  for (const [locale, blocks] of batches) {
    for (let b = 0; b < blocks.length; b += DUMP_BATCH) {
      const file = join(DUMP_DIR, `${locale}-${String(Math.floor(b / DUMP_BATCH) + 1).padStart(2, '0')}.txt`)
      writeFileSync(file, blocks.slice(b, b + DUMP_BATCH).join('\n\n') + '\n')
      files.push(file)
    }
  }
  console.log(JSON.stringify({ ...stats, candidates: index.length, files: files.length, index: CANDIDATES }, null, 1))
}

function syncReadingManifest(changed) {
  // 진행 중인 읽어보기 배치가 entry.sourceHash로 원본 변경을 감지해 중단되지 않게 동기 갱신한다.
  // 공백만 바뀌었으므로 QC 비교(공백 무시)와 음원 유효성은 유지된다.
  if (!existsSync(READING_MANIFEST) || !changed.length) return { synced: 0, skipped: true }
  const manifest = JSON.parse(readFileSync(READING_MANIFEST, 'utf8'))
  let synced = 0
  for (const change of changed) {
    const key = `${change.profileId}/${change.locale}`
    const entry = manifest.entries?.[key]
    if (!entry) continue
    entry.text = change.revised
    entry.sourceHash = change.newHash
    synced++
  }
  writeFileSync(READING_MANIFEST, JSON.stringify(manifest))
  return { synced, skipped: false }
}

async function apply(db, options) {
  // 정독 결정 파일: {slug, locale, splits:[i,...]} — splits:[]이면 '분할 안 함'
  const decisions = readFileSync(options.proposals || DECISIONS, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  const candidates = new Map(JSON.parse(readFileSync(CANDIDATES, 'utf8')).map((c) => [`${c.slug}/${c.locale}`, c]))
  const appliedKeys = new Set()
  if (existsSync(APPLIED)) for (const line of readFileSync(APPLIED, 'utf8').trim().split('\n').filter(Boolean)) appliedKeys.add(JSON.parse(line).key)
  const results = { total: decisions.length, already: 0, applied: 0, noSplit: 0, stale: 0, missing: 0, errors: 0 }
  const changed = []
  for (const d of decisions) {
    const cand = candidates.get(`${d.slug}/${d.locale}`)
    if (!cand) { results.missing++; console.error('NO_CANDIDATE', d.slug, d.locale); continue }
    const key = `${cand.profileId}/${d.locale}`
    if (appliedKeys.has(key)) { results.already++; continue }
    const raw = [...new Set(d.splits || [])]
    const splits = raw.filter((i) => i >= 1 && i <= cand.spans.length - 1).sort((a, b) => a - b)
    // 범위 밖 결정은 noSplit으로 위장하지 않고 에러로 보고한다 — splits:[]만 '분할 안 함'이다
    if (raw.length && splits.length !== raw.length) {
      results.errors++; console.error('BAD_SPLITS', d.slug, d.locale, JSON.stringify(raw), 'sentences:', cand.spans.length); continue
    }
    if (!splits.length) {
      appendFileSync(APPLIED, JSON.stringify({ key, at: new Date().toISOString(), slug: d.slug, locale: d.locale, splits: [] }) + '\n')
      results.noSplit++; results.applied++; continue
    }
    if (splits.includes(1) || splits.includes(cand.spans.length - 1)) results.singleSentenceParas = (results.singleSentenceParas || 0) + 1
    // 읽은 값 대조 가드 — 결정 이후 본문이 바뀐 행은 건너뛴다
    const { data, error } = await db.from('celeb_explanations').select(cand.field).eq('profile_id', cand.profileId).single()
    if (error) { results.errors++; console.error('read failed', key, error.message); continue }
    const current = String(data?.[cand.field] || '').trim()
    if (sha(current) !== cand.sourceHash) { results.stale++; console.error('STALE_SOURCE', key); continue }
    const revised = insertBreaks(current, cand.spans, splits)
    if (options['dry-run']) { results.applied++; continue }
    const { error: upErr } = await db.from('celeb_explanations')
      .update({ [cand.field]: revised, updated_at: new Date().toISOString() })
      .eq('profile_id', cand.profileId).eq(cand.field, current)
    if (upErr) { results.errors++; console.error('update failed', key, upErr.message); continue }
    changed.push({ profileId: cand.profileId, locale: d.locale, revised, newHash: sha(revised) })
    appendFileSync(APPLIED, JSON.stringify({ key, at: new Date().toISOString(), slug: d.slug, locale: d.locale, splits }) + '\n')
    results.applied++
  }
  const sync = options['dry-run'] ? { synced: 0, skipped: true } : syncReadingManifest(changed)
  console.log(JSON.stringify({ ...results, manifestSync: sync }, null, 1))
}

async function status() {
  const proposals = existsSync(PROPOSALS) ? readFileSync(PROPOSALS, 'utf8').trim().split('\n').filter(Boolean).length : 0
  const applied = existsSync(APPLIED) ? readFileSync(APPLIED, 'utf8').trim().split('\n').filter(Boolean).length : 0
  const decided = existsSync(DECISIONS) ? readFileSync(DECISIONS, 'utf8').trim().split('\n').filter(Boolean).length : 0
  const candidates = existsSync(CANDIDATES) ? JSON.parse(readFileSync(CANDIDATES, 'utf8')).length : 0
  console.log(JSON.stringify({ proposals, candidates, decided, applied }, null, 1))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.status) return status()
  const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false } })
  if (options.propose) return propose(db, options)
  if (options.dump) return dump(db, options)
  if (options.apply) return apply(db, options)
  console.log('usage: --propose | --dump | --apply [--proposals file] [--dry-run] | --status')
}
await main()
