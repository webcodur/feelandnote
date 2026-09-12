/**
 * Devin 조사(R) 결과로 미등록 목록 항목을 등록한다 — 기본 dry-run, `--apply`로 반영.
 * 규칙: celeb-02-02 「한국어판 확인」·「영문판과 표지」·「절판」. 조사가 적은 ISBN은 믿지 않고 여기서 다시 조회한다.
 * - ko.isbn13 → 카카오 ISBN 조회. 제목이 맞으면 한국어판 행. 카카오 판매 상태가 절판·품절이거나 조사가 out_of_print 면 sources.availability='out_of_print'.
 * - en.isbn13 → OpenLibrary ISBN 조회. 제목이 맞으면 영문판 행.
 * - 둘 다 없으면 판본 없는 작품(external_source null)을 만들고 표시용 행만 둔다. 원작이 한국어면 ko 행에 availability='out_of_print'(화면 「절판된 책」).
 * - 한쪽만 실재하면 반대 언어는 조사의 제목·저자로 표시용 행을 둔다.
 * - 같은 ISBN 작품이 이미 있으면 새로 만들지 않고 그 작품에 잇는다.
 * 기록: data/celeb/figure-books/curated-research-log.jsonl · 반영 목록: <dir>/applied-R.json
 *
 * node --env-file=.env scripts/curated/research-apply.mjs --dir <devin-bookname 폴더> [--apply] [--limit N]
 */
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { argumentValue, bareIsbn, dbClient, kakaoByIsbn, kakaoCreator, openLibraryByIsbn, squash } from '../figure-books/lib/figure-work.mjs'
const introductionModule = await import('@feelandnote/content-search/book-introduction')
const { fetchBookIntroduction } = introductionModule.default ?? introductionModule

const APPLY = process.argv.includes('--apply')
const DIR = resolve(process.cwd(), argumentValue('dir', ''))
const LIMIT = Number(argumentValue('limit', '0'))
const LOG = resolve(process.cwd(), '../../data/celeb/figure-books/curated-research-log.jsonl')
const NOTE = 'curated-list research 26.09.13'
const hasHangul = (s) => /[가-힣]/.test(String(s ?? ''))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** 제목 대조 — 정규화 후 같거나 한쪽이 다른 쪽을 품으면 같은 책으로 본다(부제·판 표기 차이 허용). */
const sameTitle = (a, b) => { const x = squash(a), y = squash(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)) }

function loadR() {
  const out = []
  for (const name of readdirSync(join(DIR, 'output')).filter((n) => /^R-\d+\.json$/.test(n)).sort()) {
    try { execFileSync('node', [join(DIR, 'validate.mjs'), name], { stdio: 'ignore' }) } catch { console.log(`  건너뜀(검사 실패) ${name}`); continue }
    out.push(...JSON.parse(readFileSync(join(DIR, 'output', name), 'utf8')))
  }
  return out
}

async function main() {
  const db = dbClient()
  let rows = loadR(); if (LIMIT) rows = rows.slice(0, LIMIT)
  console.log(`조사 결과 ${rows.length}건`)
  const stat = { ko: 0, en: 0, both: 0, none: 0, reuse: 0, skip: 0, outOfPrint: 0 }
  const touched = { contents: new Set(), lists: new Set() }
  const log = (row) => APPLY && appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`, 'utf8')

  for (const r of rows) {
    const itemId = r.id.replace(/^item:/, '')
    const { data: item } = await db.from('curated_list_items').select('id,list_id,content_id,raw_title,raw_creator').eq('id', itemId).maybeSingle()
    if (!item || item.content_id) { stat.skip++; continue }
    const label = `${item.raw_title} / ${item.raw_creator ?? ''}`

    // 1) 실재 판본 확인
    let ko = null, en = null
    if (r.ko?.isbn13) {
      const isbn = bareIsbn(r.ko.isbn13)
      const doc = await kakaoByIsbn(isbn); await sleep(120)
      if (doc && (sameTitle(doc.title, r.ko.title) || sameTitle(doc.title, item.raw_title))) {
        const outOfPrint = /절판|품절/.test(doc.status ?? '') || r.ko.availability === 'out_of_print'
        const isbn13 = bareIsbn(String(doc.isbn ?? '').split(' ').find((v) => v.length === 13) ?? isbn)
        ko = { isbn: isbn13, title: doc.title, creator: kakaoCreator(doc) || r.creator_ko, thumbnail: doc.thumbnail || null, publisher: doc.publisher || null, releaseDate: doc.datetime ? String(doc.datetime).slice(0, 10) : null, outOfPrint, url: doc.url || null }
      } else console.log(`  ko 불일치 ${label} | 조사 ${r.ko.isbn13} → 카카오 「${doc?.title ?? '없음'}」`)
    }
    if (r.en?.isbn13) {
      const isbn = bareIsbn(r.en.isbn13)
      const ed = await openLibraryByIsbn(isbn); await sleep(200)
      const english = !ed?.languages?.length || ed.languages.includes('/languages/eng')
      if (ed && english && (sameTitle(ed.title, r.en.title) || sameTitle(ed.title, item.raw_title))) {
        en = { isbn, title: ed.title, creator: ed.authors.join(', ') || r.creator_en, thumbnail: ed.thumbnailUrl, publisher: ed.publisher, releaseDate: null, sourceUrl: ed.sourceUrl }
      } else console.log(`  en 불일치 ${label} | 조사 ${r.en.isbn13} → OL 「${ed?.title ?? '없음'}」${ed && !english ? ' (영어 아님)' : ''}`)
    }

    // 2) 이미 있는 작품인가(ISBN)
    let contentId = null
    for (const isbn of [ko?.isbn, en?.isbn].filter(Boolean)) {
      const { data: byExt } = await db.from('contents').select('id').eq('external_id', isbn).limit(1)
      const { data: byLoc } = byExt?.length ? { data: [] } : await db.from('content_locales').select('content_id').eq('isbn', isbn).limit(1)
      contentId = byExt?.[0]?.id ?? byLoc?.[0]?.content_id ?? null
      if (contentId) { stat.reuse++; break }
    }

    const kind = ko && en ? 'both' : ko ? 'ko' : en ? 'en' : 'none'
    stat[kind]++
    const koOutOfPrint = ko ? ko.outOfPrint : r.original_lang === 'ko'
    if (koOutOfPrint) stat.outOfPrint++
    const koText = ko ? `「${ko.title}」${ko.outOfPrint ? '(절판)' : ''}` : `표시「${r.title_ko}」${koOutOfPrint ? '(절판)' : ''}`
    const enText = en ? `「${en.title}」` : `표시「${r.title_en}」`
    console.log(`  ${kind.padEnd(4)} ${label} → ko:${koText} / en:${enText}${contentId ? ' (기존 작품)' : ''}`)
    if (!APPLY) continue

    // 3) 작품 만들기
    if (!contentId) {
      const primary = ko ?? en
      const ins = await db.from('contents').insert({ type: 'BOOK', external_source: ko ? 'kakao_book' : en ? 'openlibrary' : null, external_id: primary?.isbn ?? null, release_date: primary?.releaseDate ?? null }).select('id').single()
      if (ins.error) throw new Error(`contents ${label}: ${ins.error.message}`)
      contentId = ins.data.id
    }
    // 4) 언어 행 — 이미 있는 행은 건드리지 않는다
    const { data: have } = await db.from('content_locales').select('locale').eq('content_id', contentId)
    const haveLoc = new Set((have ?? []).map((l) => l.locale))
    const inserts = []
    if (!haveLoc.has('ko')) {
      if (ko) {
        const intro = await fetchBookIntroduction({ isbn: ko.isbn, locale: 'ko' }).catch(() => null)
        const sources = { primary: 'kakao_book', note: NOTE }
        if (ko.url) sources.title = ko.url
        if (intro?.source) sources.description = intro.sourceUrl
        if (ko.outOfPrint) sources.availability = 'out_of_print'
        inserts.push({ content_id: contentId, locale: 'ko', title: ko.title, creator: ko.creator, thumbnail_url: ko.thumbnail, publisher: ko.publisher, isbn: ko.isbn, description: intro?.source ?? null, verified: true, sources })
      } else if (r.title_ko) {
        const sources = { primary: 'none', title: r.kind_ko }
        if (koOutOfPrint) sources.availability = 'out_of_print'
        inserts.push({ content_id: contentId, locale: 'ko', title: r.title_ko, creator: r.creator_ko ?? null, verified: false, sources })
      }
    }
    if (!haveLoc.has('en')) {
      if (en) {
        const intro = await fetchBookIntroduction({ isbn: en.isbn, locale: 'en' }).catch(() => null)
        const sources = { primary: 'openlibrary', note: NOTE }
        if (intro?.source) sources.description = intro.sourceUrl
        inserts.push({ content_id: contentId, locale: 'en', title: en.title, creator: en.creator, thumbnail_url: en.thumbnail, publisher: en.publisher, isbn: en.isbn, description: intro?.source ?? null, verified: true, sources })
      } else if (r.title_en && !hasHangul(r.title_en)) {
        inserts.push({ content_id: contentId, locale: 'en', title: r.title_en, creator: r.creator_en ?? null, verified: false, sources: { primary: 'none', title: r.kind_en } })
      }
    }
    if (inserts.length) { const li = await db.from('content_locales').insert(inserts); if (li.error) throw new Error(`locales ${label}: ${li.error.message}`) }
    const u = await db.from('curated_list_items').update({ content_id: contentId }).eq('id', item.id)
    if (u.error) throw new Error(`link ${label}: ${u.error.message}`)
    log({ item: item.id, list: item.list_id, content: contentId, kind, ko, en, research: r, inserted: inserts.map((i) => i.locale) })
    touched.contents.add(contentId); touched.lists.add(item.list_id)
  }
  console.log(`\n한국어판 ${stat.ko} / 영문판 ${stat.en} / 둘 다 ${stat.both} / 판본 없음(표시행만) ${stat.none} / 기존 작품 재사용 ${stat.reuse} / 절판 표식 ${stat.outOfPrint} / 건너뜀 ${stat.skip}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
  if (APPLY) writeFileSync(join(DIR, 'applied-R.json'), JSON.stringify({ contents: [...touched.contents], lists: [...touched.lists] }), 'utf8')
}
main().catch((e) => { console.error(e); process.exit(1) })
