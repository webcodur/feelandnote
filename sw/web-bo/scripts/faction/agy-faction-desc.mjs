/**
 * 비신화 세력 개요(faction_lv2.description / description_en) 전량 재작성 —
 * faction-desc-v3/briefs/*.json의 유형별 지시서에 따라 agy(gemini-3.8-flash-high)로 쓴다. DB는 건드리지 않는다.
 *
 * 규격: 세 문단(정체 → 작동 원리 → 긴장과 의미), 한국어 400~800자, 영어 110~200단어.
 * 분량은 주제가 채우는 만큼 — 좁은 조직은 짧게, 시대·산업·계보는 길게. 억지로 늘리지 않는다.
 * 방향: 명단 소개가 아니라 「세상과 조직이 어떻게 돌아가는가」를 설명하는 글.
 * 대상: featured 비신화 188개 — briefs가 목록을 쥔다.
 * 재실행 안전: 이미 만들어 둔 출력 파일이 있으면 건너뛴다.
 *
 * 쿼터 소진 시 exit 3 — agy-accounts 스킬 절대로 계정을 전환하고 같은 명령으로 이어 돈다.
 *
 * 실행 (sw/web-bo 에서): node scripts/faction/agy-faction-desc.mjs [--conc 3] [--list] [--only slug]
 */
import path from 'node:path'
import fs from 'node:fs'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const DATA_DIR = path.resolve(process.cwd(), '../../data/celeb/faction-desc-v3')
const BRIEF_DIR = path.join(DATA_DIR, 'briefs')
const OUT_DIR = path.join(DATA_DIR, 'out')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 3))
const LIST_ONLY = process.argv.includes('--list')
const ONLY = arg('--only', null)

const BRIEFS = {}
for (const f of fs.readdirSync(BRIEF_DIR)) {
  if (!f.endsWith('.json')) continue
  for (const [slug, b] of Object.entries(JSON.parse(fs.readFileSync(path.join(BRIEF_DIR, f), 'utf8'))))
    BRIEFS[slug] = b
}

const BANNED = ['벼리', '포개', '빚어내', '아로새기', '숨결', '울림', '여정', '서사의 지평', '모았다', '모아 두었다', '모아뒀다']

// 유형별 두 번째 문단(작동 원리)에 넣을 것 — 지도는 파일이 아니라 규칙이 쥔다.
const KIND_GUIDE = {
  company: '소유·지휘 구조와 돈이 도는 모델, 내부 긴장 — 회사 안에서 권한과 자본이 실제로 도는 방식',
  industry: '가치사슬에서 레버리지를 쥔 쪽과 권력의 이동 — 누가 무엇을 쥐고 흔드는가',
  era: '표면 명분 뒤의 실제 이해와 그 시대에 뒤바뀐 것 — 명분이 아니라 동력',
  work: '작품이 만든 세계의 질서와 그것이 현실과 맞닿는 방식 — 「묶음 소개」가 아니라 세계의 규칙',
  network: '소속이 영향력으로 바뀌는 통로와 실체 — 소문과 실제 작동 방식의 거리',
  lineage: '사상이 어떻게 이어지고 갈라지는가 — 스승-제자, 반박-계승, 제도화의 경로',
  path: '같은 출발선의 사람들이 갈라진 방식과 그 갈림이 만든 결과 — 공통점이 아니라 갈림길',
}

// 격본 — 구조 설명형 개요의 결. 분량은 규격(400~800자)을 따른다.
const SAMPLE = `반도체는 한 회사가 다 만들지 않는다. 설계와 생산이 갈린 파운드리 모델이 이 산업의 뼈대다 — 엔비디아와 AMD가 칩을 설계하면 TSMC가 만들고, 그 TSMC는 ASML의 극자외선 노광장비 없이는 최신 공정을 돌리지 못한다. 1987년 모리스 창이 TSMC를 세우며 만든 이 분업이, 오늘 세계 반도체의 9할을 한 회사에 쥐여 줬다.

레버리지는 세 곳에 있다. 설계의 끝엔 AI 연산 수요를 독점하다시피 한 엔비디아가 있고, 제조의 끝엔 3나노 공정의 TSMC가 있고, 그 위엔 장비를 파는 ASML이 있다. 삼성·SK하이닉스는 메모리 공급망을 쥐고, 애플은 자체 칩으로 기기사의 입지를 넓혔다. 어느 한 고리가 멈추면 세계 전자 산업이 멈춘다.

그래서 반도체는 산업이 아니라 지정학이 됐다. 대만해협의 긴장, 미국의 대중국 수출 통제, 각국의 자국 생산 보조금 경쟁 — 모두 이 가치사슬의 집중이 만들어 낸 균열이다. 이 지도를 읽는 데 필요한 사람들을 이 묶음이 모았다.`

function agyQuotaExhausted() {
  const dir = 'C:/Users/webco/.gemini/antigravity-cli/log'
  const latest = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort().pop()
  if (!latest) return false
  return /Individual quota reached/i.test(fs.readFileSync(path.join(dir, latest), 'utf8'))
}

function buildPrompt(brief) {
  const mech = brief.mechanism.map((m) => `- ${m}`).join('\n')
  const figs = brief.figures.join('·')
  const cautions = (brief.cautions ?? []).map((c) => `- ${c}`).join('\n')
  const kindGuide = KIND_GUIDE[brief.kind] ?? KIND_GUIDE.industry

  return `너는 인물 큐레이션 서비스의 편집자다. 세력도감에 서는 묶음 「${brief.name}」의 안내글(개요)을 한국어와 영어로 쓴다.

## 이 묶음의 성격

${brief.scope}

## 작동 원리 — 둘째 문단의 몸통으로 삼을 구조 사실

${mech}

## 긴장과 의미 — 끝 문단의 방향

${brief.tension}

## 이 묶음에 실제로 등록된 인물 중 개요에 이름으로 넣을 것

${figs}

화면에서 안내글 아래에 이 사람들이 선다. 여기 적은 이름만 이름으로 쓰고, 명단 밖 인물을 새로 만들어 넣지 않는다. 인물 이름은 구조를 증명하는 자리에만 온다.

## 유의

${cautions}

## 글의 방향 — 가장 중요한 규칙

이 글은 명단 소개가 아니라 **세상과 조직이 어떻게 돌아가는지를 설명하는 글**이다. 독자가 이 묶음을 읽고 나면 「아, 이 세계는 이렇게 굴러가는구나」를 얻어야 한다.

- 첫 문단은 정체다 — 이 묶음이 세상에서 차지하는 자리, 무엇이고 언제 어떤 조건에서 생겼는가. 소설·영화 등 작품 세계 묶음이면 목록 소개가 아니라 그 작품이 만든 세계와 현실의 관계로 시작한다.
- 둘째 문단은 작동 원리다 — ${kindGuide}. 파운드리 분업, 연습생-IP 파이프라인, 비영리-영리 전환처럼 메커니즘이 이름으로 드러나야 한다. 사람 이름이 두 문장 연속으로 주어가 되면 명단 나열이다 — 그때는 구조로 다시 쓴다.
- 셋째 문단은 긴장과 의미다 — 내부 모순이나 외부와의 마찰, 지금 이 자리가 왜 흔들리거나 굳었는가. 마지막 한 줄에만 명단 성격을 얹을 수 있다(「~을 만든 사람·이은 사람·떠난 사람이 선다」).

## 규격

- **세 문단으로 쓴다.** 문단마다 역할이 다르다 — 정체 / 작동 원리 / 긴장과 의미.
- 한국어 400~800자, 영어 110~200단어로 맞춘다. 문단 사이는 빈 줄(\\n\\n)로 나눈다. 분량은 주제가 채우는 만큼 — 억지로 늘리거나 균일하게 맞추지 않는다.
- 「모았다」「모아 두었다」식 메타 문장, 「중요하다」「영향력 있다」식 빈 평가로 끝내지 않는다 — 매 문단에 연도·모델·사건·수치 같은 사실이 구조를 증명해야 한다.
- 인물·사건 이름을 구체적으로 적는다 — 「한 기업가」가 아니라 그 이름으로.
- 영어는 한국어를 직역하지 않는다. 같은 구조 설명을 영어권 독자에게 자연스럽게 다시 쓴다.
- 한국인이 한국어로 쓴 글답게 주의해서 작성한다.

## 문체 금지

- 단골 문예 어휘를 쓰지 않는다 — 벼리다, 포개다, 빚어내다, 아로새기다, 결을 고르다, 숨결, 울림, 여정, 서사의 지평 같은 말.
- 설교나 교훈으로 끝내지 않는다.
- 감탄·과장 수식을 넣지 않는다. 세계를 놀랍게 말하는 게 아니라 정확하게 말한다.
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
  if (w < 100 || w > 220) bad.push(`영어 ${w}단어`)
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
