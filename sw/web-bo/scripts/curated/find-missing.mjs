/**
 * 서점 검색으로 못 찾은 책을 LLM(codex)에게 직접 찾게 한다
 *
 * 왜 필요한가 — 카카오 책 검색은 문자열이 맞아야 걸린다. 그래서 세 부류가 통째로 샌다.
 *   1) 도서관이 두 작품을 한 항목에 묶은 표기(「등대로, 자기만의 방」) — 그런 책은 없다
 *   2) 음역·표기 차이(「일리야드」/「일리아드」, 「프로이트」/「프로이드」)
 *   3) 원제만 알고 국내 출간명을 모르는 것
 * 앞 단계(`titles.mjs`)는 한국어 제목까지만 물었다. 여기서는 **ISBN**을 묻는다.
 * ISBN이 있으면 카카오를 문자열이 아니라 번호로 조회할 수 있어 표기 차이가 사라진다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/curated/find-missing.mjs --dump           # 대상 추출만
 *   node scripts/curated/find-missing.mjs --ask --limit 3  # 배치 3개만
 *   node scripts/curated/find-missing.mjs --ask            # 남은 전량 (codex)
 *   node scripts/curated/find-missing.mjs --ask --agy      # agy(제미니)로 — codex 한도에 막혔을 때
 *
 * 재실행 안전 — 이미 답을 받은 항목은 건너뛴다. rate limit에 막혀도 같은 명령으로 이어붙인다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { codexCall } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'
// codex는 종량 한도가 있어 자주 막힌다(26.09.03 소진, 5일 뒤 회복). agy는 로그인 기반이라 한도가 없다.
try { var { agyCall } = await import('../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs') } catch { var agyCall = null }

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../../..')
const WORK = join(ROOT, 'data/curated-lists/_korean-titles')
const MISSING = join(WORK, 'missing-targets.json')
const FOUND = join(WORK, 'missing-answers.json')
const BATCH = 15
const CONCURRENCY = 3

function loadEnv(p) {
  if (!existsSync(p)) return
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL,
  process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY,
)

/** 아직 한국어 책이 안 붙은 항목을 모은다 */
async function dump() {
  mkdirSync(WORK, { recursive: true })
  const targets = JSON.parse(readFileSync(join(WORK, 'targets.json'), 'utf-8'))
  const answers = JSON.parse(readFileSync(join(WORK, 'answers.json'), 'utf-8'))

  // 목록 항목이 지금 무엇을 가리키는지 다시 읽는다(앞 단계가 방금 이어 붙였을 수 있다)
  const ids = targets.map((t) => t.id)
  const live = new Map()
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from('curated_list_items').select('id,content_id').in('id', ids.slice(i, i + 300))
    if (error) throw error
    for (const r of data) live.set(r.id, r.content_id)
  }
  const linkedIds = [...new Set([...live.values()].filter(Boolean))]
  const koHave = new Set()
  for (let i = 0; i < linkedIds.length; i += 300) {
    const { data } = await db.from('content_locales').select('content_id').eq('locale', 'ko').in('content_id', linkedIds.slice(i, i + 300))
    for (const r of data ?? []) koHave.add(r.content_id)
  }

  const out = targets
    .filter((t) => {
      const cid = live.get(t.id)
      return !cid || !koHave.has(cid)      // 아직 한국어 책이 없다
    })
    .map((t) => {
      const a = answers[t.id] ?? {}
      return {
        id: t.id,
        listSlug: t.listSlug,
        contentType: t.contentType,
        rawTitle: t.rawTitle,
        rawCreator: t.rawCreator,
        koTitle: a.koTitle ?? null,
        koCreator: a.koCreator ?? null,
      }
    })
    .filter((t) => t.contentType === 'BOOK')   // 영화·음악은 이 경로로 등록하지 않는다

  writeFileSync(MISSING, JSON.stringify(out, null, 1), 'utf-8')
  console.log(`한국어 책이 아직 없는 도서 항목 ${out.length}건 → ${MISSING}`)
  return out
}

function buildPrompt(batch) {
  const lines = batch
    .map((b, i) => `${i + 1}. 원문표기: ${b.rawTitle}${b.rawCreator ? ` / ${b.rawCreator}` : ''}${b.koTitle ? `  (추정 국내명: ${b.koTitle})` : ''}`)
    .join('\n')
  return `아래는 대학 도서관·문학상 목록의 도서 항목이다. 각 항목이 한국에 정식 출간된 적이 있는지 확인하고, 있으면 그 책의 ISBN을 알려 달라.

주의할 점.
- 도서관 표기는 두 작품을 한 항목에 묶어 두기도 한다("등대로, 자기만의 방"). 그럴 때는 첫 번째 작품 기준으로 답한다.
- 판본 표기(/ 4th ed, 개정판), 부제(: 뒤), 로마자 도치 저자명(Kuhn, Thomas S)은 무시하고 작품 자체를 본다.
- 번역서라면 국내 출간명으로 답한다. 원제 그대로 나온 책이면 그 제목으로 답한다.
- **한국에 출간된 적이 없으면 억지로 비슷한 책을 대지 말고 published 를 false 로 답한다.** 없는 것을 있다고 하면 엉뚱한 책이 서비스에 등록된다.
- ISBN은 13자리를 우선하고, 확실하지 않으면 isbn 을 null 로 두되 title/publisher 는 채운다.

각 항목마다 한 줄씩, 아래 JSON 형식만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.
{"n":1,"published":true,"title":"국내 출간명","author":"저자","publisher":"출판사","isbn":"9788934972464"}
{"n":2,"published":false}

항목:
${lines}`
}

function parseAnswer(text, batch) {
  const out = []
  for (const line of String(text).split('\n')) {
    const t = line.trim().replace(/^```\w*$/, '')
    if (!t.startsWith('{')) continue
    let o
    try { o = JSON.parse(t) } catch { continue }
    const b = batch[Number(o.n) - 1]
    if (!b) continue
    out.push({
      id: b.id,
      rawTitle: b.rawTitle,
      published: o.published === true,
      title: o.title ?? null,
      author: o.author ?? null,
      publisher: o.publisher ?? null,
      isbn: o.isbn ? String(o.isbn).replace(/[^0-9Xx]/g, '') : null,
    })
  }
  return out
}

async function ask(limitBatches) {
  if (!existsSync(MISSING)) await dump()
  const targets = JSON.parse(readFileSync(MISSING, 'utf-8'))
  const answers = existsSync(FOUND) ? JSON.parse(readFileSync(FOUND, 'utf-8')) : {}
  const todo = targets.filter((t) => !answers[t.id])
  console.log(`전체 ${targets.length} / 남은 ${todo.length}`)
  if (!todo.length) return

  const batches = []
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
  const run = limitBatches ? batches.slice(0, limitBatches) : batches

  let ok = 0, fail = 0
  async function work(batch, label) {
    try {
      const text = USE_AGY ? await agyCall(buildPrompt(batch), { timeoutMs: 900000 }) : await codexCall(buildPrompt(batch), { timeoutMs: 420000 })
      const rows = parseAnswer(text, batch)
      for (const r of rows) answers[r.id] = r
      writeFileSync(FOUND, JSON.stringify(answers, null, 1), 'utf-8')
      ok++
      console.log(`  ${label} ${rows.length}/${batch.length}건 수신 (누적 ${Object.keys(answers).length})`)
    } catch (e) {
      fail++
      console.log(`  ${label} 실패: ${String(e).slice(0, 400)}`)
    }
  }
  for (let i = 0; i < run.length; i += CONCURRENCY) {
    const slice = run.slice(i, i + CONCURRENCY)
    await Promise.all(slice.map((b, j) => work(b, `[${i + j + 1}/${run.length}]`)))
  }
  const all = Object.values(answers)
  console.log(`완료 — 배치 성공 ${ok} / 실패 ${fail}`)
  console.log(`  국내 출간 확인 ${all.filter((a) => a.published).length}건 · ISBN 확보 ${all.filter((a) => a.isbn).length}건 · 미출간 판정 ${all.filter((a) => !a.published).length}건`)
}

const args = process.argv.slice(2)
const USE_AGY = args.includes('--agy')   // codex 한도에 막혔을 때
const li = args.indexOf('--limit')
const limit = li >= 0 ? Number(args[li + 1]) : 0
if (args.includes('--dump')) await dump()
else if (args.includes('--ask')) await ask(limit)
else console.log('사용법: --dump | --ask [--limit N]')
