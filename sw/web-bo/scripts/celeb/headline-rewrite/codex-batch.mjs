/**
 * 한 줄 정의(headline) 재대결 외부 CLI 배치 러너. 엔진은 codex(기본) 또는 agy.
 *
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs targets            # 대상 집계만
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs gen    [--limit N] # 블라인드 10안 생성
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs review [--limit N] # 무기명 대결
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs run    [--limit N] # 한 사람씩 생성 → 대결 (파이프라인)
 *   node scripts/celeb/headline-rewrite/codex-batch.mjs record            # 레인별 record 파일 생성 + cli record
 *
 *   --engine agy       agy(gemini-3.8-flash-high)로 돈다. 계정 쿼터가 차면 agm으로 다음 계정에 넘긴다.
 *   --concurrency N    동시 작업 수(기본 3). 돌고 있는 중에는 .tmp/relay/concurrency.txt 숫자로 바꾼다.
 *   --targets <json>   slug 배열 파일. 없으면 DB 현재값의 형식 위반(30자 초과·12자 미만·금지어·직함형).
 *
 * sw/web-bo 에서 실행한다. 산출물이 있으면 건너뛰므로 중단 뒤 같은 명령으로 이어 붙인다.
 * .tmp/relay/STOP 파일을 만들면 새 작업을 더 열지 않고 도는 것만 마친 뒤 끝난다.
 * 생성자는 현재값을 보지 않고, 심사자는 후보의 출처를 모른다. 생성과 대결은 서로 다른 호출이다.
 *
 *   생성:  data/celeb/headline-rewrite/.tmp/relay/gen/lane-NN-<slug>.json
 *   대결:  data/celeb/headline-rewrite/.tmp/relay/review/lane-NN-<slug>.json  (record 스키마 + judge)
 *   기록:  data/celeb/headline-rewrite/.tmp/relay/record/lane-NN.json → cli.ts record --file
 */
import { createHash } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { codexCall, looksRateLimited } from '../../../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'
import { agyCall } from '../../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'
import { HEADLINE_BAN } from './rules.mjs'

// 외부 CLI(agy·codex·opencode·claude·kiro)는 사용자가 승인한 실행에서만 쓴다. 기본은 본 모델이 직접 수행한다(AGENTS.md 「데이터·외부 서비스」).
if (!process.env.ALLOW_EXTERNAL_CLI) {
  console.error('이 스크립트는 외부 CLI 모델을 호출한다. 사용자 승인 후 ALLOW_EXTERNAL_CLI=1로 실행한다.')
  process.exit(1)
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../../..')
const ROOT = path.join(REPO, 'data/celeb/headline-rewrite')
const TMP = path.join(ROOT, '.tmp/relay')
const GUIDE = path.join(REPO, 'docs/project/celeb/celeb-01-02-profile-intro.md')
const REVIEW_VERSION = 2
const LANE_COUNT = 20
const BAN = HEADLINE_BAN
const AGY_MODEL = 'gemini-3.8-flash-high'
const GEN_TIMEOUT_MS = 8 * 60_000
const REVIEW_TIMEOUT_MS = 6 * 60_000
const CONCURRENCY_FILE = path.join(TMP, 'concurrency.txt')
const STOP_FILE = path.join(TMP, 'STOP')

const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined }
const ENGINE = argOf('engine') ?? 'codex'
if (!['codex', 'agy'].includes(ENGINE)) { console.error(`모르는 엔진: ${ENGINE}`); process.exit(1) }
const L = (s) => [...s].length
const pad = (n) => String(n).padStart(2, '0')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stamp = () => new Date().toISOString().slice(11, 19)
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
  const heading = '## 한 줄 정의(headline) 작성 가이드'
  const start = md.indexOf(heading)
  if (start < 0) throw new Error(`${GUIDE}: ${heading} 절을 찾지 못했습니다.`)
  const nextHeading = md.indexOf('\n## ', start + heading.length)
  return md.slice(start, nextHeading < 0 ? md.length : nextHeading).trim()
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

const genPath = (t) => path.join(TMP, 'gen', `lane-${pad(t.lane)}-${t.slug}.json`)
const reviewPath = (t) => path.join(TMP, 'review', `lane-${pad(t.lane)}-${t.slug}.json`)

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('JSON 없음')
  return JSON.parse(m[0])
}

// ───────────────────────── 엔진 ─────────────────────────
// codex는 도구 없이 지식만, agy는 확실하지 않은 사실을 웹 검색으로 확인할 수 있다. 어느 쪽도 파일·명령은 쓰지 않는다.
const TOOL_RULE = ENGINE === 'agy'
  ? '이 지시문 말고 다른 파일은 읽거나 쓰지 말고 명령도 실행하지 마라. 확실하지 않은 사실은 웹 검색으로 확인해도 된다. 최종 출력은 JSON 하나뿐이다.'
  : '파일을 읽거나 명령을 실행하지 말고, 아래 정보와 네 지식만으로 JSON 하나만 출력하라.'
const FACT_RULE = ENGINE === 'agy'
  ? '소개에 없는 사실은 확실히 알거나 검색으로 확인한 것만 써라. 확인되지 않은 사실·수치·작품명은 쓰지 마라.'
  : '소개에 없는 사실은 네가 확실히 아는 것만 써라. 확실하지 않은 사실·수치·작품명은 쓰지 마라.'

class StopAll extends Error {}

/** agy는 쿼터 소진 시 오류 대신 내부 429 재시도로 시간 초과까지 매달린다. 최신 실행 로그로 가른다. */
function agyQuotaExhausted() {
  try {
    const dir = path.resolve(homedir(), '.gemini/antigravity-cli/log')
    const latest = readdirSync(dir).filter((n) => n.endsWith('.log'))
      .map((n) => ({ n, t: statSync(path.resolve(dir, n)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0]
    return !!latest && /Individual quota reached/.test(readFileSync(path.resolve(dir, latest.n), 'utf8').slice(-20000))
  } catch { return false }
}

async function agyAlive() {
  try { return /\bOK\b/.test(await agyCall('Reply with exactly: OK', { model: AGY_MODEL, timeoutMs: 60_000 })) } catch { return false }
}

function agmActive() {
  const st = spawnSync('agm', ['status'], { encoding: 'utf8', timeout: 30_000, windowsHide: true })
  return String(st.stdout ?? '').match(/Active Account:\s*(\S+@\S+)/)?.[1] ?? null
}

/** 이번 실행에서 쿼터·로그인·무응답으로 죽은 계정. 같은 실행 안에서는 다시 쓰지 않는다. */
// --dead a@x,b@y: 앞선 실행에서 이미 소진된 계정. 다시 프로브하느라 계정마다 1분씩 버리지 않는다.
const deadAccounts = new Set((argOf('dead') ?? '').split(',').map((s) => s.trim()).filter(Boolean))
let currentAccount = ENGINE === 'agy' ? agmActive() : null
let rotating = null

/** agm list 순서대로 CLI 계정만 넘기고 인사 프로브가 사는 첫 계정을 쓴다. agm list 잔량 수치는 실제 쿼터와 달라 믿지 않는다. */
async function agyRotate() {
  // 토큰은 갱신 뒤 약 1시간이면 token-exp로 바뀐다. 갱신 없이 거르면 쓸 수 있는 계정을 소진으로 오판한다.
  spawnSync('agm', ['validate'], { encoding: 'utf8', timeout: 180_000, windowsHide: true })
  const list = spawnSync('agm', ['list'], { encoding: 'utf8', timeout: 60_000, windowsHide: true })
  const candidates = []
  for (const line of String(list.stdout ?? '').split('\n')) {
    const m = line.match(/^\s*(\S+@\S+)\s+(.*?)\s+(\d+)%/)
    if (m && !m[2].includes('token-exp')) candidates.push(m[1])
  }
  for (const email of candidates) {
    if (deadAccounts.has(email)) continue
    const r = spawnSync('agm', ['switch', email, '--target', 'agy'], { input: 'y\n', encoding: 'utf8', timeout: 60_000, windowsHide: true })
    if (r.status !== 0) { deadAccounts.add(email); continue }
    if (await agyAlive()) { console.log(`${stamp()} 계정 전환 → ${email}`); return email }
    deadAccounts.add(email)
    console.log(`${stamp()} 프로브 실패 ${email}`)
  }
  return null
}

/** 동시에 여러 작업이 소진을 만나도 전환은 한 번만 한다. 호출 시작 계정이 이미 바뀌었으면 전환 없이 다시 돈다. */
async function rotateFrom(account) {
  if (account !== currentAccount) return currentAccount
  if (!rotating) {
    rotating = (async () => {
      if (currentAccount) deadAccounts.add(currentAccount)
      console.log(`${stamp()} 쿼터 소진 ${currentAccount} — 다음 계정을 찾는다`)
      currentAccount = await agyRotate()
      rotating = null
      return currentAccount
    })()
  }
  return rotating
}

async function callModel(prompt, { timeoutMs, codexOpts }) {
  if (ENGINE === 'codex') return codexCall(prompt, codexOpts)
  for (let attempt = 1; attempt <= 5; attempt++) {
    if (rotating) await rotating
    const account = currentAccount
    try {
      return await agyCall(prompt, { model: AGY_MODEL, timeoutMs })
    } catch (e) {
      const msg = String(e.message ?? e)
      const timedOut = /시간 초과|timeout/i.test(msg)
      // `not eligible`은 계정 자격 미달이라 그 계정으로는 다시 돌지 않는다. 같은 Eligibility 문구라도 네트워크 끊김은 일시 오류다.
      if (/Individual quota reached|Authentication required|로그인|not eligible/i.test(msg) || (timedOut && agyQuotaExhausted())) {
        if (!(await rotateFrom(account))) throw new StopAll('agy 계정 풀 전원 소진')
        continue
      }
      // 모델 서버 순간 용량 한도는 계정 전환으로 풀리지 않는다. 짧게 쉬고 다시 친다.
      if (/RESOURCE_EXHAUSTED|429|rate.?limit|overloaded|high load|503|unavailable/i.test(msg)) { await sleep(20_000 * attempt); continue }
      if (timedOut && !(await agyAlive())) throw new StopAll('agy 무응답(인사 프로브 실패)')
      throw e
    }
  }
  throw new Error('agy 재시도 한도 초과')
}

// ───────────────────────── gen ─────────────────────────
function genPrompt(t, guide) {
  return `너는 인물 사전의 「한 줄 정의(headline)」 후보를 만드는 한국어 작가다. ${TOOL_RULE}

## 인물
- 이름: ${t.nickname ?? t.slug} (slug: ${t.slug})
- 소개(사실 근거): ${t.bio ?? '(없음)'}
- 직함 표기: ${t.title ?? '(없음)'}

${FACT_RULE}

## 규칙 (원문)
${guide}

## 이번 발주 추가 규칙
- 한국인이 한국어로 쓴 글 답게 주의해서 작성한다.
- 영어를 쓰지 않고 한국어 rough부터 발산해 **서로 다른 사실·동사·장면**의 한국어 10안을 만든다. 단어만 바꾼 유사문은 한 개로 센다.
- 각 안은 **12~28자**(공백 포함), 절대 30자를 넘기지 않는다.
- 각 안을 「후보 — ${t.nickname ?? t.slug}」로 읽어 바로 이해되는 자연스러운 현대 한국어만 남긴다. 고어·과장 문어체·영어식 조어·영어 관용구 직역(예: 청사진을 쓰다)·한국에서 통용되지 않는 전문용어 직역은 버린다.
- 직함·소속·배역을 그대로 옮긴 문구(예: 「OO의 메인보컬」, 「OO의 공동창업자」, 「작품명의 배역명」)는 정의가 아니다. 후보로 세지 마라. 그 인물이 한 일·장면·방식이 드러나야 한다.
- **각 안에는 검증 가능한 구체 사실 하나(작품명·사건·장소·상대·방식·별명)가 반드시 들어간다.** 「시대를 건넌」, 「신뢰를 지킨」, 「얼굴을 그린」, 「빛낸」, 「새 기준을 세운」처럼 평가어만으로 된 안은 사실이 없으므로 버린다. 먼저 이 인물의 확실한 사실 8~10개를 머릿속에 세우고 각 안을 서로 다른 사실에 붙여라.
- 현 소속팀·현 감독·올해 후보 지명처럼 1~2년 안에 낡을 시점 사실로 정의하지 마라.
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

async function genOne(t, guide, tag) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callModel(genPrompt(t, guide), { timeoutMs: GEN_TIMEOUT_MS, codexOpts: { model: 'gpt-5.6-sol', effort: 'high' } })
      const { ko, en } = validateGen(parseJson(text))
      writeFileSync(genPath(t), JSON.stringify({
        id: t.id, slug: t.slug, lane: t.lane, nickname: t.nickname, ideaPool: ko, englishPool: en,
      }, null, 2), 'utf8')
      console.log(`${stamp()} ${tag} gen ok ${t.slug} ko=${ko.length} en=${en.length}`)
      return true
    } catch (e) {
      if (e instanceof StopAll) throw e
      const msg = String(e.message ?? e)
      if (ENGINE === 'codex' && looksRateLimited(msg)) { console.log(`${tag} RATE ${t.slug}: ${msg.slice(0, 200)}`); throw new StopAll(msg) }
      console.log(`${stamp()} ${tag} gen 실패(${attempt}) ${t.slug}: ${msg.slice(0, 200)}`)
    }
  }
  return false
}

// ───────────────────────── review ─────────────────────────
function reviewPrompt(t, guide, koList, enList) {
  return `너는 인물 사전 「한 줄 정의(headline)」의 심사자다. ${TOOL_RULE}

## 인물
- 이름: ${t.nickname ?? t.slug} (slug: ${t.slug})
- 소개(사실 근거): ${t.bio ?? '(없음)'}

## 규칙 (원문)
${guide}

## 판정 순서
후보의 출처는 알려주지 않으며 묻지도 마라. 사실 → 「후보 — ${t.nickname ?? t.slug}」로 읽었을 때 한 덩어리 캐치프레이즈인가 → 그 인물에게만 붙는 고유성 → 자연스러운 현대 한국어(규칙이 금지한 표현·번역투·직역 전문용어는 탈락) → 짧기 순이다.
사실이 틀렸거나 의심스러운 안은 탈락시켜라. 이력을 나열한 설명문과 직함·소속·배역을 그대로 옮긴 문구(「OO의 메인보컬」, 「작품명의 배역명」)는 진다. 30자가 넘는 안은 아주 뛰어날 때만 골라라. 현 소속팀·올해 후보 지명처럼 곧 낡을 시점 사실에 기댄 안은 감점하라.
영어는 한국어와 따로 판정하되 영어 문장 자체의 자연스러움과 정확성으로 고르고, 90자가 넘는 안은 탈락시켜라.
**조합 허용**: 어느 안도 그대로 둘 만하지 않은데 둘 이상의 장점을 합치거나 같은 사실로 다시 쓰면 명백히 나아질 때만 combined에 새 문장을 써라. combined도 같은 규격을 지킨다(한국어 12~28자·30자 절대 초과 금지, 영어 90자 이내, 금지 표현·수치 시작 금지, 한국인이 한국어로 쓴 글 답게). 후보 중 이미 좋은 것이 있으면 combined는 null로 두고 번호로 고르는 게 우선이다.

## 한국어 후보
${koList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 영어 후보
${enList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 출력 (이 JSON만)
{"ko":{"winner":번호,"combined":"문장 또는 null","reason":"한 문장"},"en":{"winner":번호,"combined":"문장 또는 null","reason":"한 문장"}}`
}

/**
 * 심사자가 combined를 내면 규격을 검사해 최종으로 쓰고, 못 쓰면 winner 번호로 되돌린다.
 * combined가 기존 후보와 같은 문장이면 그 출처(current 등)를 따른다.
 */
function pickFinal(judge, list, lang) {
  const w = list[Number(judge?.winner) - 1]
  const combined = typeof judge?.combined === 'string' ? judge.combined.trim() : ''
  if (!combined || combined === 'null') return w
  const ok = lang === 'ko'
    ? L(combined) >= 12 && L(combined) <= 30 && !BAN.test(combined) && !/^\d/.test(combined)
    : combined.length >= 10 && combined.length <= 90
  if (!ok) return w
  return list.find((x) => x.t === combined) ?? { t: combined, src: 'combined' }
}

async function reviewOne(t, guide, head, tag) {
  const gen = JSON.parse(readFileSync(genPath(t), 'utf8'))
  const prev = head.get(t.id)
  const ko = gen.ideaPool.map((c) => ({ t: c, src: 'blind' }))
  const en = gen.englishPool.map((c) => ({ t: c, src: 'blind' }))
  // 현재값이 신규안과 글자까지 같으면 한 번만 싣고 출처는 current로 둔다.
  const addSrc = (list, text, src) => {
    if (!text) return
    const hit = list.find((x) => x.t === text)
    if (hit) { if (src === 'current') hit.src = 'current'; return }
    list.push({ t: text, src })
  }
  addSrc(ko, t.headline, 'current'); addSrc(en, t.headline_en, 'current')
  if (prev?.headline && prev.headline !== t.headline) addSrc(ko, prev.headline, 'previous')
  if (prev?.headline_en && prev.headline_en !== t.headline_en) addSrc(en, prev.headline_en, 'previous')
  shuffle(ko, seedOf(t.slug)); shuffle(en, seedOf(t.slug + ':en'))
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callModel(reviewPrompt(t, guide, ko.map((x) => x.t), en.map((x) => x.t)), { timeoutMs: REVIEW_TIMEOUT_MS, codexOpts: { effort: 'high' } })
      const j = parseJson(text)
      const kw = pickFinal(j.ko, ko, 'ko')
      const ew = pickFinal(j.en, en, 'en')
      if (!kw || !ew) throw new Error(`번호 범위 밖 ko=${j.ko?.winner} en=${j.en?.winner}`)
      const phase = kw.src === 'current' && ew.src === 'current' ? 'skip' : 'confirm'
      writeFileSync(reviewPath(t), JSON.stringify({
        lane: t.lane, reviewVersion: REVIEW_VERSION,
        items: [{ id: t.id, slug: t.slug, phase, headline: kw.t, headline_en: ew.t, selection: { ko: kw.src, en: ew.src } }],
        judge: { ko: j.ko, en: j.en, candidates: { ko: ko.map((x) => x.t), en: en.map((x) => x.t) } },
        before: { headline: t.headline, headline_en: t.headline_en, reasons: t.reasons },
      }, null, 2), 'utf8')
      console.log(`${stamp()} ${tag} review ${phase} ${t.slug} ko=${kw.src} en=${ew.src} → ${kw.t}`)
      return true
    } catch (e) {
      if (e instanceof StopAll) throw e
      const msg = String(e.message ?? e)
      if (ENGINE === 'codex' && looksRateLimited(msg)) { console.log(`${tag} RATE ${t.slug}: ${msg.slice(0, 200)}`); throw new StopAll(msg) }
      console.log(`${stamp()} ${tag} review 실패(${attempt}) ${t.slug}: ${msg.slice(0, 200)}`)
    }
  }
  return false
}

// ───────────────────────── 실행 ─────────────────────────
async function runGen(targets, limit, concurrency) {
  const guide = guideSection()
  const todo = targets.filter((t) => !existsSync(genPath(t))).slice(0, limit)
  console.log(`gen 대상 ${targets.length} · 남은 ${todo.length}`)
  await pool(todo, concurrency, (t, tag) => genOne(t, guide, tag))
}

async function runReview(targets, limit, concurrency) {
  const guide = guideSection()
  const head = headLedger()
  const todo = targets.filter((t) => existsSync(genPath(t)) && !existsSync(reviewPath(t))).slice(0, limit)
  console.log(`review 대상 ${targets.length} · 남은 ${todo.length}`)
  await pool(todo, concurrency, (t, tag) => reviewOne(t, guide, head, tag))
}

/** 한 사람을 생성 → 대결까지 끝내고 다음 사람으로 간다. 대결은 생성과 다른 새 호출이라 무기명이 유지된다. */
async function runPipeline(targets, limit, concurrency) {
  const guide = guideSection()
  const head = headLedger()
  const todo = targets.filter((t) => !existsSync(reviewPath(t))).slice(0, limit)
  console.log(`run 대상 ${targets.length} · 남은 ${todo.length} · 엔진 ${ENGINE}${ENGINE === 'agy' ? ` (${AGY_MODEL}, 계정 ${currentAccount})` : ''}`)
  await pool(todo, concurrency, async (t, tag) => {
    if (!existsSync(genPath(t)) && !(await genOne(t, guide, tag))) return false
    return reviewOne(t, guide, head, tag)
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
      // windowsHide: 레인마다 cmd 창이 떠 사용자 화면에 쌓이지 않게 한다.
      { cwd: path.join(REPO, 'sw/web-bo'), encoding: 'utf8', windowsHide: true })
    process.stdout.write(out.split('\n').filter((l) => l.startsWith('record')).join('\n') + '\n')
    total += items.length
  }
  console.log(`record 합계 ${total}건. 다음: cli.ts apply (dry) → apply --apply`)
}

// ───────────────────────── util ─────────────────────────
/** 동시 작업 수는 concurrency.txt로 도중에 늘리거나 줄인다. STOP 파일이 있으면 새 작업을 열지 않는다. */
async function pool(items, base, fn) {
  let next = 0
  let active = 0
  let stopped = null
  const ok = { done: 0, fail: 0 }
  const t0 = Date.now()
  const want = () => {
    try { const n = Number(readFileSync(CONCURRENCY_FILE, 'utf8').trim()); if (n >= 0 && n <= 32) return n } catch { /* 기본값 */ }
    return base
  }
  await new Promise((resolveAll) => {
    let finished = false
    let ticker = null
    const finish = () => { if (finished) return; finished = true; clearInterval(ticker); resolveAll() }
    const finishIfIdle = () => { if (active === 0 && (next >= items.length || stopped || existsSync(STOP_FILE))) finish() }
    const launch = () => {
      while (!stopped && !existsSync(STOP_FILE) && active < want() && next < items.length) {
        const i = next++
        active++
        const tag = `[${i + 1}/${items.length}]`
        Promise.resolve(fn(items[i], tag))
          .then((r) => { if (r === false) ok.fail++; else ok.done++ })
          .catch((e) => {
            ok.fail++
            if (e instanceof StopAll) { stopped = e.message; console.log(`${stamp()} 중단: ${e.message}. 원인 해소 뒤 같은 명령으로 이어 돈다.`) }
            else console.log(`${stamp()} ${tag} 오류 ${items[i].slug}: ${String(e.message ?? e).slice(0, 200)}`)
          })
          .finally(() => { active--; launch(); finishIfIdle() })
      }
      finishIfIdle()
    }
    ticker = setInterval(() => {
      const min = (Date.now() - t0) / 60_000
      console.log(`${stamp()} 진행 완료 ${ok.done} · 실패 ${ok.fail} · 도는 중 ${active} · 남음 ${items.length - next} · ${(ok.done / Math.max(min, 1e-9)).toFixed(1)}명/분`)
      launch()
    }, 60_000)
    launch()
  })
  console.log(`완료 ${ok.done} · 실패 ${ok.fail}${stopped ? ` · 중단 사유 ${stopped}` : ''}`)
}

mkdirSync(path.join(TMP, 'gen'), { recursive: true })
mkdirSync(path.join(TMP, 'review'), { recursive: true })
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
else if (cmd === 'run') await runPipeline(targets, limit, concurrency)
else if (cmd === 'record') runRecord(targets)
else { console.error('usage: codex-batch.mjs targets|gen|review|run|record [--engine codex|agy] [--limit N] [--concurrency 3] [--targets file]'); process.exit(1) }
