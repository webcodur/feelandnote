/**
 * 표시용 제목 행 전환 — 기본 dry-run, `--apply`로 반영.
 * 확인된 언어판이 없는 언어 카드를 지우지 않고 제목만 남긴다(celeb-02-02 「한국어판 확인」·「영문판과 표지」).
 * 입력 JSON 배열: [{ id, locale: 'ko'|'en', title?, mark: 'translated'|'romanized'|'original', create?: true }]
 * - 기존 행: title(주어지면) 갱신, isbn·publisher·thumbnail_url·affiliate_url을 비우고 verified=false,
 *   언어가 맞는 소개 본문은 보존한다. ISBN 기반 소개 출처는 먼저 본문으로 보존한 뒤 전환한다.
 *   sources={ primary:'none', title:mark }. 기존 판본·상품·대표 ISBN은 바꾸지 않는다.
 *   잘못 붙은 특정 판본의 이동·삭제는 이 카드 전환과 별도로 실제 판본을 검수한 뒤 처리한다.
 * - create: 행이 없으면 제목만 든 표시용 행을 새로 만든다.
 * 원행은 data/celeb/figure-books/locale-display-title-backup.jsonl에 보관한다.
 *
 * node --env-file=.env scripts/figure-books/locale-display-title.mjs --plan <path> [--apply]
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { argumentValue, dbClient } from './lib/figure-work.mjs'
import { preserveIntroduction } from './lib/preserve-introduction.mjs'

const APPLY = process.argv.includes('--apply')
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/locale-display-title-backup.jsonl')
// translated: 번역 제목 · romanized: 로마자 표기 · original: 통용 번역이 없어 원제를 그대로 둔 것(영어 원작 포함)
const MARKS = new Set(['translated', 'romanized', 'original'])

const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

export async function transitionDisplayTitle(db, p, { apply = false, backup = (record) => appendFileSync(BACKUP, `${JSON.stringify(record)}\n`, 'utf8') } = {}) {
  if (!MARKS.has(p.mark) || !['ko', 'en'].includes(p.locale) || !String(p.id ?? '').trim()) return { skip: 'bad-plan' }
  const { data: rows, error: rowError } = await db.from('content_locales').select('*').eq('content_id', p.id).eq('locale', p.locale)
  if (rowError) throw new Error(`locale read ${p.id}: ${rowError.message}`)
  if ((rows ?? []).length > 1) throw new Error(`duplicate locale ${p.id} ${p.locale}`)
  const cur = rows?.[0]
  if (!cur && !p.create) return { skip: 'no-row' }
  const title = String(p.title ?? cur?.title ?? '').trim()
  if (!title) return { skip: 'without-title' }
  const { data: eds, error: editionError } = await db.from('figure_book_editions').select('*').eq('content_id', p.id).eq('locale', p.locale)
  if (editionError) throw new Error(`edition read ${p.id}: ${editionError.message}`)
  let row
  try {
    row = preserveIntroduction(cur, { title, isbn: null, publisher: null, thumbnail_url: null, description: null, affiliate_url: null, verified: false, sources: { primary: 'none', title: p.mark } }, p.locale)
  } catch (error) { return { skip: 'introduction', message: error.message } }
  const result = { created: !cur, title, previousTitle: cur?.title, previousIsbn: cur?.isbn, retainedEditions: eds?.length ?? 0 }
  if (!apply) return result
  // 카드 전환은 판본·상품을 지우지 않는다. 활성/비활성 상품과 판본별 소개도 그대로 보존된다.
  // 대표 구판 ISBN이 현재 카드 ISBN과 달라도 같은 저작의 실판본이면 유효하다.
  await backup({ at: new Date().toISOString(), content_id: p.id, locale: p.locale, row: cur ?? null, editions: eds ?? [], ...(!cur ? { created: { title, mark: p.mark } } : {}) })
  if (cur) {
    let update = db.from('content_locales').update(row).eq('content_id', p.id).eq('locale', p.locale)
    if (cur.updated_at) update = update.eq('updated_at', cur.updated_at)
    const r = await update.select('locale')
    if (r.error || (r.data ?? []).length !== 1) throw new Error(`update ${p.id}: ${r.error?.message ?? 'row changed since inspection'}`)
  } else {
    row = { content_id: p.id, locale: p.locale, ...row, creator: p.creator ?? null }
    const r = await db.from('content_locales').insert(row).select('locale')
    if (r.error || (r.data ?? []).length !== 1) throw new Error(`insert ${p.id}: ${r.error?.message ?? 'row count mismatch'}`)
  }
  const after = await db.from('content_locales').select('*').eq('content_id', p.id).eq('locale', p.locale)
  if (after.error || (after.data ?? []).length !== 1 || Object.entries(row).some(([key, value]) => !same(value, after.data[0][key]))) {
    throw new Error(`verification ${p.id} ${p.locale}: ${after.error?.message ?? 'saved row differs'}`)
  }
  return result
}

async function main() {
  const db = dbClient()
  const plan = JSON.parse(readFileSync(resolve(process.cwd(), argumentValue('plan', '')), 'utf8'))
  let nUpd = 0, nNew = 0
  const problems = []
  for (const p of plan) {
    const result = await transitionDisplayTitle(db, p, { apply: APPLY })
    if (result.skip) { problems.push(`SKIP ${result.skip} ${String(p.id).slice(0, 8)}: ${result.message ?? p.locale}`); continue }
    const renamed = result.previousTitle && result.previousTitle !== result.title ? ` | 이전 「${result.previousTitle}」` : ''
    console.log(`  ${result.created ? 'create' : 'mark  '} ${p.id.slice(0, 8)} ${p.locale} ${p.mark.padEnd(10)} 「${result.title}」${renamed} | isbn ${result.previousIsbn ?? 'null'} 판본 ${result.retainedEditions}개 보존`)
    result.created ? nNew++ : nUpd++
  }
  console.log(`계획: 표식 전환 ${nUpd} / 신설 ${nNew}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
  for (const s of problems) console.log(`  ${s}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
}
