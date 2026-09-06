/**
 * 잘못 붙은 영문 카드 제거 — 한국어 책의 en 언어 카드가 같은 저작인지 가린다.
 * 옛 백필이 해설서·입문서에 원전의 영문 제목을 붙인 적이 있다. 그러면 영문 사이트에 해설서가 원전으로 뜨고
 * 위키데이터 대조가 해설서를 원전으로 잡는다. 모델에 "같은 저작인가"만 묻고, 다르면 en locale·판본을 뗀다.
 *
 * node --env-file=.env scripts/figure-books/en-locale-audit.mjs [--in <suspects.json>] [--backend opencode] [--concurrency 3]
 * node --env-file=.env scripts/figure-books/en-locale-audit.mjs --apply
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { argumentValue, dbClient, hasFlag } from './lib/figure-work.mjs'
import { parsePipeRow, research } from './lib/research.mjs'

const apply = hasFlag('apply')

function prompt(item) {
  return `아래 한국어 책과 영어 책이 같은 저작인지 판정한다. 같은 저작이란 한국어 책이 영어 책의 번역본이거나, 영어 책이 한국어 책의 영역본인 경우다.
다른 저자가 그 원전에 대해 쓴 해설서·입문서·강의록·독서 안내·비평서는 원전과 다른 저작이다. 제목이 비슷해도 저자가 다르면 의심한다.

한국어 책: 《${item.ko}》 — 저자 표기: ${item.koc ?? '(없음)'}
영어 책: "${item.en}" — 저자 표기: ${item.enc ?? '(없음)'}

한 줄로만 답한다. 형식: 판정|근거
판정은 같음·다름·모름 가운데 하나다. 근거는 한 문장이다.`
}

async function main() {
  const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/en-locale-suspects.json'))
  const outPath = resolve(dirname(inPath), 'en-locale-verdicts.jsonl')
  const backend = argumentValue('backend', 'opencode')
  const concurrency = Number(argumentValue('concurrency', '3'))
  const items = JSON.parse(readFileSync(inPath, 'utf8'))
  const done = new Map()
  if (existsSync(outPath)) for (const line of readFileSync(outPath, 'utf8').split('\n')) { if (line.trim()) { const row = JSON.parse(line); done.set(row.id, row) } }

  if (!apply) {
    const pending = items.filter((item) => !done.has(item.id))
    console.log(`후보 ${items.length} / 판정 완료 ${done.size} / 이번 ${pending.length} (${backend})`)
    let cursor = 0
    const worker = async () => {
      while (cursor < pending.length) {
        const item = pending[cursor]
        cursor += 1
        const text = await research(prompt(item), { backend, timeoutMs: 120000 })
        const cells = parsePipeRow(text, '판정')
        const verdict = cells?.[0]?.replace(/[^가-힣]/g, '') ?? ''
        const row = { ...item, verdict: ['같음', '다름', '모름'].includes(verdict) ? verdict : 'unparsed', reason: cells?.[1] ?? text.slice(0, 200) }
        appendFileSync(outPath, `${JSON.stringify(row)}\n`, 'utf8')
        console.log(`${row.verdict === '다름' ? '✂' : row.verdict === '같음' ? '=' : '?'} ${item.ko.slice(0, 30)} ⇄ ${item.en.slice(0, 30)} :: ${row.reason.slice(0, 60)}`)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker))
    console.log(`WROTE ${outPath}`)
    return
  }

  const db = dbClient()
  const targets = [...done.values()].filter((row) => row.verdict === '다름')
  console.log(`en 카드 뗄 작품 ${targets.length}`)
  let detached = 0
  for (const row of targets) {
    const { data: editions } = await db.from('figure_book_editions').select('id').eq('content_id', row.id).eq('locale', 'en')
    const editionIds = (editions ?? []).map((edition) => edition.id)
    if (editionIds.length > 0) {
      const { count } = await db.from('figure_book_products').select('id', { count: 'exact', head: true }).in('edition_id', editionIds).eq('is_active', true)
      if (count > 0) { console.log(`  건너뜀(활성 상품 있음) ${row.ko}`); continue }
      const { error } = await db.from('figure_book_editions').delete().in('id', editionIds)
      if (error) { console.log(`  판본 삭제 실패 ${row.id}: ${error.message}`); continue }
    }
    const { error } = await db.from('content_locales').delete().eq('content_id', row.id).eq('locale', 'en')
    if (error) { console.log(`  locale 삭제 실패 ${row.id}: ${error.message}`); continue }
    detached += 1
  }
  console.log(`en 카드 뗌 ${detached}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
