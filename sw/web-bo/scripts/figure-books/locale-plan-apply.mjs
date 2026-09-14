/**
 * 언어 카드 교정 범용 적용기 — 계획 JSON을 받아 실행한다. 기본 dry-run, `--apply`로 반영.
 * 계획 형식: { "koFix": {prefix: isbn}, "koDel": [prefix], "enFix": {prefix: isbn} }
 * - koFix: 카카오 확정 ISBN으로 카드·판본·대표 ISBN 교체 (동일 ISBN 정렬 포함)
 * - koDel: 활성 상품 확인 → 원행 백업 → 판본·카드 삭제 → 대표는 eng 확인된 en ISBN으로
 * - enFix: OL eng 확정 ISBN으로 카드·판본 교체
 *
 * node --env-file=.env scripts/figure-books/locale-plan-apply.mjs --plan <plan.json> [--apply]
 */
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { bareIsbn, dbClient, kakaoByIsbn, openLibraryByIsbn } from './lib/figure-work.mjs'
import { assertNoIntroductionLoss, preserveIntroduction } from './lib/preserve-introduction.mjs'

// 소개 조회가 실패해도 기존 본문·출처는 보존한다. 옛 ISBN 출처를 새 ISBN에 옮기지는 않는다.
const introductionModule = await import('@feelandnote/content-search/book-introduction')
const { fetchBookIntroduction } = introductionModule.default ?? introductionModule
// ISBN이 바뀐 행은 한 로그에 모은다. 소개 출처 재해결이 이 로그를 읽는다.
const CHANGE_LOG = resolve(process.cwd(), '../../data/celeb/figure-books/locale-restore-log.jsonl')

const APPLY = process.argv.includes('--apply')
const planPath = resolve(process.cwd(), (process.argv.find((a) => a === '--plan') && process.argv[process.argv.indexOf('--plan') + 1]) || '')
if (!planPath) throw new Error('--plan <plan.json> 필요')
const PLAN = JSON.parse(readFileSync(planPath, 'utf8'))
const BACKUP = resolve(process.cwd(), PLAN.backup ?? '../../data/celeb/figure-books/locale-plan-deleted-backup.jsonl')

const isEngIsbn = (v) => /^(9780|9781|9798)/.test(bareIsbn(v ?? ''))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const normTitle = (t) => String(t ?? '').replace(/\s*\([^)]+\)\s*$/, '').trim()

function coverOf(doc) {
  if (!doc.thumbnail) return null
  try {
    const fname = new URL(doc.thumbnail).searchParams.get('fname')
    if (!fname) return doc.thumbnail
    const o = new URL(fname); o.protocol = 'https:'; return o.toString()
  } catch { return doc.thumbnail }
}

async function main() {
  const db = dbClient()
  const idOf = async (prefix) => {
    const { data } = await db.from('contents').select('id').ilike('id', `${prefix}%`).limit(1)
    return data?.[0]?.id ?? null
  }
  const ensureCatalog = async (id) => {
    const { data } = await db.from('figure_book_contents').select('content_id').eq('content_id', id).limit(1)
    if ((data ?? []).length === 0) await db.from('figure_book_contents').insert({ content_id: id })
  }
  const one = async (rows) => (rows ?? []).length
  const prepareReplacement = async (id, locale, row) => {
    const { data, error } = await db.from('content_locales').select('isbn,description,sources').eq('content_id', id).eq('locale', locale).single()
    if (error) throw new Error(`locale read ${id}: ${error.message}`)
    const retained = preserveIntroduction(data, row, locale)
    const { data: editions, error: editionError } = await db.from('figure_book_editions').select('isbn,description,sources').eq('content_id', id).eq('locale', locale)
    if (editionError) throw new Error(`edition read ${id}: ${editionError.message}`)
    // A failed lookup must not erase introduction text present only on the old edition.
    if (!row.description) assertNoIntroductionLoss((editions ?? []).filter((e) => bareIsbn(e.isbn) === bareIsbn(data.isbn)), retained)
    return { row: retained, oldIsbn: data.isbn ?? null }
  }
  let okKo = 0, okEn = 0, okDel = 0
  const problems = []

  for (const [prefix, isbn] of Object.entries(PLAN.koFix ?? {})) {
    const id = await idOf(prefix)
    const doc = await kakaoByIsbn(isbn).catch(() => null)
    if (!id || !doc) { problems.push(`koFix SKIP ${prefix}`); continue }
    const intro = await fetchBookIntroduction({ isbn, locale: 'ko' })
    const cover = coverOf(doc)
    let row = {
      title: normTitle(doc.title), creator: (doc.authors ?? []).join(', '),
      publisher: doc.publisher, isbn, thumbnail_url: cover, description: intro.source ?? null,
      sources: { primary: 'kakao_book', thumbnail: cover ? 'kakao_book' : 'confirmed_unavailable', ...(intro.source && intro.sourceUrl ? { description: intro.sourceUrl } : {}) },
    }
    const release = String(doc.datetime ?? '').slice(0, 10) || null
    let oldIsbn
    try { ({ row, oldIsbn } = await prepareReplacement(id, 'ko', row)) }
    catch (error) { problems.push(`koFix SKIP ${prefix}: ${error.message}`); continue }
    if (APPLY) {
      await ensureCatalog(id)
      const r1 = await db.from('content_locales').update(row).eq('content_id', id).eq('locale', 'ko').select('isbn')
      if (await one(r1.data) !== 1) throw new Error(`ko locale mismatch ${prefix}`)
      const up = db.from('figure_book_editions').update({ ...row, release_date: release }).eq('content_id', id).eq('locale', 'ko')
      const r2 = await (oldIsbn ? up.eq('isbn', oldIsbn) : up.is('isbn', null)).select('id')
      if ((r2.data ?? []).length === 0) {
        const ri = await db.from('figure_book_editions').insert({ content_id: id, locale: 'ko', ...row, release_date: release, sort_order: 0, verified: true }).select('id')
        if (ri.error) throw new Error(`ko edition insert fail ${prefix}: ${ri.error.message}`)
      }
      await db.from('contents').update({ external_id: isbn, external_source: 'kakao_book' }).eq('id', id)
      appendFileSync(CHANGE_LOG, `${JSON.stringify({ at: new Date().toISOString(), op: 'koFix', content_id: id, locale: 'ko', oldIsbn, row, release })}\n`, 'utf8')
      console.log(`  ko-fix ${prefix} → ${isbn}`)
    }
    okKo += 1
    await sleep(250)
  }

  for (const [prefix, isbn] of Object.entries(PLAN.enFix ?? {})) {
    const id = await idOf(prefix)
    const o = await openLibraryByIsbn(isbn).catch(() => null)
    const engOk = o && (o.languages.includes('/languages/eng')
      || (o.languages.length === 0 && /^(9780|9781|9798)/.test(bareIsbn(isbn))))
    if (!id || !engOk) { problems.push(`enFix SKIP ${prefix}`); continue }
    const intro = await fetchBookIntroduction({ isbn, locale: 'en' })
    let row = {
      title: o.title, creator: o.authors.join(', '), publisher: o.publisher, isbn,
      thumbnail_url: o.thumbnailUrl ?? null, description: intro.source ?? null,
      sources: { primary: 'openlibrary', thumbnail: o.thumbnailUrl ? 'openlibrary' : 'confirmed_unavailable', ...(intro.source && intro.sourceUrl ? { description: intro.sourceUrl } : {}) },
    }
    let oldIsbn
    try { ({ row, oldIsbn } = await prepareReplacement(id, 'en', row)) }
    catch (error) { problems.push(`enFix SKIP ${prefix}: ${error.message}`); continue }
    if (APPLY) {
      await ensureCatalog(id)
      let q = db.from('content_locales').update(row).eq('content_id', id).eq('locale', 'en')
      const r1 = await (oldIsbn ? q.eq('isbn', oldIsbn) : q.is('isbn', null)).select('isbn')
      if (await one(r1.data) !== 1) throw new Error(`en locale mismatch ${prefix}`)
      let q2 = db.from('figure_book_editions').update(row).eq('content_id', id).eq('locale', 'en')
      const r2 = await (oldIsbn ? q2.eq('isbn', oldIsbn) : q2.is('isbn', null)).select('id')
      if ((r2.data ?? []).length === 0) {
        const ri = await db.from('figure_book_editions').insert({ content_id: id, locale: 'en', ...row, sort_order: 0, verified: true }).select('id')
        if (ri.error) throw new Error(`en edition insert fail ${prefix}: ${ri.error.message}`)
      }
      appendFileSync(CHANGE_LOG, `${JSON.stringify({ at: new Date().toISOString(), op: 'enFix', content_id: id, locale: 'en', oldIsbn, row })}\n`, 'utf8')
      console.log(`  en-fix ${prefix} → ${isbn}`)
    }
    okEn += 1
    await sleep(200)
  }

  for (const prefix of PLAN.koDel ?? []) {
    const id = await idOf(prefix)
    if (!id) { problems.push(`koDel SKIP ${prefix}`); continue }
    const { data: eds, error: editionError } = await db.from('figure_book_editions').select('*').eq('content_id', id).eq('locale', 'ko')
    if (editionError) throw new Error(`edition read ${id}: ${editionError.message}`)
    const edIds = (eds ?? []).map((e) => e.id)
    let active = 0
    if (edIds.length > 0) {
      const { count } = await db.from('figure_book_products').select('id', { count: 'exact', head: true }).in('edition_id', edIds).eq('is_active', true)
      active = count ?? 0
    }
    if (active > 0) { problems.push(`koDel SKIP active-products ${prefix}`); continue }
    const { data: loc, error: localeError } = await db.from('content_locales').select('*').eq('content_id', id).eq('locale', 'ko')
    if (localeError) throw new Error(`locale read ${id}: ${localeError.message}`)
    try { assertNoIntroductionLoss([...(loc ?? []), ...(eds ?? [])]) }
    catch (error) { problems.push(`koDel SKIP ${prefix}: ${error.message}`); continue }
    const { data: others } = await db.from('content_locales').select('locale,isbn').eq('content_id', id).neq('locale', 'ko')
    // ko를 지우면 카드가 0장이 되는 작품은 지우지 않는다. 화면에서 사라지고 대표 ISBN도 갈 곳이 없다.
    if (!(others ?? []).length) { problems.push(`koDel SKIP would-empty ${prefix}`); continue }
    const enIsbn = (others ?? []).find((r) => r.locale === 'en')?.isbn ?? null
    if (APPLY) {
      mkdirSync(dirname(BACKUP), { recursive: true })
      appendFileSync(BACKUP, `${JSON.stringify({ content_id: id, deleted_at: new Date().toISOString(), ko: loc?.[0] ?? null, editions: eds ?? [] })}\n`, 'utf8')
      for (const e of eds ?? []) await db.from('figure_book_editions').delete().eq('id', e.id)
      const r = await db.from('content_locales').delete().eq('content_id', id).eq('locale', 'ko').select('locale')
      if (await one(r.data) === 0) { problems.push(`koDel SKIP already-gone ${prefix}`); continue }
      if (await one(r.data) !== 1) throw new Error(`ko del mismatch ${prefix}`)
      if (enIsbn && isEngIsbn(enIsbn)) await db.from('contents').update({ external_id: enIsbn, external_source: 'openlibrary' }).eq('id', id)
      console.log(`  ko-del ${prefix}`)
    }
    okDel += 1
  }

  console.log(`계획: ko 교체 ${okKo} / en 교체 ${okEn} / ko 삭제 ${okDel}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
  for (const p of problems) console.log(`  ${p}`)
}

void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
