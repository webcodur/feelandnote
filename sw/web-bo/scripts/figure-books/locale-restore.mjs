/**
 * 언어 카드 복구 — 기본 dry-run, `--apply`로 반영.
 * - ko 복구: 전역 큐가 지운 ko 카드 중 카카오 ISBN 역조회로 제목이 확인된 것을 카카오 현재값으로 다시 만든다.
 * - en 신설: 관계는 있는데 카드가 0장인 작품에 대표 ISBN(영어권)으로 OL eng 판본을 확인해 en 카드를 만든다.
 * - ko 신설: 대표 ISBN이 한국 ISBN인 카드 0장 작품에 카카오 ISBN 조회로 ko 카드를 만든다.
 * 입력: --recheck <recheck.json> (titleMatch=true만 복구) --en <prefix,…> --ko-isbn <prefix:isbn,…>
 * 기록: data/celeb/figure-books/locale-restore-log.jsonl
 *
 * node --env-file=.env scripts/figure-books/locale-restore.mjs --recheck <path> [--en a,b] [--ko-isbn a:isbn] [--apply]
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argumentValue, bareIsbn, dbClient, kakaoByIsbn, openLibraryByIsbn, openLibrarySearch, sleep } from './lib/figure-work.mjs'

// 소개 표식·주소는 공유 함수가 실제 소개를 받은 뒤 정한다. source가 null이면 description은 NULL이다.
const introductionModule = await import('@feelandnote/content-search/book-introduction')
const { fetchBookIntroduction } = introductionModule.default ?? introductionModule

const APPLY = process.argv.includes('--apply')
const LOG = resolve(process.cwd(), '../../data/celeb/figure-books/locale-restore-log.jsonl')
const isEngIsbn = (v) => /^(9780|9781|9798)/.test(bareIsbn(v ?? ''))
const isKrIsbn = (v) => /^(97889|9791)/.test(bareIsbn(v ?? ''))
const normTitle = (t) => String(t ?? '').replace(/\s*\([^)]+\)\s*$/, '').trim()

function coverOf(doc) {
  if (!doc.thumbnail) return null
  try {
    const f = new URL(doc.thumbnail).searchParams.get('fname')
    if (!f) return doc.thumbnail
    const o = new URL(f); o.protocol = 'https:'; return o.toString()
  } catch { return doc.thumbnail }
}

async function koRowFromKakao(isbn) {
  const doc = await kakaoByIsbn(isbn)
  if (!doc || !String(doc.isbn ?? '').split(' ').map(bareIsbn).includes(bareIsbn(isbn))) return null
  const intro = await fetchBookIntroduction({ isbn, locale: 'ko' })
  const cover = coverOf(doc)
  return {
    row: {
      title: normTitle(doc.title), creator: (doc.authors ?? []).join(', ') || null, publisher: doc.publisher || null, isbn,
      thumbnail_url: cover, description: intro.source ?? null,
      sources: { primary: 'kakao_book', thumbnail: cover ? 'kakao_book' : 'confirmed_unavailable', ...(intro.source && intro.sourceUrl ? { description: intro.sourceUrl } : {}) },
    },
    release: String(doc.datetime ?? '').slice(0, 10) || null, kakaoTitle: doc.title, saleStatus: doc.status,
  }
}

async function enRowFromOl(isbn) {
  const o = await openLibraryByIsbn(isbn)
  if (!o) return null
  const eng = o.languages.includes('/languages/eng') || (o.languages.length === 0 && isEngIsbn(isbn))
  if (!eng) return null
  const intro = await fetchBookIntroduction({ isbn, locale: 'en' })
  return {
    row: {
      title: o.title, creator: o.authors.join(', ') || null, publisher: o.publisher, isbn,
      thumbnail_url: o.thumbnailUrl, description: intro.source ?? null,
      sources: { primary: 'openlibrary', thumbnail: o.thumbnailUrl ? 'openlibrary' : 'confirmed_unavailable', ...(intro.source && intro.sourceUrl ? { description: intro.sourceUrl } : {}) },
    },
    langs: o.languages,
  }
}

async function main() {
  const db = dbClient()
  const idOf = async (prefix) => (await db.from('contents').select('id').ilike('id', `${prefix}%`).limit(1)).data?.[0]?.id ?? null
  const plan = []

  const skip = new Set(String(argumentValue('skip', '')).split(',').filter(Boolean))
  const recheckPath = argumentValue('recheck', null)
  if (recheckPath) {
    const rows = JSON.parse(readFileSync(resolve(process.cwd(), recheckPath), 'utf8')).filter((r) => r.titleMatch === true)
    for (const r of rows) {
      if (skip.has(r.content_id.slice(0, 8))) { plan.push({ op: 'ko-restore', id: r.content_id, prev: r.card.title, status: 'SKIP by-flag' }); continue }
      const isbn = bareIsbn(r.card.isbn)
      const built = await koRowFromKakao(isbn).catch(() => null)
      plan.push({ op: 'ko-restore', id: r.content_id, isbn, prev: r.card.title, status: built ? 'READY' : 'SKIP kakao-null', ...(built ?? {}) })
      await sleep(300)
    }
  }
  for (const prefix of String(argumentValue('en', '')).split(',').filter(Boolean)) {
    const id = await idOf(prefix)
    const ext = id ? bareIsbn((await db.from('contents').select('external_id').eq('id', id).single()).data?.external_id) : ''
    let built = id && isEngIsbn(ext) ? await enRowFromOl(ext).catch(() => null) : null
    let via = 'external_id'
    if (id && !built) {
      // 대표 ISBN이 OL에 없으면 작품 메타로 검색해 eng 판본을 하나 찾는다
      const w = (await db.from('contents').select('metadata').eq('id', id).single()).data?.metadata?.figureBook ?? {}
      const cands = await openLibrarySearch(w.workTitle ?? w.originalTitle ?? '', w.workCreator ?? w.originalCreator ?? '').catch(() => [])
      for (const c of cands.slice(0, 3)) {
        for (const i of c.isbns.filter(isEngIsbn).slice(0, 4)) { built = await enRowFromOl(i).catch(() => null); if (built) break }
        if (built) break
      }
      via = 'search'
    }
    plan.push({ op: 'en-create', id, prefix, ext, via, status: id ? (built ? 'READY' : 'SKIP no-eng-edition') : 'SKIP no-id', ...(built ?? {}) })
    await sleep(300)
  }
  for (const pair of String(argumentValue('en-isbn', '')).split(',').filter(Boolean)) {
    // 지정 ISBN으로 en 카드를 만든다. ko 카드가 수입 영문판을 들고 있던 작품에서 그 ISBN을 en으로 옮길 때 쓴다.
    const [prefix, isbn] = pair.split(':')
    const id = await idOf(prefix)
    const built = id && isEngIsbn(isbn) ? await enRowFromOl(bareIsbn(isbn)).catch(() => null) : null
    plan.push({ op: 'en-create', id, prefix, ext: bareIsbn(isbn), via: 'given', status: id ? (built ? 'READY' : 'SKIP no-eng-edition') : 'SKIP no-id', ...(built ?? {}) })
    await sleep(300)
  }
  for (const pair of String(argumentValue('ko-isbn', '')).split(',').filter(Boolean)) {
    const [prefix, isbn] = pair.split(':')
    const id = await idOf(prefix)
    const built = id && isKrIsbn(isbn) ? await koRowFromKakao(bareIsbn(isbn)).catch(() => null) : null
    plan.push({ op: 'ko-create', id, prefix, isbn, status: id ? (built ? 'READY' : 'SKIP kakao-null') : 'SKIP no-id', ...(built ?? {}) })
  }

  for (const p of plan) {
    if (p.status !== 'READY') { console.log(`  ${p.status} :: ${p.op} ${(p.id ?? p.prefix ?? '').slice(0, 8)} ${p.prev ?? ''}`); continue }
    const locale = p.op === 'en-create' ? 'en' : 'ko'
    const { data: exist } = await db.from('content_locales').select('isbn,title').eq('content_id', p.id).eq('locale', locale)
    if ((exist ?? []).length) { p.status = `SKIP ${locale}-exists(${exist[0].isbn})`; console.log(`  ${p.status} :: ${p.op} ${p.id.slice(0, 8)}`); continue }
    const renamed = p.prev && normTitle(p.prev) !== p.row.title ? ` | 이전 제목 「${p.prev}」` : ''
    console.log(`  READY ${p.op} ${p.id.slice(0, 8)} ${locale} ${p.row.isbn} 「${p.row.title}」 ${p.row.creator ?? ''} | ${p.row.publisher ?? ''} | 표지 ${p.row.thumbnail_url ? 'O' : '-'} 소개 ${p.row.description ?? 'null'}${renamed}`)
  }
  const ready = plan.filter((p) => p.status === 'READY')
  console.log(`계획: ko 복구 ${ready.filter((p) => p.op === 'ko-restore').length} / en 신설 ${ready.filter((p) => p.op === 'en-create').length} / ko 신설 ${ready.filter((p) => p.op === 'ko-create').length}`)
  if (!APPLY) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  for (const p of ready) {
    const locale = p.op === 'en-create' ? 'en' : 'ko'
    const { data: cat } = await db.from('figure_book_contents').select('content_id').eq('content_id', p.id).limit(1)
    if (!(cat ?? []).length) {
      const r = await db.from('figure_book_contents').insert({ content_id: p.id })
      if (r.error) throw new Error(`catalog ${p.id}: ${r.error.message}`)
    }
    let r = await db.from('content_locales').insert({ content_id: p.id, locale, ...p.row, verified: true }).select('locale')
    if (r.error || (r.data ?? []).length !== 1) throw new Error(`locale insert ${p.id}: ${r.error?.message}`)
    const { data: ed } = await db.from('figure_book_editions').select('id').eq('content_id', p.id).eq('locale', locale).eq('isbn', p.row.isbn)
    if (!(ed ?? []).length) {
      r = await db.from('figure_book_editions').insert({ content_id: p.id, locale, ...p.row, release_date: p.release ?? null, sort_order: 0, verified: true }).select('id')
      if (r.error) throw new Error(`edition insert ${p.id}: ${r.error.message}`)
    }
    if (locale === 'ko') await db.from('contents').update({ external_id: p.row.isbn, external_source: 'kakao_book' }).eq('id', p.id)
    appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), op: p.op, content_id: p.id, locale, row: p.row, release: p.release ?? null })}\n`, 'utf8')
    console.log(`  ${p.op} ${p.id.slice(0, 8)} ${locale} ${p.row.isbn} 완료`)
  }
  for (const p of ready) {
    const locale = p.op === 'en-create' ? 'en' : 'ko'
    const { data } = await db.from('content_locales').select('isbn,title').eq('content_id', p.id).eq('locale', locale)
    const { data: ed } = await db.from('figure_book_editions').select('id').eq('content_id', p.id).eq('locale', locale)
    console.log(`  확인 ${p.id.slice(0, 8)} ${locale} 카드 ${data?.[0]?.isbn ?? 'X'} 판본 ${ed?.length ?? 0}`)
  }
  console.log(`반영 완료. 기록: ${LOG}`)
}

void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
