/**
 * 신화 개요(faction_lv2.description / description_en) 전량 재작성 —
 * 신화별 통찰-우선 지시서(briefs-v2.json)에 따라 agy(gemini-3.8-flash-high)로 쓴다. DB는 건드리지 않는다.
 *
 * 규격: 세 문단, 한국어 550~750자, 영어 1100~1700자.
 * 방향: 신화 자체로 시작해 서사·긴장을 지나 남은 것으로 맺는다. 원전·판본 설명은 한 절로 묻는다.
 * 대상: is_myth 38개 전량 — briefs-v2.json이 목록을 쥔다.
 * 재실행 안전: 이미 만들어 둔 출력 파일이 있으면 건너뛴다.
 *
 * 쿼터 소진 시 exit 3 — agy-accounts 스킬 절대로 계정을 전환하고 같은 명령으로 이어 돈다.
 *
 * 실행 (sw/web-bo 에서): node scripts/founding-myth/agy-myth-desc.mjs [--conc 3] [--list]
 */
import path from 'node:path'
import fs from 'node:fs'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const DATA_DIR = path.resolve(process.cwd(), '../../data/celeb/myth-desc')
const OUT_DIR = path.join(DATA_DIR, 'out-v2')
const BRIEFS = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'briefs-v2.json'), 'utf8'))
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 3))
const LIST_ONLY = process.argv.includes('--list')
const ONLY = arg('--only', null)

const BANNED = ['벼리', '포개', '빚어내', '아로새기', '숨결', '울림', '여정', '서사의 지평']

// 결의 기준 본보기 — 신화가 뭔지로 시작해 서사→선언→남은 것으로 맺는 격본.
// 분량은 규격(550~750자)을 따른다. 본보기는 결이다.
const SAMPLE = `곰이 사람이 되고 싶었다는 소망에서 이 나라의 첫 이야기는 시작된다. 하늘의 아들 환웅이 바람과 비와 구름을 거느리고 신단수 아래로 내려왔고, 굴속의 곰은 쑥과 마늘만 먹으며 스무 하루를 견뎌 여인이 되었다. 사람이 되는 길은 견뎌내는 것이었다 — 호랑이는 참지 못하고 사라졌다.

웅녀가 환웅을 만나 낳은 아이가 단군왕검이다. 하늘의 핏줄과 땅에서 견뎌낸 몸이 한 사람 안에서 만나, 그는 평양에 도읍하고 조선을 세웠다. 이 결합은 내력이 아니라 선언이다 — 이 나라의 왕은 하늘의 명과 사람의 인내가 함께 세운다는.

이야기가 남긴 것은 시조보다 원형이다. 견뎌낸 자만이 사람이 되고, 신성은 내려오는 게 아니라 땅에서 이뤄진다는 믿음이 이 땅의 국가 이야기 끝에 오래 남았다. 단군이 산신이 되어 물러나는 퇴장까지, 통치는 영원하지 않다는 물러남의 방식을 이 전승은 함께 새겼다.`

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

- 첫 문단은 신화 자체로 시작한다 — 기록이나 문헌이 아니라 이야기의 첫 장면·첫 존재로 시작한다. 신화가 뭔지도 모르는 독자에게 원전부터 읽게 하면 글이 무너진다.
- 기록·문헌은 「삼국유사가 전하는」처럼 문장 속 한 절로 묻는다. 원전 목록·판본 비교·실전 여부를 단독 문장이나 단락으로 세우지 않는다.
- 판본이 서사 자체를 바꾸는 갈림(서사가 달라지는 경우)만 본문에서 다룬다. 나머지 판본 정보는 뺀다.
- 마지막 문단은 이 신화가 남긴 것으로 맺는다 — 무엇을 다루는 이야기인지, 독자가 무엇을 가져가는지. 교훈이나 설교는 아니다.

## 규격

- **세 문단으로 쓴다.** 첫 문단은 서사의 시작과 중심 장면, 둘째는 긴장과 고비, 셋째는 남은 것과 의미 — 문단마다 역할이 다르다.
- 한국어 550~750자, 영어 1100~1700자로 맞춘다. 문단 사이는 빈 줄(\\n\\n)로 나눈다.
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

function validate(o) {
  const bad = []
  const ko = o.description ?? ''
  const en = o.description_en ?? ''
  if (ko.length < 530 || ko.length > 800) bad.push(`한국어 ${ko.length}자`)
  if (en.length < 1050 || en.length > 1800) bad.push(`영어 ${en.length}자`)
  const kP = ko.split(/\n+/).filter(Boolean).length
  const eP = en.split(/\n+/).filter(Boolean).length
  if (kP !== 3) bad.push(`한국어 문단 ${kP}개`)
  if (eP !== 3) bad.push(`영어 문단 ${eP}개`)
  for (const w of BANNED) if (ko.includes(w)) bad.push(`금지어 ${w}`)
  return bad
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const todo = BRIEFS.briefs
    .filter((b) => !ONLY || b.slug === ONLY)
    .filter((b) => !fs.existsSync(path.join(OUT_DIR, `${b.slug}.json`)))
  console.log(`대상 ${BRIEFS.briefs.length}개 / 남은 것 ${todo.length}개`)
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
      console.log(`OK   ${brief.name} — 한 ${o.description.length}자 / 영 ${o.description_en.length}자`)
    }
  }
  console.log(`\n생성 ${done} / 실패 ${failed}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
