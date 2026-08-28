/**
 * 한 줄 정의(headline) 재대결 codex 배치 러너.
 *
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs targets            # 대상 집계만
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs gen    [--limit N] # 블라인드 10안 생성
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs review [--limit N] # 무기명 대결
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs record            # 레인별 record 파일 생성 + cli record
 *
 * sw/web-bo 에서 실행한다. 대상은 DB 현재값의 형식 위반(30자 초과·12자 미만·금지어·직함형)이며
 * `--targets <json>` 으로 바꿀 수 있다. 산출물이 있으면 건너뛰므로 rate limit 뒤 같은 명령으로 이어 붙인다.
 *
 *   생성:  data/celeb/headline-rewrite/.tmp/relay/gen/lane-NN-<slug>.json
 *   대결:  data/celeb/headline-rewrite/.tmp/relay/review/lane-NN-<slug>.json  (record 스키마 + judge)
 *   기록:  data/celeb/headline-rewrite/.tmp/relay/record/lane-NN.json → cli.ts record --file
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { codexCall, looksRateLimited } from '../../../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../../..')
const ROOT = path.join(REPO, 'data/celeb/headline-rewrite')
const TMP = path.join(ROOT, '.tmp/relay')
const GUIDE = path.join(REPO, 'docs/project/celeb/celeb-1-basic-profile.md')
const REVIEW_VERSION = 2
const LANE_COUNT = 20
const BAN = /(벼리|벼려|포개|변신가|결을 고르|비애|후광을 왕조)/

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

function guideSection() {
  const md = readFileSync(GUIDE, 'utf8')
  const start = md.indexOf('## 한 줄 정의(headline) 작성 가이드')
  const end = md.indexOf('\n---', start)
  return md.slice(start, end).trim()
}

function db() {
  config({ path: path.join(REPO, 'sw/web-bo/.env'), quiet: true })
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } })
}

async function fetchTargets() {
  const file = argOf('targets')
  const sb = db()
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('celebs')
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

const genPath = (t) => path.join(TMP, 'gen', `lane-${pad(t.lane)}-${t.slug}.json`)
const reviewPath = (t) => path.join(TMP, 'review', `lane-${pad(t.lane)}-${t.slug}.json`)

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('JSON 없음')
  return JSON.parse(m[0])
}

// ───────────────────────── gen ─────────────────────────
function genPrompt(t, guide) {
  return `너는 인물 사전의 「한 줄 정의(headline)」 후보를 만드는 한국어 작가다. 파일을 읽거나 명령을 실행하지 말고, 아래 정보와 네 지식만으로 JSON 하나만 출력하라.

## 인물
- 이름: ${t.nickname ?? t.slug} (slug: ${t.slug})
- 소개(사실 근거): ${t.bio ?? '(없음)'}
- 직함 표기: ${t.title ?? '(없음)'}

소개에 없는 사실은 네가 확실히 아는 것만 써라. 확실하지 않은 사실·수치·작품명은 쓰지 마라.

## 규칙 (원문)
${guide}

## 이번 발주 추가 규칙
- 영어를 쓰지 않고 한국어 rough부터 발산해 **서로 다른 사실·동사·장면**의 한국어 10안을 만든다. 단어만 바꾼 유사문은 한 개로 센다.
- 각 안은 **12~28자**(공백 포함), 절대 30자를 넘기지 않는다.
- 각 안을 「후보 — ${t.nickname ?? t.slug}」로 읽어 바로 이해되는 자연스러운 현대 한국어만 남긴다. 고어·과장 문어체·영어식 조어·영어 관용구 직역(예: 청사진을 쓰다)·한국에서 통용되지 않는 전문용어 직역은 버린다.
- 직함·소속·배역을 그대로 옮긴 문구(예: 「OO의 메인보컬」, 「OO의 공동창업자」, 「작품명의 배역명」)는 정의가 아니다. 후보로 세지 마라. 그 인물이 한 일·장면·방식이 드러나야 한다.
- **각 안에는 검증 가능한 구체 사실 하나(작품명·사건·장소·상대·방식·별명)가 반드시 들어간다.** 「시대를 건넌」, 「신뢰를 지킨」, 「얼굴을 그린」, 「빛낸」, 「새 기준을 세운」처럼 평가어만으로 된 안은 사실이 없으므로 버린다. 먼저 이 인물의 확실한 사실 8~10개를 머릿속에 세우고 각 안을 서로 다른 사실에 붙여라.
- 문장 끝의 직업명(배우·시인·작가)이 10안 전부 같지 않게 하라. 그 인물을 부르는 다른 말(예: 역할·별명·행위자)도 섞어라.
- 수치나 연도로 문장을 시작하지 마라.
- 영어 후보 4개는 한국어를 직역하지 말고 영어 문장으로 따로 쓴다. **90자 이내**, 80자 안쪽을 목표로 한다.
- **10안 중 하나를 고르지 마라.** 순위·추천·설명을 붙이지 마라.

## 출력 (이 JSON만, 다른 텍스트 없이)
{"ideaPool":["…10개…"],"englishPool":["…4개…"]}`
}

function validateGen(obj) {
  const ko = (obj.ideaPool ?? []).map((s) => String(s).trim())
    .filter((s) => L(s) >= 12 && L(s) <= 30 && !BAN.test(s) && !/^\d/.test(s))
  const en = (obj.englishPool ?? []).map((s) => String(s).trim()).filter((s) => s.length >= 10 && s.length <= 90)
  if (ko.length < 8) throw new Error(`한국어 유효 후보 ${ko.length}개`)
  if (en.length < 3) throw new Error(`영어 유효 후보 ${en.length}개`)
  return { ko: [...new Set(ko)].slice(0, 10), en: [...new Set(en)].slice(0, 4) }
}

async function runGen(targets, limit, concurrency) {
  const guide = guideSection()
  mkdirSync(path.join(TMP, 'gen'), { recursive: true })
  const todo = targets.filter((t) => !existsSync(genPath(t))).slice(0, limit)
  console.log(`gen 대상 ${targets.length} · 남은 ${todo.length}`)
  await pool(todo, concurrency, async (t, i) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await codexCall(genPrompt(t, guide))
        const { ko, en } = validateGen(parseJson(text))
        writeFileSync(genPath(t), JSON.stringify({
          id: t.id, slug: t.slug, lane: t.lane, nickname: t.nickname, ideaPool: ko, englishPool: en,
        }, null, 2), 'utf8')
        console.log(`[${i + 1}/${todo.length}] gen ok ${t.slug} ko=${ko.length} en=${en.length}`)
        return
      } catch (e) {
        const msg = String(e.message ?? e)
        if (looksRateLimited(msg)) { console.log(`[${i + 1}/${todo.length}] RATE ${t.slug}: ${msg.slice(0, 200)}`); throw e }
        console.log(`[${i + 1}/${todo.length}] gen 실패(${attempt}) ${t.slug}: ${msg.slice(0, 200)}`)
      }
    }
  })
}

// ───────────────────────── review ─────────────────────────
function reviewPrompt(t, guide, koList, enList) {
  return `너는 인물 사전 「한 줄 정의(headline)」의 심사자다. 파일을 읽거나 명령을 실행하지 말고 JSON 하나만 출력하라.

## 인물
- 이름: ${t.nickname ?? t.slug} (slug: ${t.slug})
- 소개(사실 근거): ${t.bio ?? '(없음)'}

## 규칙 (원문)
${guide}

## 판정 순서
후보의 출처는 알려주지 않으며 묻지도 마라. 사실 → 「후보 — ${t.nickname ?? t.slug}」로 읽었을 때 한 덩어리 캐치프레이즈인가 → 그 인물에게만 붙는 고유성 → 자연스러운 현대 한국어(규칙이 금지한 표현·번역투·직역 전문용어는 탈락) → 짧기 순이다.
사실이 틀렸거나 의심스러운 안은 탈락시켜라. 이력을 나열한 설명문과 직함·소속·배역을 그대로 옮긴 문구(「OO의 메인보컬」, 「작품명의 배역명」)는 진다. 30자가 넘는 안은 아주 뛰어날 때만 골라라.
영어는 한국어와 따로 판정하되 영어 문장 자체의 자연스러움과 정확성으로 고르고, 90자가 넘는 안은 탈락시켜라.

## 한국어 후보
${koList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 영어 후보
${enList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 출력 (이 JSON만)
{"ko":{"winner":번호,"reason":"한 문장"},"en":{"winner":번호,"reason":"한 문장"}}`
}

async function runReview(targets, limit, concurrency) {
  const guide = guideSection()
  const head = headLedger()
  mkdirSync(path.join(TMP, 'review'), { recursive: true })
  const todo = targets.filter((t) => existsSync(genPath(t)) && !existsSync(reviewPath(t))).slice(0, limit)
  console.log(`review 대상 ${targets.length} · 남은 ${todo.length}`)
  await pool(todo, concurrency, async (t, i) => {
    const gen = JSON.parse(readFileSync(genPath(t), 'utf8'))
    const prev = head.get(t.id)
    const ko = gen.ideaPool.map((c) => ({ t: c, src: 'blind' }))
    const en = gen.englishPool.map((c) => ({ t: c, src: 'blind' }))
    if (t.headline) ko.push({ t: t.headline, src: 'current' })
    if (t.headline_en) en.push({ t: t.headline_en, src: 'current' })
    if (prev?.headline && prev.headline !== t.headline) ko.push({ t: prev.headline, src: 'previous' })
    if (prev?.headline_en && prev.headline_en !== t.headline_en) en.push({ t: prev.headline_en, src: 'previous' })
    shuffle(ko, seedOf(t.slug)); shuffle(en, seedOf(t.slug + ':en'))
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await codexCall(reviewPrompt(t, guide, ko.map((x) => x.t), en.map((x) => x.t)))
        const j = parseJson(text)
        const kw = ko[Number(j.ko?.winner) - 1]
        const ew = en[Number(j.en?.winner) - 1]
        if (!kw || !ew) throw new Error(`번호 범위 밖 ko=${j.ko?.winner} en=${j.en?.winner}`)
        const phase = kw.src === 'current' && ew.src === 'current' ? 'skip' : 'confirm'
        writeFileSync(reviewPath(t), JSON.stringify({
          lane: t.lane, reviewVersion: REVIEW_VERSION,
          items: [{ id: t.id, slug: t.slug, phase, headline: kw.t, headline_en: ew.t, selection: { ko: kw.src, en: ew.src } }],
          judge: { ko: j.ko, en: j.en, candidates: { ko: ko.map((x) => x.t), en: en.map((x) => x.t) } },
          before: { headline: t.headline, headline_en: t.headline_en, reasons: t.reasons },
        }, null, 2), 'utf8')
        console.log(`[${i + 1}/${todo.length}] review ${phase} ${t.slug} ko=${kw.src} en=${ew.src} → ${kw.t}`)
        return
      } catch (e) {
        const msg = String(e.message ?? e)
        if (looksRateLimited(msg)) { console.log(`[${i + 1}/${todo.length}] RATE ${t.slug}: ${msg.slice(0, 200)}`); throw e }
        console.log(`[${i + 1}/${todo.length}] review 실패(${attempt}) ${t.slug}: ${msg.slice(0, 200)}`)
      }
    }
  })
}

// ───────────────────────── record ─────────────────────────
function runRecord(targets) {
  const dir = path.join(TMP, 'review')
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
  mkdirSync(path.join(TMP, 'record'), { recursive: true })
  let total = 0
  for (const [lane, items] of [...byLane.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(TMP, 'record', `lane-${pad(lane)}.json`)
    writeFileSync(file, JSON.stringify({ lane, reviewVersion: REVIEW_VERSION, items }, null, 2), 'utf8')
    const out = execSync(`pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file "${file}"`,
      { cwd: path.join(REPO, 'sw/web-bo'), encoding: 'utf8' })
    process.stdout.write(out.split('\n').filter((l) => l.startsWith('record')).join('\n') + '\n')
    total += items.length
  }
  console.log(`record 합계 ${total}건. 다음: cli.ts apply (dry) → apply --apply`)
}

// ───────────────────────── util ─────────────────────────
async function pool(items, size, fn) {
  let next = 0
  let stop = false
  const ok = { done: 0, fail: 0 }
  const worker = async () => {
    while (!stop) {
      const i = next++
      if (i >= items.length) return
      try { await fn(items[i], i); ok.done++ } catch (e) {
        ok.fail++
        if (looksRateLimited(String(e.message ?? e))) { stop = true; console.log(`rate limit 의심 — ${i + 1}번째에서 중단. 회복 후 같은 명령으로 이어 붙여라.`) }
      }
    }
  }
  await Promise.all(Array.from({ length: size }, worker))
  console.log(`완료 ${ok.done} · 실패 ${ok.fail}`)
}

const cmd = process.argv[2]
const limit = Number(argOf('limit') ?? Infinity)
const concurrency = Number(argOf('concurrency') ?? 3)
const targets = await fetchTargets()
if (cmd === 'targets') {
  const cnt = {}
  for (const t of targets) for (const r of t.reasons) cnt[r] = (cnt[r] ?? 0) + 1
  console.log(`대상 ${targets.length}`, cnt)
  console.log(`gen 완료 ${targets.filter((t) => existsSync(genPath(t))).length} · review 완료 ${targets.filter((t) => existsSync(reviewPath(t))).length}`)
} else if (cmd === 'gen') await runGen(targets, limit, concurrency)
else if (cmd === 'review') await runReview(targets, limit, concurrency)
else if (cmd === 'record') runRecord(targets)
else { console.error('usage: codex-batch.mjs targets|gen|review|record [--limit N] [--concurrency 3] [--targets file]'); process.exit(1) }
