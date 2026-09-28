/**
 * `celeb_dialogues` 가 없는 인물의 한마디 조사와 상황 대사를 agy(Gemini)로 만든다.
 * 생성만 하고 DB는 건드리지 않는다. 산출물은 3-patch.ts 의 MinimalInput 형식이다.
 *
 *   이 스크립트 → 3-patch.ts → fill.ts
 *
 * gpt-speech.mjs 와 같은 계약이나 두 가지가 다르다.
 *   - 작성자는 agy의 gemini-3.8-flash-high 다. 한국어 문장력 때문에 골랐다.
 *   - 이 배치 대상은 speech_tone 도 비어 있으므로 모델이 6코드 중 하나를 고른다.
 *
 * agy는 search_web 도구로 조사한다. 출처 URL 을 지어내면 검사에서 걸린다.
 * 계정이 죽으면 --accounts 목록 순서대로 agm switch --target agy 후 생존 프로브를 해
 * 살아있는 계정으로 이어 돈다. agm list 의 잔량 수치는 실제 주간 쿼터와 다르다.
 * 재실행 안전: 이미 대사 행이 있거나 이미 만들어 둔 인물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/agy-speech.mjs --list
 *   node scripts/celeb/agy-speech.mjs --limit 3 --conc 1        파일럿
 *   node scripts/celeb/agy-speech.mjs --conc 2 --accounts a@x,b@y
 */

import path from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/gap-fill/speech')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const LIMIT = Number(arg('--limit', '0'))
const CONC = Number(arg('--conc', '2'))
const LIST_ONLY = process.argv.includes('--list')
// --no-switch: 생존 계정이 하나뿐일 때 쓴다. 쿼터 소진 시 죽은 계정으로 헛돌지 않고 즉시 멈춘다.
const NO_SWITCH = process.argv.includes('--no-switch')
// --accounts a@x,b@y: 전환 후보를 이 순서로만 순회한다. agm list 의 잔량 수치는 실제와 다르므로
// 프로 계정처럼 재사용 가능성이 확인된 계정만 명시해 쓴다. 지정 없으면 agm list 에서 고른다.
const ROTATION = (arg('--accounts', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
// --slugs 는 이미 대사 행이 있는 인물도 강제로 다시 만든다.
const ONLY_SLUGS = (arg('--slugs', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
// --shard i/N: 병렬 샤드. slug 정렬 목록을 N등분해 i번째만 담당한다(0부터).
const SHARD = (() => { const m = (arg('--shard', '') || '').match(/^(\d+)\/(\d+)$/); return m ? { i: +m[1], n: +m[2] } : null })()

const SITUATIONS = ['greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack']
// scripts/lib/celeb-speech-research.ts 의 SPEECH_LINE_MAX_KO 와 같은 값. 그쪽이 바뀌면 여기도 맞춘다.
const LINE_MAX = { greeting: 40, roll_call: 40, deploy: 35, battle_win: 40, battle_draw: 40, battle_lose: 40, clash_attack: 25 }
const QUOTE_MAX = 50
const TONES = ['loyal', 'composed', 'bold', 'humble', 'gentle', 'free']
const TONE_HINT = {
  bold: '단언·선언·명령', composed: '절제·관조', gentle: '부드럽고 따뜻한 구어',
  free: '격식에 덜 얽힌 거침없는 구어', humble: '겸양', loyal: '의무·사명',
}

/** 계정 일일 쿼터 소진 신호는 `Individual quota reached`뿐이다. `RESOURCE_EXHAUSTED`는
 * 모델 서버의 순간 용량 한도(Resets in 0s)라 계정 전환으로 풀리지 않으므로 재시도가 답이다. */
function agyQuotaExhausted() {
  try {
    const dir = path.resolve(process.env.GEMINI_CLI_HOME ?? path.join(homedir(), '.gemini'), 'antigravity-cli/log')
    const latest = fs.readdirSync(dir).filter((n) => n.endsWith('.log'))
      .map((n) => ({ n, t: fs.statSync(path.resolve(dir, n)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0]
    return !!latest && /Individual quota reached/.test(
      fs.readFileSync(path.resolve(dir, latest.n), 'utf8').slice(-20000))
  } catch { return false }
}

/** 이번 실행에서 죽은 것으로 판정된 계정. 같은 세션에서 다시 프로브하지 않는다.
 * 프로 계정의 주간 쿼터는 세션 안에 되살아나지 않고, 자격 미달은 영구적이다. */
const deadAccounts = new Set()

function agmActive() {
  try {
    const st = spawnSync('agm', ['status'], { encoding: 'utf8', timeout: 30000 })
    return String(st.stdout).match(/Active Account:\s*(\S+@\S+)/)?.[1] ?? null
  } catch { return null }
}

/** 후보 계정으로 CLI만 넘기고 실제 호출이 사는지 확인한다. agm list 의 잔량 수치는
 * 주간 쿼터와 무관하게 100%로 남아 있어 실측 프로브만 믿는다. 살아있는 계정 이메일이나 null. */
async function agyRotate(current) {
  let candidates = ROTATION
  if (!candidates.length) {
    try {
      const list = spawnSync('agm', ['list'], { encoding: 'utf8', timeout: 60000 })
      for (const line of String(list.stdout).split('\n')) {
        const m = line.match(/^\s*(\S+@\S+)\s+(.*?)\s+(\d+)%/)
        if (m && !m[2].includes('token-exp')) candidates.push(m[1])
      }
    } catch {}
  }
  for (const email of candidates) {
    if (email === current || deadAccounts.has(email)) continue
    const r = spawnSync('agm', ['switch', email, '--target', 'agy'], { input: 'y\n', encoding: 'utf8', timeout: 60000 })
    if (r.status !== 0) { deadAccounts.add(email); continue }
    console.log(`   [agm switch --target agy] ${email} — 프로브`)
    if (await agyAlive()) return email
    deadAccounts.add(email)
    console.log(`   [probe dead] ${email}`)
  }
  return null
}

/** 타임아웃이 이유 없는 무응답인지 가른다. */
async function agyAlive() {
  try {
    const out = await agyCall('Reply with exactly: OK', { timeoutMs: 60000 })
    return /\bOK\b/.test(out)
  } catch { return false }
}

function buildPrompt(r, { web = false } = {}) {
  const gender = r.gender === false ? '여성' : r.gender === true ? '남성' : '불명'
  const researchOrder = web
    ? '아래 한 사람에 대해 **구글 검색으로 실제 자료를 찾아 조사한 뒤** 말투, 한마디, 상황 대사를 만든다.'
    : '아래 한 사람에 대해 **search_web 도구로 웹을 검색해 조사한 뒤** 말투, 한마디, 상황 대사를 만든다.'
  return `너는 인물 대사 작성자다. ${researchOrder}

## 대상

- 이름: ${r.nickname} (영문 ${r.nickname_en ?? '없음'})
- 실존 축: ${r.celeb_reality} / 직군: ${r.profession ?? '없음'} / 국적: ${r.nationality ?? '없음'} / 성별: ${gender} / 생몰: ${r.birth_date ?? '?'}${r.death_date ? `~${r.death_date}` : ''}
- 수식어: ${r.title ?? '없음'}
- 한 줄 정의: ${r.headline ?? '없음'}
- 소개: ${r.bio}

## 세 가지를 만든다. 성격이 다르다.

### 1. 말투(tone) — 조사한 발화 표본에서 고른다.

아래 여섯 코드 중 이 인물의 중심 호흡에 맞는 하나를 고른다. 직군은 보조 근거이고 실제 발화가 우선이다.

- bold: 단언·선언·명령 / composed: 절제·관조 / gentle: 부드럽고 따뜻한 구어
- free: 격식에 덜 얽힌 거침없는 구어 / humble: 겸양 / loyal: 의무·사명

### 2. 한마디 — 조사해서 찾는다. 지어내지 않는다.

그 사람이 **실제로 한 발언 한 문장**이다. 사료·원전·기록에 남은 직접화법이어야 한다.

- 허용: 본인의 연설·서한·저서, 사서가 직접화법으로 적은 말(『삼국사기』·『사기』·『서경』 등), 원전의 대사
- 불허: 후대의 평가, 타인이 그 사람에 대해 한 말, 명언 모음 사이트, 검색 스니펫, 창작형 격언
- **삶과 철학을 대변하는 한마디를 고른다.** 조사 중에 마주친 아무 문장이나 가져오는 것이 아니다. 따옴표만 떼어 놓고 읽어도 무슨 말인지 알아들을 수 있고, 그 사람을 아는 독자가 그 사람의 발언이라고 알아보는 문장이어야 한다
- 자기소개·신원 확인·맥락 없는 단발 대답처럼 그 자리에서만 성립하는 말은 약하다. 약한 문장밖에 없으면 unavailable 판정이 낫다
- 찾으면 원문(original)·원문 언어(lang)·한국어(quote_ko)·영어(quote_en)·출처(quote_src)를 낸다. **원문 언어의 번역값은 다듬지 않는다** — 원문이 영어면 quote_en 은 original 과 글자 그대로 같고, 원문이 한국어면 quote_ko 가 original 과 글자 그대로 같다. 줄이거나 매끄럽게 고친 문장은 원문이 아니다
- **quote_src 에는 URL 하나만 넣는다.** 마크다운 링크 표기, 권·장·절 설명, 여러 주소를 섞지 않는다. 출전 설명은 inspected 의 두 번째 칸에 적는다
- **quote_ko 는 한국인이 처음부터 한국어로 뱉은 말처럼 쓴다.** 원문이 외국어라도 "~하는 것이다", "~인 것입니다", 목적어를 앞세운 어순, 직역 관용구 같은 번역투를 쓰지 않는다. 소리 내어 읽어 번역된 문장처럼 들리면 고친다. quote_en 도 영어권 화자의 자연스러운 문장으로 쓴다
- **끝내 못 찾으면 unavailable: true 로 판정하고 unavailable_reason 을 적는다.** 없는 것을 지어내는 것보다 없다고 판정하는 편이 옳다
- unavailable 로 판정하려면 **실제로 연 출처 3곳 이상, 서로 다른 호스트 2곳 이상**이 필요하다

### 3. 상황 대사 21개 — 창작한다.

화면에서 한 번 튀어나오는 반응이다. 평전이 아니다. 조사한 사실을 설명하지 말고 그 사실에서 드러난 선택과 호흡만 남긴다.

| 상황 | 역할 |
|---|---|
| greeting | 만났을 때의 대표 호흡 |
| roll_call | 등장·호명에 대한 짧은 응답 |
| deploy | 당장 실행할 결단·지시 |
| battle_win | 승리에 대한 반응 |
| battle_draw | 무승부에 대한 반응 |
| battle_lose | 패배에 대한 반응 |
| clash_attack | 돌격·기합·도발처럼 가장 짧은 충돌 발화 |

### 길이 상한 — 넘으면 폐기된다

greeting 40자 · roll_call 40자 · **deploy 35자** · battle_win 40자 · battle_draw 40자 · battle_lose 40자 · **clash_attack 25자**

공백과 문장부호를 포함해 센다. 상한을 넘기느니 문장을 자르고 한 가지만 남긴다. 두 문장을 이어 붙이지 말고 한 호흡으로 끝낸다. 한마디(quote_ko)는 50자 이내다. 글자 수를 스크립트로 세지 말고 눈대중으로 맞춘다.

각 상황에 **서로 다른 3개**를 쓴다(총 21개).

- **한국인이 실제로 입에 올리는 문장으로 쓴다.** 번역투·사물 주어·설교투·수사적 과장을 빼고 평범하고 자연스러운 한국어로 쓴다. 소리 내어 읽어 어색하면 고친다
- **이름과 고유명사를 지웠을 때 같은 직군 누구에게나 붙는 문장은 실패다.** 이 사람의 소개에 있는 사건·선택·관계가 들려야 한다
- 상황 라벨을 서로 바꿔도 어색하지 않으면 상황 반응이 아니다
- 업적·연대를 한 문장에 압축하지 않는다
- ${r.profession === 'commander' ? '지휘관이므로 반말 명령형을 써도 된다' : '존댓말을 기본으로 쓰되 deploy 와 clash_attack 은 짧은 명령형을 허용한다'}
- 모든 문장을 같은 종결어미로 찍지 않는다. 고른 tone의 중심 호흡 안에서 변주한다

## 조사 기록

- identity: 신원 한 줄(한국어)
- wiki: 영문 위키백과 문서 제목(있으면). 없으면 identity_src 에 신원 확인 URL
- facts: [["한국어 사실", "출처 URL"], ...] **2건 이상**
- anchors: 그 인물의 어휘·판단 습관·갈등 방식을 대사로 옮길 고유 앵커 **3건 이상**
- queries: 실제로 쓴 검색어 **3건 이상**
- inspected: [["열어본 URL", "그 본문에서 확인한 것"], ...] **2건 이상**(unavailable 이면 3건 이상·호스트 2곳 이상)
- channels: 검색 경로 종류 2건 이상(예: 백과 항목, 사서 원문, 학술 논문)
- assessment: 판정 근거 한 문단

**URL 을 지어내지 마라.** 실제로 연 주소만 적는다. 검사에서 호스트를 세므로 가짜 주소는 걸린다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 객체 하나만 출력한다. 진행 보고("조사하겠다", "작성하겠다" 같은 문장)도 붙이지 않는다.

{"slug":"${r.slug}","tone":"<여섯 코드 중 하나>","wiki":"...","identity":"...","facts":[["...","https://..."],["...","https://..."]],"anchors":["...","...","..."],"queries":["...","...","..."],"inspected":[["https://...","..."],["https://...","..."],["https://...","..."]],"channels":["...","..."],"assessment":"...","unavailable":true,"unavailable_reason":"...","lines":{"greeting":["","",""],"roll_call":["","",""],"deploy":["","",""],"battle_win":["","",""],"battle_draw":["","",""],"battle_lose":["","",""],"clash_attack":["","",""]}}

한마디를 찾았으면 unavailable·unavailable_reason 대신 quote_ko·quote_en·quote_src·original·lang 을 넣는다.`
}

/** agy 출력에서 JSON 객체를 꺼낸다. 앞뒤 진행 보고를 걷어낸다. */
function extractJson(text) {
  const body = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  return start > -1 && end > start ? body.slice(start, end + 1) : body
}

function validate(text, r) {
  const issues = []
  let o
  try { o = JSON.parse(extractJson(text)) } catch (e) { return { ok: null, issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (o.slug !== r.slug) issues.push(`slug 불일치: ${o.slug}`)
  if (!TONES.includes(o.tone)) issues.push(`tone 코드 아님: ${o.tone}`)

  const host = (u) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return '' } }
  if (!Array.isArray(o.facts) || o.facts.length < 2) issues.push('facts 2건 미만')
  if (!Array.isArray(o.anchors) || o.anchors.length < 3) issues.push('anchors 3건 미만')
  if (!Array.isArray(o.queries) || o.queries.length < 3) issues.push('queries 3건 미만')
  if (!Array.isArray(o.inspected) || o.inspected.length < 2) issues.push('inspected 2건 미만')
  if (!o.identity?.trim()) issues.push('identity 없음')
  if (!o.assessment?.trim()) issues.push('assessment 없음')
  if (!o.wiki?.trim() && !o.identity_src?.trim()) issues.push('wiki·identity_src 둘 다 없음')

  if (o.unavailable) {
    if (!o.unavailable_reason?.trim()) issues.push('unavailable_reason 없음')
    if (!Array.isArray(o.inspected) || o.inspected.length < 3) issues.push('unavailable 인데 inspected 3건 미만')
    else if (new Set(o.inspected.map(([u]) => host(u))).size < 2) issues.push('unavailable 인데 호스트 2곳 미만')
    for (const k of ['quote_ko', 'quote_en', 'quote_src']) if (o[k]) issues.push(`unavailable 인데 ${k} 가 있다`)
  } else {
    for (const k of ['quote_ko', 'quote_en', 'quote_src']) if (!o[k]?.trim()) issues.push(`${k} 없음`)
    if (o.quote_ko && o.quote_ko.includes('\n')) issues.push('quote_ko 에 줄바꿈')
    if (o.quote_ko && o.quote_ko.length > QUOTE_MAX) issues.push(`quote_ko ${o.quote_ko.length}자(상한 ${QUOTE_MAX})`)
    if (o.quote_src) { try { new URL(String(o.quote_src).trim()) } catch { issues.push('quote_src 가 순수 URL 이 아니다') } }
    // 원문 언어의 번역값은 원문 그대로여야 한다 — 다듬은 값이 오면 원문으로 되돌린다
    if (o.original && /^en/i.test(String(o.lang ?? 'en')) && o.quote_en !== o.original) o.quote_en = o.original
    if (o.original && /^ko/i.test(String(o.lang ?? '')) && o.quote_ko !== o.original) o.quote_ko = o.original
  }

  const lines = o.lines ?? {}
  for (const s of SITUATIONS) {
    const arr = lines[s]
    if (!Array.isArray(arr) || arr.length !== 3) { issues.push(`${s} 3개 아님`); continue }
    if (arr.some((x) => typeof x !== 'string' || !x.trim())) issues.push(`${s} 빈 문장`)
    if (new Set(arr.map((x) => String(x).trim())).size !== 3) issues.push(`${s} 안에서 중복`)
    for (const line of arr) {
      const body = String(line).replace(/^\s*\[[^\]]*\]\s*/, '')
      if (body.length > LINE_MAX[s]) issues.push(`${s} ${body.length}자(상한 ${LINE_MAX[s]}) «${body}»`)
    }
  }
  return { ok: issues.length ? null : o, issues }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const all = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('celebs')
      .select('id,slug,nickname,nickname_en,celeb_reality,profession,title,headline,bio,nationality,birth_date,death_date,gender,speech_tone')
      .order('slug').range(f, f + 999)
    if (error) throw new Error(error.message)
    all.push(...data)
    if (data.length < 1000) break
  }

  const has = new Set()
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('celeb_dialogues').select('celeb_id').range(f, f + 999)
    for (const r of data ?? []) has.add(r.celeb_id)
    if ((data ?? []).length < 1000) break
  }

  const generated = new Set()
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.json')) generated.add(f.replace(/\.json$/, ''))
  }

  let todo = ONLY_SLUGS.length
    ? all.filter((c) => ONLY_SLUGS.includes(c.slug))
    : all.filter((c) => !has.has(c.id) && !generated.has(c.slug) && c.bio)
  if (SHARD) todo = todo.filter((_, idx) => idx % SHARD.n === SHARD.i)
  console.log(`대사 결손 ${todo.length}명 (이미 생성 ${generated.size}명${SHARD ? `, 샤드 ${SHARD.i}/${SHARD.n}` : ''})`)
  if (LIST_ONLY) return
  if (LIMIT > 0) todo = todo.slice(0, LIMIT)
  if (!todo.length) return
  console.log(`이번 회차 ${todo.length}명 (동시 ${CONC})`)

  const queue = [...todo]
  let done = 0, failed = 0, switched = 0, unavail = 0, halted = false
  let currentAcct = agmActive()
  console.log(`agy 계정: ${currentAcct ?? '미확인'}`)

  const worker = async () => {
    for (;;) {
      const r = queue.shift()
      if (!r || halted) return
      try {
        const text = await agyCall(buildPrompt(r), { timeoutMs: 600000 })
        const { ok, issues } = validate(text, r)
        if (!ok) {
          failed++
          console.log(`FAIL ${r.nickname} — ${issues.join(' | ').slice(0, 300)}`)
          continue
        }
        fs.writeFileSync(path.join(OUT_DIR, `${r.slug}.json`), JSON.stringify(ok, null, 2) + '\n', 'utf8')
        done++
        if (ok.unavailable) unavail++
        console.log(`OK   ${r.nickname} [${ok.tone}] — ${ok.unavailable ? '한마디 없음' : `한마디 «${ok.quote_ko.slice(0, 30)}»`} (누적 ${done})`)
      } catch (e) {
        const msg = String(e.message)
        // 계정이 죽은 신호: 주간 쿼터(`Individual quota reached`)·자격 미달·프로브 불통.
        // RESOURCE_EXHAUSTED·503·그냥 시간 초과는 모델 서버의 순간 용량 문제라
        // 전환으로 안 풀리므로 잠시 쉬고 같은 계정으로 다시 돌린다.
        const accountDead = /Individual quota reached|not eligible|Eligibility check/i.test(msg)
          || (/시간 초과/.test(msg) && (agyQuotaExhausted() || !(await agyAlive())))
        if (accountDead) {
          if (currentAcct) deadAccounts.add(currentAcct)
          queue.unshift(r)
          if (!NO_SWITCH) {
            const next = await agyRotate(currentAcct)
            if (next) {
              currentAcct = next
              switched++
              console.log(`SWITCH → ${next} (${switched}회) — 이어 돈다`)
              continue
            }
          }
          halted = true
          console.log(`HALT ${r.nickname} — 쓸 수 있는 계정 없음. 충전 뒤 같은 명령으로 이어 돌린다`)
          return
        }
        const transient = /시간 초과|RESOURCE_EXHAUSTED|UNAVAILABLE|429|503|capacity/i.test(msg)
        r.__tries = (r.__tries ?? 0) + 1
        if (transient && r.__tries <= 3) {
          await new Promise((s) => setTimeout(s, 30000))
          queue.push(r)
          console.log(`RETRY ${r.nickname} — 순간 용량/타임아웃, 재시도 ${r.__tries}/3`)
          continue
        }
        failed++
        console.log(`ERR  ${r.nickname} — ${msg.slice(0, 200)}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, worker))
  console.log(`\n생성 ${done}명 (한마디 확보 ${done - unavail} / 없음 ${unavail}) · 실패 ${failed} · 계정전환 ${switched}`)
  console.log(`출력: ${OUT_DIR}`)
  if (halted) process.exit(3)
}

export { buildPrompt, validate }

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) main()
