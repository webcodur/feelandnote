/**
 * 표시용 제목 계획 — 요청 locale 행이 없는 BOOK에 agy로 표시 제목을 받아 locale-display-title.mjs 입력 JSON을 만든다.
 * 대상: 반대 언어의 실제 판본 행(sources.primary≠'none')만 있는 작품. 표시용 행뿐인 작품은 건너뛴다.
 * 표식: en은 romanized(한국 원작)·original(영어 원작·통용 영어 제목 없음)·translated(통용 영어 제목), ko는 translated·original.
 *
 * node --env-file=.env scripts/contents/book-display-title-plan.mjs --target en|ko [--backend agy|muse] [--limit N] [--per-call 1] [--concurrency 1] [--priority <ids.json>]
 * 산출: data/celeb/book-display-titles/plan-<target>.json (누적, 재실행 시 있는 id 건너뜀), targets-<target>.json(대상 캐시), failures.jsonl
 * 반영: node --env-file=.env scripts/figure-books/locale-display-title.mjs --plan ../../data/celeb/book-display-titles/plan-<target>.json --apply
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { argumentValue, dbClient } from '../figure-books/lib/figure-work.mjs'
import { agyCall, looksQuotaLimited } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'
import { museCall } from '../../../../.agents/skills/opencode-muse/scripts/muse-call.mjs'

const DIR = resolve(process.cwd(), '../../data/celeb/book-display-titles')
const TARGET = argumentValue('target', '')
const LIMIT = Number(argumentValue('limit', '0'))
const PER_CALL = Math.max(1, Number(argumentValue('per-call', '1')))
const CONCURRENCY_ARG = Math.max(1, Number(argumentValue('concurrency', '1')))
const BACKEND = argumentValue('backend', 'agy') // agy | muse. muse 무료 라인은 혼자 돌려야 하므로 concurrency 1로 고정한다
if (!['agy', 'muse'].includes(BACKEND)) throw new Error('--backend agy|muse')
const PRIORITY = argumentValue('priority', '') // 먼저 처리할 content_id JSON 배열 파일(셀럽 감상 목록 도서)
const MARKS = new Set(['translated', 'romanized', 'original'])
if (!['ko', 'en'].includes(TARGET)) throw new Error('--target ko|en')
mkdirSync(DIR, { recursive: true })
const PLAN = resolve(DIR, `plan-${TARGET}.json`)
const FAIL = resolve(DIR, 'failures.jsonl')

/** agy는 쿼터 소진 시 오류 대신 내부 429 재시도로 타임아웃까지 매달린다. 최신 실행 로그로 판정한다. */
function agyQuotaExhausted() {
  try {
    const dir = resolve(homedir(), '.gemini/antigravity-cli/log')
    const latest = readdirSync(dir).filter((n) => n.endsWith('.log')).map((n) => ({ n, t: statSync(resolve(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t)[0]
    return !!latest && /Individual quota reached|RESOURCE_EXHAUSTED/.test(readFileSync(resolve(dir, latest.n), 'utf8').slice(-20000))
  } catch { return false }
}

/** 타임아웃이 이유 없는 무응답인지 가른다. 짧은 인사 프로브가 OK를 못 돌려주면 agy가 죽은 것이다. */
async function agyAlive() {
  try { const out = await agyCall('Reply with exactly: OK', { timeoutMs: 60_000 }); return /OK/.test(out) && !/print timeout/.test(out) } catch { return false }
}

async function loadTargets(db) {
  const cache = resolve(DIR, `targets-${TARGET}.json`)
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'))
  const source = TARGET === 'en' ? 'ko' : 'en'
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('contents').select('id,content_locales(locale,title,creator,isbn,sources)')
      .eq('type', 'BOOK').order('id').range(from, from + 999)
    if (error) throw error
    for (const c of data) {
      const locs = c.content_locales ?? []
      if (locs.some((l) => l.locale === TARGET)) continue
      const src = locs.find((l) => l.locale === source)
      if (!src || src.sources?.primary === 'none' || !String(src.title ?? '').trim()) continue
      out.push({ id: c.id, title: src.title, creator: src.creator, isbn: src.isbn })
    }
    if (data.length < 1000) break
  }
  writeFileSync(cache, JSON.stringify(out), 'utf8')
  return out
}

function prompt(items) {
  const rules = TARGET === 'en'
    ? `Target language: English. For each book decide:
(1) Korean-origin work (Korean author, Korean-language title): give the Revised Romanization of the Korean title following National Institute of Korean Language rules, word-spaced, first letter capitalized (e.g. 홍길동전 → "Hong Gildong jeon"; 채식주의자 → "Chaesikjuuija"). kind = "romanized".
(2) Work originally written in English: give its original English title exactly. kind = "original".
(3) Any other origin: if a commonly used English title exists (e.g. 이방인 by Albert Camus → "The Stranger"), give it, kind = "translated"; otherwise give the original-language title, kind = "original".`
    : `Target language: Korean. For each book give a natural Korean rendering of the title. If a Korean edition title is widely established, use that. kind = "translated". If the title is only a proper name that is not translated in Korean usage, give it as-is, kind = "original". kind must be "translated" or "original" only.`
  return `You render book titles for display in a bilingual reading catalog. Do not use any tools, file access, or web search; answer immediately from your own knowledge. Never invent subtitles, series names, or authors. Keep proper nouns accurate.
${rules}
Output ONLY a JSON array in the same order, one object per item: {"id": "<id>", "display": "<title>", "kind": "romanized"|"translated"|"original"}. No prose, no code fence.
Items:
${JSON.stringify(items.map((t) => ({ id: t.id, title: t.title, creator: t.creator })))}`
}

function parse(text, items) {
  const start = text.indexOf('['), end = text.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('JSON 배열 없음')
  const arr = JSON.parse(text.slice(start, end + 1))
  if (!Array.isArray(arr) || arr.length !== items.length) throw new Error(`항목 수 불일치 ${arr.length}/${items.length}`)
  return arr.map((r, i) => {
    if (r.id !== items[i].id || !MARKS.has(r.kind) || !String(r.display ?? '').trim()) throw new Error(`항목 ${i} 형식 오류: ${JSON.stringify(r).slice(0, 120)}`)
    // ko 표시 제목은 translated·original만 허용한다(celeb-02-02). 음차를 romanized로 답하면 translated로 본다.
    const mark = TARGET === 'ko' && r.kind === 'romanized' ? 'translated' : r.kind
    return { id: r.id, locale: TARGET, title: String(r.display).trim(), mark, create: true, creator: items[i].creator ?? null, source_title: items[i].title }
  })
}

async function main() {
  const db = dbClient()
  const targets = await loadTargets(db)
  const plan = existsSync(PLAN) ? JSON.parse(readFileSync(PLAN, 'utf8')) : []
  const done = new Set(plan.map((p) => p.id))
  let queue = targets.filter((t) => !done.has(t.id))
  if (PRIORITY) { const first = new Set(JSON.parse(readFileSync(resolve(process.cwd(), PRIORITY), 'utf8'))); queue.sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id))) }
  if (LIMIT > 0) queue = queue.slice(0, LIMIT)
  const CONCURRENCY = BACKEND === 'muse' ? 1 : CONCURRENCY_ARG
  console.log(`대상 ${targets.length} / 계획 완료 ${done.size} / 이번 ${queue.length} (backend ${BACKEND}, per-call ${PER_CALL}, concurrency ${CONCURRENCY})`)
  const chunks = []
  for (let i = 0; i < queue.length; i += PER_CALL) chunks.push(queue.slice(i, i + PER_CALL))
  let ok = 0, fail = 0, stop = false, halted = false
  const save = () => writeFileSync(PLAN, JSON.stringify(plan, null, 1), 'utf8')
  const worker = async () => {
    for (;;) {
      const chunk = chunks.shift()
      if (!chunk || stop) return
      const t0 = Date.now()
      try {
        const text = BACKEND === 'muse'
          ? await museCall(prompt(chunk), { timeoutMs: 300_000 }).then((r) => { if (!r.text?.trim()) throw new Error('muse 빈 출력'); return r.text })
          : await agyCall(prompt(chunk), { timeoutMs: 300_000 })
        for (const row of parse(text, chunk)) { plan.push(row); ok++ }
        save(); fail = 0
        console.log(`ok ${chunk.map((c) => c.id.slice(0, 8)).join(',')} ${((Date.now() - t0) / 1000).toFixed(0)}s`)
      } catch (error) {
        if (BACKEND === 'agy' && (looksQuotaLimited(error.message) || agyQuotaExhausted())) {
          console.log(`QUOTA ${new Date().toISOString()} 쿼터 소진 — 즉시 중단. 계정 교체 뒤 같은 명령으로 이어 돌린다`)
          chunks.unshift(chunk); stop = true; halted = true; return
        }
        if (BACKEND === 'agy' && /시간 초과/.test(error.message) && !(await agyAlive())) {
          console.log(`DEAD ${new Date().toISOString()} agy 무응답(hi 프로브 실패) — 즉시 중단. 원인 확인 뒤 같은 명령으로 이어 돌린다`)
          chunks.unshift(chunk); stop = true; halted = true; return
        }
        fail++
        appendFileSync(FAIL, `${JSON.stringify({ at: new Date().toISOString(), target: TARGET, ids: chunk.map((c) => c.id), error: String(error.message).slice(0, 300) })}\n`, 'utf8')
        console.log(`FAIL ${chunk.map((c) => c.id.slice(0, 8)).join(',')}: ${String(error.message).slice(0, 120)}`)
        if (fail >= 5) { stop = true; halted = true; console.log(`중단: 연속 실패 5회${BACKEND === 'muse' ? ' — 무료 라인 소진 가능성. `node .agents/skills/opencode-muse/scripts/muse-call.mjs "3 곱하기 7은?"`로 라인부터 확인' : ''}`) }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`완료 ok ${ok} / fail ${fail} / 계획 누적 ${plan.length} → ${PLAN}`)
  if (halted) process.exit(3) // 쿼터·무응답 중단: 호출한 셸이 다음 대상으로 넘어가지 않게 구분한다
}
main().catch((e) => { console.error(e); process.exit(1) })
