/**
 * 표시용 제목 행 전환 — 기본 dry-run, `--apply`로 반영.
 * 확인된 언어판이 없는 언어 카드를 지우지 않고 제목만 남긴다(celeb-02-02 「한국어판 확인」·「영문판과 표지」).
 * 입력 JSON 배열: [{ id, locale: 'ko'|'en', title?, mark: 'translated'|'romanized'|'original', create?: true }]
 * - 기존 행: title(주어지면) 갱신, isbn·publisher·thumbnail_url·affiliate_url을 비우고 verified=false,
 *   언어가 맞는 소개 본문은 보존한다. ISBN 기반 소개 출처는 먼저 본문으로 보존한 뒤 전환한다.
 *   sources={ primary:'none', title:mark }. 그 locale의 판본 행은 지운다. 대표 ISBN이 비운 ISBN이면 남은 카드 ISBN으로 바꾼다.
 * - create: 행이 없으면 제목만 든 표시용 행을 새로 만든다.
 * 원행은 data/celeb/figure-books/locale-display-title-backup.jsonl에 보관한다.
 *
 * node --env-file=.env scripts/figure-books/locale-display-title.mjs --plan <path> [--apply]
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argumentValue, bareIsbn, dbClient } from './lib/figure-work.mjs'
import { assertNoIntroductionLoss, preserveIntroduction } from './lib/preserve-introduction.mjs'

const APPLY = process.argv.includes('--apply')
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/locale-display-title-backup.jsonl')
// translated: 번역 제목 · romanized: 로마자 표기 · original: 통용 번역이 없어 원제를 그대로 둔 것(영어 원작 포함)
const MARKS = new Set(['translated', 'romanized', 'original'])

async function main() {
  const db = dbClient()
  const plan = JSON.parse(readFileSync(resolve(process.cwd(), argumentValue('plan', '')), 'utf8'))
  let nUpd = 0, nNew = 0
  const problems = []
  for (const p of plan) {
    if (!MARKS.has(p.mark) || !['ko', 'en'].includes(p.locale)) { problems.push(`SKIP bad-plan ${String(p.id).slice(0, 8)}`); continue }
    const { data: rows, error: rowError } = await db.from('content_locales').select('*').eq('content_id', p.id).eq('locale', p.locale)
    if (rowError) throw new Error(`locale read ${p.id}: ${rowError.message}`)
    const cur = rows?.[0]
    if (!cur && !p.create) { problems.push(`SKIP no-row ${p.id.slice(0, 8)} ${p.locale}`); continue }
    if (!cur && !String(p.title ?? '').trim()) { problems.push(`SKIP create-without-title ${p.id.slice(0, 8)}`); continue }
    const title = String(p.title ?? cur?.title ?? '').trim()
    const { data: eds, error: editionError } = cur ? await db.from('figure_book_editions').select('*').eq('content_id', p.id).eq('locale', p.locale) : { data: [] }
    if (editionError) throw new Error(`edition read ${p.id}: ${editionError.message}`)
    let row
    try {
      row = preserveIntroduction(cur, { title, isbn: null, publisher: null, thumbnail_url: null, description: null, affiliate_url: null, verified: false, sources: { primary: 'none', title: p.mark } }, p.locale)
      assertNoIntroductionLoss(eds, row)
    } catch (error) { problems.push(`SKIP introduction ${p.id.slice(0, 8)}: ${error.message}`); continue }
    let active = 0
    if ((eds ?? []).length) {
      const { count } = await db.from('figure_book_products').select('id', { count: 'exact', head: true }).in('edition_id', eds.map((e) => e.id)).eq('is_active', true)
      active = count ?? 0
    }
    if (active > 0) { problems.push(`SKIP active-products ${p.id.slice(0, 8)}`); continue }
    const renamed = cur && cur.title !== title ? ` | 이전 「${cur.title}」` : ''
    console.log(`  ${cur ? 'mark  ' : 'create'} ${p.id.slice(0, 8)} ${p.locale} ${p.mark.padEnd(10)} 「${title}」${renamed} | isbn ${cur?.isbn ?? 'null'} 판본 ${eds?.length ?? 0}`)
    if (!APPLY) { cur ? nUpd++ : nNew++; continue }

    const sources = row.sources
    if (cur) {
      appendFileSync(BACKUP, `${JSON.stringify({ at: new Date().toISOString(), content_id: p.id, locale: p.locale, row: cur, editions: eds ?? [] })}\n`, 'utf8')
      for (const e of eds ?? []) {
        const r = await db.from('figure_book_editions').delete().eq('id', e.id)
        if (r.error) throw new Error(`edition del ${p.id}: ${r.error.message}`)
      }
      const r = await db.from('content_locales')
        .update(row)
        .eq('content_id', p.id).eq('locale', p.locale).select('locale')
      if (r.error || (r.data ?? []).length !== 1) throw new Error(`update ${p.id}: ${r.error?.message}`)
      nUpd++
      if (cur.isbn) {
        const { data: c } = await db.from('contents').select('external_id').eq('id', p.id).single()
        if (c && bareIsbn(c.external_id) === bareIsbn(cur.isbn)) {
          const { data: rest } = await db.from('content_locales').select('isbn,sources').eq('content_id', p.id).not('isbn', 'is', null).limit(1)
          if (rest?.[0]?.isbn) await db.from('contents').update({ external_id: rest[0].isbn, external_source: rest[0].sources?.primary ?? 'kakao_book' }).eq('id', p.id)
        }
      }
    } else {
      const r = await db.from('content_locales').insert({ content_id: p.id, locale: p.locale, title, creator: p.creator ?? null, verified: false, sources }).select('locale')
      if (r.error) throw new Error(`insert ${p.id}: ${r.error.message}`)
      appendFileSync(BACKUP, `${JSON.stringify({ at: new Date().toISOString(), content_id: p.id, locale: p.locale, created: { title, mark: p.mark } })}\n`, 'utf8')
      nNew++
    }
  }
  console.log(`계획: 표식 전환 ${nUpd} / 신설 ${nNew}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
  for (const s of problems) console.log(`  ${s}`)
}

void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
