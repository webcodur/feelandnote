/**
 * 신화 개요 재작성 v3 — 신화 지도 재편(38→77 featured)으로 새로 생기거나 짧은 문장으로 리셋된
 * featured 신화 48개를 briefs-v3.json 지시에 따라 agy(gemini-3.8-flash-high)로 쓴다. DB는 건드리지 않는다.
 *
 * 규격: 세 문단, 한국어 400~800자, 영어 100~220단어 — 전승이 작으면 짧게, 억지로 늘리지 않는다.
 * 방향: 신화 자체로 시작해 서사·긴장을 지나 남은 것으로 맺는다. 시조·건국담 위주의 신규 신화가 다수.
 * 재실행 안전: 이미 만들어 둔 출력 파일이 있으면 건너뛴다.
 *
 * 쿼터 소진 시 exit 3 — agy-accounts 스킬 절대로 계정을 전환하고 같은 명령으로 이어 돈다.
 *
 * 실행 (sw/web-bo 에서): node scripts/founding-myth/agy-myth-desc-v3.mjs [--conc 3] [--list] [--only slug]
 */
import path from 'node:path'
import fs from 'node:fs'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const DATA_DIR = path.resolve(process.cwd(), '../../data/celeb/myth-desc-v3')
const OUT_DIR = path.join(DATA_DIR, 'out-v3')
const BRIEFS = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'briefs-v3.json'), 'utf8'))
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 3))
const LIST_ONLY = process.argv.includes('--list')
const ONLY = arg('--only', null)

const BANNED = ['벼리', '포개', '빚어내', '아로새기', '숨결', '울림', '여정', '서사의 지평']

// 격본 — 시조·건국담 계열 신화의 결. 분량은 규격을 따른다.
const SAMPLE = `늑대와 사슴의 자식이 대륙을 건너온다는 말로 몽골의 이야기는 시작된다. 푸른 늑대 보르테 치노와 노란 사슴 고아이 마랄이 만나 낳은 후손이 열한 대를 이어 도분 메르겐에게 닿고, 그가 죽은 뒤 홀로 남은 알랑 고아는 매일 밤 천막의 빛 구멍으로 들어오는 노란 빛을 받아 세 아들을 낳는다. 남편 없이 낳은 아이들 — 순수 몽골, 니르군의 조상이다.

이 빛의 자손이 보돈차르 뭉카크로 이어지고, 그 후예에서 칭기즈 칸이 나온다. 천막으로 들어온 빛은 우연이 아니라 하늘의 선택이다 — 땅의 핏줄이 아니라 하늘이 내려준 핏줄이 왕을 만든다는 선언이다.

초원의 왕권은 태어난 자가 아니라 내려진 자의 것이다. 늑대가 낳고 빛이 잉태시킨 이 계보는, 후에 세계를 정복한 왕이 어디서 왔는가를 하늘의 뜻으로 답하는 이야기다.`

function agyQuotaExhausted() {
  const dir = 'C:/Users/webco/.gemini/antigravity-cli/log'
  const latest = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort().pop()
  if (!latest) return false
  return /Individual quota reached/i.test(fs.readFileSync(path.join(dir, latest), 'utf8'))
}

function buildPrompt(brief) {
  const beats = brief.beats.map((b) => `- ${b}`).join('\n')
  const figs = brief.figures.join('·')
  const cautions = (brief.cautions ?? []).map((c) => `- ${c}`).join('\n')

  return `너는 인물 큐레이션 서비스의 편집자다. 신화 지도에 서는 전승 「${brief.name}」의 안내글(개요)을 한국어와 영어로 쓴다.

## 이 전승의 성격

${brief.scope}

## 서사의 뼈대 — 글의 몸통으로 삼을 사건과 고비

${beats}

## 이 전승이 남기는 것 — 끝 문단의 방향

${brief.insight}

## 이 전승에 실제로 등록된 인물 중 개요에 이름으로 넣을 것

${figs}

화면에서 안내글 아래에 이 사람들이 선다. 여기 적은 이름만 이름으로 쓰고, 명단 밖 인물을 새로 만들어 넣지 않는다.

## 유의

${cautions}

## 글의 방향 — 가장 중요한 규칙

이 글은 참고 문헌 정리가 아니라 **신화를 읽는 글**이다.

- 첫 문단은 신화 자체로 시작한다 — 기록이나 문헌이 아니라 이야기의 첫 장면·첫 존재로 시작한다.
- 기록·문헌은 「연대기가 전하는」처럼 문장 속 한 절로 묻는다. 원전 목록·판본 비교·실전 여부를 단독 문장이나 단락으로 세우지 않는다.
- 마지막 문단은 이 신화가 남긴 것으로 맺는다 — 무엇을 다루는 이야기인지, 독자가 무엇을 가져가는지. 교훈이나 설교는 아니다.

## 규격

- **세 문단으로 쓴다.** 첫 문단은 서사의 시작과 중심 장면, 둘째는 긴장과 고비, 셋째는 남은 것과 의미 — 문단마다 역할이 다르다.
- 한국어 400~800자, 영어 100~220단어로 맞춘다. 문단 사이는 빈 줄(\\n\\n)로 나눈다. 분량은 전승이 채우는 만큼 — 억지로 늘리거나 균일하게 맞추지 않는다.
- 인물·사건 이름을 구체적으로 적는다 — 「한 영웅」이 아니라 그 이름으로.
- 영어는 한국어를 직역하지 않는다. 같은 이야기를 영어권 독자에게 자연스럽게 다시 쓴다.
- 한국인이 한국어로 쓴 글답게 주의해서 작성한다.

## 문체 금지

- 단골 문예 어휘를 쓰지 않는다 — 벼리다, 포개다, 빚어내다, 아로새기다, 결을 고르다, 숨결, 울림, 여정, 서사의 지평 같은 말.
- 설교나 교훈으로 끝내지 않는다.
- 감탄·과장 수식을 넣지 않는다. 이야기를 놀랍게 말하는 게 아니라 정확하게 말한다.
- 번역투를 피한다.

## 본보기 — 이 결의 기준이다(분량은 위 규격을 따른다)

${SAMPLE}

## 출력 형식

설명·머리말·코드펜스 없이 JSON 객체만 출력한다.

{"description":"한국어 세 문단","description_en":"English, three paragraphs"}`
}

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length

function validate(o) {
  const bad = []
  const ko = o.description ?? ''
  const en = o.description_en ?? ''
  if (ko.length < 380 || ko.length > 850) bad.push(`한국어 ${ko.length}자`)
  const w = wordCount(en)
  if (w < 90 || w > 240) bad.push(`영어 ${w}단어`)
  const kP = ko.split(/\n+/).filter(Boolean).length
  const eP = en.split(/\n+/).filter(Boolean).length
  if (kP !== 3) bad.push(`한국어 문단 ${kP}개`)
  if (eP !== 3) bad.push(`영어 문단 ${eP}개`)
  for (const t of BANNED) if (ko.includes(t)) bad.push(`금지어 ${t}`)
  return bad
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const todo = Object.entries(BRIEFS)
    .map(([slug, b]) => ({ slug, ...b }))
    .filter((b) => !ONLY || b.slug === ONLY)
    .filter((b) => !fs.existsSync(path.join(OUT_DIR, `${b.slug}.json`)))
  console.log(`대상 ${Object.keys(BRIEFS).length}개 / 남은 것 ${todo.length}개`)
  for (const b of todo) console.log(`  ${b.slug}  ${b.name}`)
  if (LIST_ONLY || !todo.length) return

  let done = 0, failed = 0
  for (let i = 0; i < todo.length; i += CONC) {
    const results = await Promise.allSettled(todo.slice(i, i + CONC).map(async (brief) => {
      const text = await agyCall(buildPrompt(brief), { timeoutMs: 600_000 })
      const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
      const o = JSON.parse(body)
      const bad = validate(o)
      if (bad.length) {
        const fix = await agyCall(
          `${buildPrompt(brief)}\n\n## 교정 지시\n\n직전 결과가 ${bad.join(', ')}로 규격을 어겼다. 규격에 맞게 다시 쓴다.`,
          { timeoutMs: 600_000 },
        )
        const body2 = fix.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
        const o2 = JSON.parse(body2)
        const bad2 = validate(o2)
        if (bad2.length) throw new Error(bad2.join(', '))
        return { brief, o: o2 }
      }
      return { brief, o }
    }))
    for (const [j, r] of results.entries()) {
      const brief = todo[i + j]
      if (r.status === 'rejected') {
        if (agyQuotaExhausted()) {
          console.error('QUOTA: Individual quota reached — 계정 전환 후 같은 명령으로 재개한다')
          process.exit(3)
        }
        failed++
        console.log(`FAIL ${brief.name} — ${String(r.reason?.message ?? r.reason).slice(0, 250)}`)
        continue
      }
      const { o } = r.value
      fs.writeFileSync(path.join(OUT_DIR, `${brief.slug}.json`),
        JSON.stringify({ slug: brief.slug, name: brief.name, ...o }, null, 2) + '\n', 'utf8')
      done++
      console.log(`OK   ${brief.name} — 한 ${o.description.length}자 / 영 ${wordCount(o.description_en)}단어`)
    }
  }
  console.log(`\n생성 ${done} / 실패 ${failed}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
