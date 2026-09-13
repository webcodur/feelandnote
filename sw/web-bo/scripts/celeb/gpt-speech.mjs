/**
 * `celeb_dialogues` 가 없는 인물의 한마디 조사와 상황 대사를 codex(GPT)로 만든다.
 * 생성만 하고 DB는 건드리지 않는다. 산출물은 3-patch.ts 의 MinimalInput 형식이다.
 *
 *   이 스크립트 → 3-patch.ts → fill.ts
 *
 * 두 값의 성격이 다르다(celeb-04-01-speech.md).
 *   - 한마디: 그 사람이 실제로 한 발언이어야 한다. 웹을 뒤져 찾고, 끝내 못 찾으면
 *     unavailable 로 판정한다. 표준 자리 표시 값은 3-patch 가 넣으므로 여기서 쓰지 않는다.
 *   - 상황 대사 21개: 창작이다. 조사한 사실에서 드러난 선택과 호흡만 남긴다.
 *
 * codex 를 --search 로 부른다. 출처 URL 을 지어내면 검사에서 걸린다.
 * 재실행 안전: 이미 대사 행이 있거나 이미 만들어 둔 인물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/gpt-speech.mjs --list
 *   node scripts/celeb/gpt-speech.mjs --limit 3 --conc 1        파일럿
 *   node scripts/celeb/gpt-speech.mjs --limit 60 --conc 2
 * 모델은 sol 이다. 이 배치의 주력은 상황 대사 21개 창작이라 글쓰기 능력이 결과를 가른다.
 * 한마디 조사는 1건뿐이고, sol·astra 의 조사 깊이(출처 수·호스트 수)는 실측에서 같았다.
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/gap-fill/speech')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const LIMIT = Number(arg('--limit', '0'))
const CONC = Number(arg('--conc', '2'))
const LIST_ONLY = process.argv.includes('--list')
// --slugs 는 이미 대사 행이 있는 인물도 강제로 다시 만든다. 모델을 바꿔 재생성할 때 쓴다.
const ONLY_SLUGS = (arg('--slugs', '') || '').split(',').map((s) => s.trim()).filter(Boolean)

const SITUATIONS = ['greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack']
// scripts/lib/celeb-speech-research.ts 의 SPEECH_LINE_MAX_KO 와 같은 값. 그쪽이 바뀌면 여기도 맞춘다.
const LINE_MAX = { greeting: 40, roll_call: 40, deploy: 35, battle_win: 40, battle_draw: 40, battle_lose: 40, clash_attack: 25 }
const QUOTE_MAX = 50
const TONE_HINT = {
  bold: '단언·선언·명령', composed: '절제·관조', gentle: '부드럽고 따뜻한 구어',
  free: '격식에 덜 얽힌 거침없는 구어', humble: '겸양', loyal: '의무·사명',
}

function buildPrompt(r) {
  return `너는 인물 대사 작성자다. 아래 한 사람에 대해 **웹을 검색해 조사한 뒤** 한마디와 상황 대사를 만든다.

## 대상

- 이름: ${r.nickname} (영문 ${r.nickname_en})
- 실존 축: ${r.celeb_reality} / 직군: ${r.profession} / 국적: ${r.nationality ?? '없음'} / 생몰: ${r.birth_date ?? '?'}${r.death_date ? `~${r.death_date}` : ''}
- 수식어: ${r.title}
- 한 줄 정의: ${r.headline}
- 소개: ${r.bio}
- 말투(speech_tone): ${r.speech_tone} — 중심 호흡은 ${TONE_HINT[r.speech_tone] ?? '절제'}

## 두 가지를 만든다. 성격이 다르다.

### 1. 한마디 — 조사해서 찾는다. 지어내지 않는다.

그 사람이 **실제로 한 발언 한 문장**이다. 사료·원전·기록에 남은 직접화법이어야 한다.

- 허용: 본인의 연설·서한·저서, 사서가 직접화법으로 적은 말(『삼국사기』·『사기』·『서경』 등), 원전의 대사
- 불허: 후대의 평가, 타인이 그 사람에 대해 한 말, 명언 모음 사이트, 검색 스니펫, 창작형 격언
- 찾으면 원문(original)·원문 언어(lang)·한국어(quote_ko)·영어(quote_en)·출처(quote_src)를 낸다
- **quote_src 에는 URL 하나만 넣는다.** 마크다운 링크 표기, 권·장·절 설명, 여러 주소를 섞지 않는다. 출전 설명은 inspected 의 두 번째 칸에 적는다
- **끝내 못 찾으면 unavailable: true 로 판정하고 unavailable_reason 을 적는다.** 건국 시조·신화 인물은 직접화법 기록이 없는 경우가 많다. 없는 것을 지어내는 것보다 없다고 판정하는 편이 옳다
- unavailable 로 판정하려면 **실제로 연 출처 3곳 이상, 서로 다른 호스트 2곳 이상**이 필요하다

### 2. 상황 대사 21개 — 창작한다.

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

공백과 문장부호를 포함해 센다. 상한을 넘기느니 문장을 자르고 한 가지만 남긴다. 두 문장을 이어 붙이지 말고 한 호흡으로 끝낸다. 한마디(quote_ko)는 50자 이내다.

각 상황에 **서로 다른 3개**를 쓴다(총 21개).

- **이름과 고유명사를 지웠을 때 같은 직군 누구에게나 붙는 문장은 실패다.** 이 사람의 소개에 있는 사건·선택·관계가 들려야 한다
- 상황 라벨을 서로 바꿔도 어색하지 않으면 상황 반응이 아니다
- 업적·연대를 한 문장에 압축하지 않는다
- ${r.profession === 'commander' ? '지휘관이므로 반말 명령형을 써도 된다' : '존댓말을 기본으로 쓰되 deploy 와 clash_attack 은 짧은 명령형을 허용한다'}
- 모든 문장을 같은 종결어미로 찍지 않는다. 같은 중심 호흡 안에서 변주한다
- 사물을 주어로 세우거나 번역투를 쓰지 않는다. 소리 내어 읽어 자연스러운 한국어로 쓴다

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

설명·머리말·코드펜스 없이 JSON 객체 하나만 출력한다.

{"slug":"${r.slug}","tone":"${r.speech_tone}","wiki":"...","identity":"...","facts":[["...","https://..."],["...","https://..."]],"anchors":["...","...","..."],"queries":["...","...","..."],"inspected":[["https://...","..."],["https://...","..."],["https://...","..."]],"channels":["...","..."],"assessment":"...","unavailable":true,"unavailable_reason":"...","lines":{"greeting":["","",""],"roll_call":["","",""],"deploy":["","",""],"battle_win":["","",""],"battle_draw":["","",""],"battle_lose":["","",""],"clash_attack":["","",""]}}

한마디를 찾았으면 unavailable·unavailable_reason 대신 quote_ko·quote_en·quote_src·original·lang 을 넣는다.`
}

function validate(text, r) {
  const issues = []
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  let o
  try { o = JSON.parse(body) } catch (e) { return { ok: null, issues: [`JSON 파싱 실패: ${e.message}`] } }
  if (o.slug !== r.slug) issues.push(`slug 불일치: ${o.slug}`)

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
    // 검사(validateSpeechResearch)는 sourceUrl 에 URL 하나만 받는다. 마크다운 링크·출전 설명이 섞이면 조립에서 막힌다.
    if (o.quote_src) { try { new URL(String(o.quote_src).trim()) } catch { issues.push('quote_src 가 순수 URL 이 아니다') } }
  }

  const lines = o.lines ?? {}
  for (const s of SITUATIONS) {
    const arr = lines[s]
    if (!Array.isArray(arr) || arr.length !== 3) { issues.push(`${s} 3개 아님`); continue }
    if (arr.some((x) => typeof x !== 'string' || !x.trim())) issues.push(`${s} 빈 문장`)
    if (new Set(arr.map((x) => String(x).trim())).size !== 3) issues.push(`${s} 안에서 중복`)
    for (const line of arr) {
      const body = String(line).replace(/^s*[[^]]*]s*/, '')
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
      .select('id,slug,nickname,nickname_en,celeb_reality,profession,title,headline,bio,nationality,birth_date,death_date,speech_tone')
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
    : all.filter((c) => !has.has(c.id) && !generated.has(c.slug) && c.speech_tone && c.bio)
  console.log(`대사 결손 ${todo.length}명 (이미 생성 ${generated.size}명)`)
  if (LIST_ONLY) return
  if (LIMIT > 0) todo = todo.slice(0, LIMIT)
  if (!todo.length) return
  console.log(`이번 회차 ${todo.length}명 (동시 ${CONC})`)

  let done = 0, failed = 0, rate = 0, unavail = 0
  for (let i = 0; i < todo.length; i += CONC) {
    await Promise.all(todo.slice(i, i + CONC).map(async (r) => {
      try {
        const text = await codexCall(buildPrompt(r), { model: 'gpt-5.6-sol', effort: 'xhigh', timeoutMs: 600000, search: true })
        const { ok, issues } = validate(text, r)
        if (!ok) { failed++; console.log(`FAIL ${r.nickname} — ${issues.join(' | ')}`); return }
        fs.writeFileSync(path.join(OUT_DIR, `${r.slug}.json`), JSON.stringify(ok, null, 2) + '\n', 'utf8')
        done++
        if (ok.unavailable) unavail++
        console.log(`OK   ${r.nickname} — ${ok.unavailable ? '한마디 없음' : `한마디 «${ok.quote_ko.slice(0, 30)}»`}`)
      } catch (e) {
        failed++
        if (looksRateLimited(e.message)) { rate++; console.log(`RATE ${r.nickname} — ${e.message.slice(0, 160)}`) }
        else console.log(`ERR  ${r.nickname} — ${e.message.slice(0, 200)}`)
      }
    }))
  }
  console.log(`\n생성 ${done}명 (한마디 확보 ${done - unavail} / 없음 ${unavail}) · 실패 ${failed}${rate ? ` · rate limit 의심 ${rate}` : ''}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
