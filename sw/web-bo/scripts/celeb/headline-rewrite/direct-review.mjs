/**
 * 본 에이전트 직접 심사 경로 — 무기명 목록 발행·판정 회수·레인 record.
 *
 *   node scripts/celeb/headline-rewrite/direct-review.mjs emit              # blind 목록 발행
 *   node scripts/celeb/headline-rewrite/direct-review.mjs collect           # judge 판정 → review relay
 *   node scripts/celeb/headline-rewrite/direct-review.mjs record            # 레인 record + cli record
 *
 * emit은 gen relay가 있고 review relay가 없는 대상에 대해 후보(신규+현재값+직전 개편안)를
 * slug 해시로 섞어 .tmp/blind/<slug>.json(번호 목록만)과 .tmp/blind-key/<slug>.json(출처 대응)을 쓴다.
 * 심사자는 blind만 보고 .tmp/judge/ 아래에 {"<slug>":{"ko":{...},"en":{...}}} 판정을 남긴다.
 * collect는 판정을 최종화해 codex-batch와 같은 스키마의 review relay를 쓴다.
 * 외부 CLI를 호출하지 않는다.
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { HEADLINE_BAN } from './rules.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../../..')
const ROOT = path.join(REPO, 'data/celeb/headline-rewrite')
const TMP = path.join(ROOT, '.tmp')
const REVIEW_VERSION = 2
const LANE_COUNT = 20
const BAN = HEADLINE_BAN

const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined }
const L = (s) => [...s].length
const pad = (n) => String(n).padStart(2, '0')
const laneOf = (id) => createHash('md5').update(id).digest().readUInt32BE(0) % LANE_COUNT
const seedOf = (s) => createHash('md5').update(s).digest().readUInt32BE(0)
function shuffle(a, seed) {
  let s = seed % 233280
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const isTitleLike = (h) => /^[^ ]+(의|에서) [^ ]+( [^ ]+)?$/.test(h)
  && !/[은는이가을를로]\s/.test(h)
  && !/(한|된|낸|온|간|친|린|운|쓴|준|연|진|본|든|킨|은|는)\s/.test(h)

function reasonsOf(h) {
  if (!h) return ['empty']
  const r = []
  if (L(h) > 30) r.push('over30')
  if (L(h) < 12) r.push('under12')
  if (BAN.test(h)) r.push('banned')
  if (isTitleLike(h)) r.push('titleLike')
  return r
}

function db() {
  config({ path: path.join(REPO, 'sw/web-bo/.env'), quiet: true })
  return createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } })
}

async function fetchTargets() {
  const file = argOf('targets')
  const client = db()
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('celebs')
      .select('id, slug, nickname, headline, headline_en, title, bio')
      .neq('publication_status', 'deleted').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  let picked
  if (file) {
    const want = new Set(JSON.parse(readFileSync(file, 'utf8')).map((x) => x.slug ?? x))
    picked = rows.filter((r) => want.has(r.slug)).map((r) => ({ ...r, reasons: ['manual'] }))
  } else {
    picked = rows.map((r) => ({ ...r, reasons: reasonsOf(r.headline) })).filter((r) => r.reasons.length)
  }
  return picked.map((r) => ({ ...r, lane: laneOf(r.id) })).sort((a, b) => a.slug.localeCompare(b.slug))
}

/** HEAD 원장(직전 개편안). 현재값과 같으면 후보에 넣지 않는다. */
function headLedger() {
  const map = new Map()
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    try {
      const raw = execSync(`git show HEAD:data/celeb/headline-rewrite/ledger/lane-${pad(lane)}.json`,
        { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      for (const e of JSON.parse(raw)) map.set(e.id, e)
    } catch { /* 원장 없음 */ }
  }
  return map
}

const genPath = (t) => path.join(TMP, 'relay/gen', `lane-${pad(t.lane)}-${t.slug}.json`)
const reviewPath = (t) => path.join(TMP, 'relay/review', `lane-${pad(t.lane)}-${t.slug}.json`)
const blindPath = (t) => path.join(TMP, 'blind', `${t.slug}.json`)
const keyPath = (t) => path.join(TMP, 'blind-key', `${t.slug}.json`)

/** codex-batch의 pickFinal과 동일: combined는 규격 검사 후 쓰고, 못 쓰면 winner 번호로 되돌린다. */
function pickFinal(judge, list, lang) {
  const w = list[Number(judge?.winner) - 1]
  const combined = typeof judge?.combined === 'string' ? judge.combined.trim() : ''
  if (!combined) return w
  const ok = lang === 'ko'
    ? L(combined) >= 6 && L(combined) <= 30 && !BAN.test(combined) && !/^\d/.test(combined)
    : combined.length >= 10 && combined.length <= 90
  if (!ok) return w
  return list.find((x) => x.t === combined) ?? { t: combined, src: 'combined' }
}

function pools(t, head) {
  const gen = JSON.parse(readFileSync(genPath(t), 'utf8'))
  const prev = head.get(t.id)
  const ko = gen.ideaPool.map((c) => ({ t: c, src: 'blind' }))
  const en = gen.englishPool.map((c) => ({ t: c, src: 'blind' }))
  if (t.headline) ko.push({ t: t.headline, src: 'current' })
  if (t.headline_en) en.push({ t: t.headline_en, src: 'current' })
  if (prev?.headline && prev.headline !== t.headline) ko.push({ t: prev.headline, src: 'previous' })
  if (prev?.headline_en && prev.headline_en !== t.headline_en) en.push({ t: prev.headline_en, src: 'previous' })
  shuffle(ko, seedOf(t.slug)); shuffle(en, seedOf(t.slug + ':en'))
  return { ko, en }
}

// ───────────────────────── emit ─────────────────────────
function runEmit(targets) {
  const head = headLedger()
  mkdirSync(path.join(TMP, 'blind'), { recursive: true })
  mkdirSync(path.join(TMP, 'blind-key'), { recursive: true })
  let made = 0
  const pending = []
  for (const t of targets) {
    if (!existsSync(genPath(t)) || existsSync(reviewPath(t))) continue
    if (!existsSync(blindPath(t))) {
      const { ko, en } = pools(t, head)
      writeFileSync(blindPath(t), JSON.stringify({
        slug: t.slug, nickname: t.nickname, bio: t.bio ?? null,
        ko: ko.map((x) => x.t), en: en.map((x) => x.t),
      }, null, 2), 'utf8')
      writeFileSync(keyPath(t), JSON.stringify({
        id: t.id, slug: t.slug, lane: t.lane, nickname: t.nickname,
        ko, en, currentK: t.headline, currentE: t.headline_en, reasons: t.reasons,
      }, null, 2), 'utf8')
      made++
    }
    pending.push(t.slug)
  }
  console.log(`blind 발행 ${made} · 심사 대기 ${pending.length}`)
}

// ───────────────────────── collect ─────────────────────────
function runCollect(targets) {
  const dir = path.join(TMP, 'judge')
  if (!existsSync(dir)) { console.log('judge 폴더 없음'); return }
  const verdicts = new Map()
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const body = JSON.parse(readFileSync(path.join(dir, f), 'utf8'))
    for (const [slug, v] of Object.entries(body)) verdicts.set(slug, v)
  }
  mkdirSync(path.join(TMP, 'relay/review'), { recursive: true })
  const bySlug = new Map(targets.map((t) => [t.slug, t]))
  let wrote = 0, skipped = 0
  for (const [slug, j] of verdicts) {
    const t = bySlug.get(slug)
    if (!t || !existsSync(keyPath(t)) || existsSync(reviewPath(t))) { skipped++; continue }
    const key = JSON.parse(readFileSync(keyPath(t), 'utf8'))
    const kw = pickFinal(j.ko, key.ko, 'ko')
    const ew = pickFinal(j.en, key.en, 'en')
    if (!kw || !ew) { console.log(`번호 범위 밖 ${slug} ko=${j.ko?.winner} en=${j.en?.winner}`); continue }
    const phase = kw.src === 'current' && ew.src === 'current' ? 'skip' : 'confirm'
    writeFileSync(reviewPath(t), JSON.stringify({
      lane: t.lane, reviewVersion: REVIEW_VERSION,
      items: [{ id: t.id, slug: t.slug, phase, headline: kw.t, headline_en: ew.t, selection: { ko: kw.src, en: ew.src } }],
      judge: { ko: j.ko, en: j.en, candidates: { ko: key.ko.map((x) => x.t), en: key.en.map((x) => x.t) } },
      before: { headline: t.headline, headline_en: t.headline_en, reasons: t.reasons },
    }, null, 2), 'utf8')
    console.log(`review ${phase} ${slug} ko=${kw.src} en=${ew.src} → ${kw.t}`)
    wrote++
  }
  console.log(`review 기록 ${wrote} · 건너뜀 ${skipped} · 잔여 ${targets.filter((t) => existsSync(genPath(t)) && !existsSync(reviewPath(t))).length}`)
}

// ───────────────────────── record ─────────────────────────
function runRecord(targets) {
  const dir = path.join(TMP, 'relay/review')
  const byLane = new Map()
  const slugs = new Set(targets.map((t) => t.slug))
  for (const f of readdirSync(dir)) {
    const m = f.match(/^lane-(\d\d)-(.+)\.json$/)
    if (!m || !slugs.has(m[2])) continue
    const body = JSON.parse(readFileSync(path.join(dir, f), 'utf8'))
    const lane = Number(m[1])
    if (!byLane.has(lane)) byLane.set(lane, [])
    byLane.get(lane).push(...body.items)
  }
  mkdirSync(path.join(TMP, 'relay/record'), { recursive: true })
  let total = 0
  for (const [lane, items] of [...byLane.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(TMP, 'relay/record', `lane-${pad(lane)}.json`)
    writeFileSync(file, JSON.stringify({ lane, reviewVersion: REVIEW_VERSION, items }, null, 2), 'utf8')
    const out = execSync(`pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file "${file}"`,
      { cwd: path.join(REPO, 'sw/web-bo'), encoding: 'utf8' })
    process.stdout.write(out.split('\n').filter((l) => l.startsWith('record')).join('\n') + '\n')
    total += items.length
  }
  console.log(`record 합계 ${total}건. 다음: cli.ts apply (dry) → apply --apply`)
}

const cmd = process.argv[2]
const targets = await fetchTargets()
if (cmd === 'emit') runEmit(targets)
else if (cmd === 'collect') runCollect(targets)
else if (cmd === 'record') runRecord(targets)
else if (cmd === 'targets') {
  console.log(`대상 ${targets.length} · gen ${targets.filter((t) => existsSync(genPath(t))).length} · blind ${targets.filter((t) => existsSync(blindPath(t))).length} · review ${targets.filter((t) => existsSync(reviewPath(t))).length}`)
} else { console.error('usage: direct-review.mjs emit|collect|record|targets [--targets file]'); process.exit(1) }
