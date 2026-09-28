/**
 * faction-desc-v4/latin-inputs.json의 한국어 개요에서 라틴 문자(영어 표기)를 전부 걷어낸다.
 * agy(gemini flash high)가 표기만 한국어 관용으로 바꾸고 문장·정보·문단은 유지한다.
 * DB는 건드리지 않는다 — 산출물은 data/celeb/faction-desc-v4/out/에 슬러그별 JSON.
 *
 * 쿼터 소진 시 exit 3 — 계정 전환 후 같은 명령으로 이어 돈다.
 *
 * 실행 (sw/web-bo 에서): node scripts/faction/agy-strip-latin.mjs [--conc 3] [--list] [--only slug]
 */
import fs from 'node:fs'
import path from 'node:path'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const IN = path.resolve('../../data/celeb/faction-desc-v4/latin-inputs.json')
const OUT_DIR = path.resolve('../../data/celeb/faction-desc-v4/out')
const concIdx = process.argv.indexOf('--conc')
const CONC = concIdx > -1 ? Number(process.argv[concIdx + 1]) : 3
const LIST_ONLY = process.argv.includes('--list')
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null

const INPUTS = JSON.parse(fs.readFileSync(IN, 'utf8'))

function agyQuotaExhausted() {
  return false // agyCall 내부가 quota를 throw하면 main에서 메시지로 판별
}

function buildPrompt(row) {
  return `아래는 세력도감의 한국어 개요다. 이 글에 섞인 라틴 문자(영어·약어·모델명·고유명사)를 전부 걷어낸다.

## 규칙
- 문장 구조, 정보, 문단 수(3개), 분량을 그대로 유지한다. 고치는 것은 표기뿐이다.
- 한국어로 굳어진 번역이 있으면 번역한다: Blitzkrieg→전격전, capped-profit→유한 영리, Seal of Quality→품질 보증 마크.
- 번역보다 음역이 자연스러운 고유명사·브랜드·모델명은 음역한다: OpenAI→오픈에이아이, ChatGPT→챗지피티, K-pop→케이팝, H.O.T.→에이치오티, TSMC→티에스엠씨, MRI 없음.
- 약어는 한국어 발음으로: CIA→씨아이에이, AI→에이아이, DNA→디엔에이, NBA→엔비에이, FSD→에프에스디.
- 그리스어·라틴어 등 비영어도 한글로: Juego de Posición→후에고 데 포시시온, Ulus→울루스.
- 「한글(English)」처럼 괄호 안 영어 병기는 번역·음역이 앞 한글과 같아지면 괄호째로 없앤다. 유한 영리(캡트-프로핏)가 아니라 유한 영리로 쓴다.
- 숫자·연도는 아라비아 숫자 그대로 둔다. 문장부호 속 라틴 문자도 마찬가지로 변환한다.
- 결과에 [A-Za-z]가 한 글자도 남아 있으면 안 된다.
- 한국인이 한국어로 쓴 글 답게 주의해서 작성한다.

## 출력
JSON만 출력한다: {"description": "<변환된 전체 본문, 문단은 \\n\\n 구분>"}

## 입력 (${row.name})

${row.description}`
}

function validate(o, src) {
  const bad = []
  if (!o.description) bad.push('description 누락')
  else {
    if (/[A-Za-z]/.test(o.description)) bad.push('라틴 문자 잔존')
    const sp = src.description.split(/\n\s*\n/).length
    const op = o.description.split(/\n\s*\n/).filter((s) => s.trim()).length
    if (op !== sp) bad.push(`문단 수 ${op}≠${sp}`)
    const ratio = o.description.length / src.description.length
    if (ratio < 0.7 || ratio > 1.2) bad.push(`분량 ${(ratio * 100).toFixed(0)}%`)
  }
  return bad
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const todo = INPUTS
    .filter((r) => !ONLY || r.slug === ONLY)
    .filter((r) => !fs.existsSync(path.join(OUT_DIR, `${r.slug}.json`)))
  console.log(`대상 ${INPUTS.length}개 / 남은 것 ${todo.length}개`)
  if (LIST_ONLY || !todo.length) return

  let done = 0, failed = 0
  for (let i = 0; i < todo.length; i += CONC) {
    const results = await Promise.allSettled(todo.slice(i, i + CONC).map(async (row) => {
      const text = await agyCall(buildPrompt(row), { timeoutMs: 600_000 })
      const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
      const o = JSON.parse(body)
      const bad = validate(o, row)
      if (bad.length) {
        const fix = await agyCall(
          `${buildPrompt(row)}\n\n## 교정 지시\n\n직전 결과가 ${bad.join(', ')}로 규격을 어겼다. 규격에 맞게 다시 쓴다.`,
          { timeoutMs: 600_000 },
        )
        const body2 = fix.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
        const o2 = JSON.parse(body2)
        const bad2 = validate(o2, row)
        if (bad2.length) throw new Error(bad2.join(', '))
        return { row, o: o2 }
      }
      return { row, o }
    }))
    for (const [j, r] of results.entries()) {
      const row = todo[i + j]
      if (r.status === 'rejected') {
        const msg = String(r.reason?.message ?? r.reason)
        if (/quota|Individual quota/i.test(msg)) {
          console.error('QUOTA: Individual quota reached — 계정 전환 후 같은 명령으로 재개한다')
          process.exit(3)
        }
        failed++
        console.log(`FAIL ${row.name} — ${msg.slice(0, 200)}`)
        continue
      }
      const { o } = r.value
      fs.writeFileSync(path.join(OUT_DIR, `${row.slug}.json`),
        JSON.stringify({ slug: row.slug, name: row.name, description: o.description }, null, 2) + '\n', 'utf8')
      done++
      console.log(`OK   ${row.name} — ${row.description.length}자 → ${o.description.length}자`)
    }
  }
  console.log(`\n변환 ${done} / 실패 ${failed}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
