/**
 * 번역서 원작 확인 — 국내서(book/<isbn>) 정체성으로 굳은 번역서의 원제·원저자·영문판을 찾아 정체성을 원작으로 바꾸고 en 언어 카드·판본을 붙인다.
 *   대상: figure_book_contents 중 workIdentity가 book/<isbn>이고 wikidataQid가 없는 작품
 *   국내서(역자 없음)는 판본이 곧 작품이므로 그대로 둔다
 *   번역서는 원제·원저자를 조사해 OpenLibrary로 검증하고, en locale·en 판본을 붙이며 정체성을 <원저자>/<원제>로 바꾼다
 * 같은 원저작으로 모이는 작품이 둘 이상이면 통합 후보로 적어 merge-works.mjs에 넘긴다.
 *
 * node --env-file=.env scripts/figure-books/translated-original-work.mjs --backend codex [--limit N] [--concurrency 3]
 * node --env-file=.env scripts/figure-books/translated-original-work.mjs --apply
 */

const introductionModule = await import('@feelandnote/content-search/book-introduction')
const { fetchBookIntroduction } = introductionModule.default ?? introductionModule
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import {
  allRows, argumentValue, bareIsbn, dbClient, hasFlag, inChunks,
  kakaoByIsbn, openLibraryByIsbn, openLibrarySearch, originalIdentity,
} from './lib/figure-work.mjs'
import { declaredNone, parsePipeRow, research } from './lib/research.mjs'
import { resolveBatchBook, reviewedBatchScope, verifyBatchWork, sameBookIdentity } from './lib/verified-batch-edition.mjs'

const apply = hasFlag('apply')

function buildPrompt(row) {
  return `아래 한국어 번역서의 원서를 찾는다.

한국어판: ${row.title}
저자(음역): ${row.creator}
역자: ${row.translators.join(', ')}
출판사: ${row.publisher ?? '(모름)'}
한국어판 ISBN: ${row.isbn}

[반드시 지킨다]
- 웹을 검색해 이 한국어판이 어떤 원서를 옮긴 것인지 확인한다. 검색은 두 번까지만 한다.
- 원제와 원저자는 원어 표기(영문판이면 영어)로 쓴다. 추측하지 않는다.
- 원서가 영어권 책이면 널리 유통되는 영문판 ISBN13을 반드시 찾아 적는다(출판사 페이지·Amazon·Goodreads·WorldCat). 원서가 영어가 아니면 그 언어 원판 ISBN13을 적고, 못 찾았으면 "없음"이라고 쓴다.
- 기억으로 채우지 않는다. 확인하지 못하면 전체를 "없음" 한 단어로 답한다.

[출력 형식]
아래 한 줄로만 쓴다. 머리말과 맺음말을 붙이지 않는다.
원제 | 원저자 | 원서ISBN13 또는 없음 | 근거 URL`
}

async function resolveOpenLibrary(original) {
  if (original.isbn && original.isbn.length === 13) {
    const hit = await openLibraryByIsbn(original.isbn).catch(() => null)
    if (hit && sameBookIdentity({ title: original.title, creator: original.author }, { title: hit.workTitle ?? hit.title, creator: hit.authors.join(', ') })) return hit
  }
  const docs = await openLibrarySearch(original.title, original.author).catch(() => [])
  const doc = docs.find((candidate) => candidate.isbns.length > 0
    && sameBookIdentity({ title: original.title, creator: original.author }, { title: candidate.title, creator: candidate.authors.join(', ') }))
  if (!doc) return null
  const hit = await openLibraryByIsbn(doc.isbns[0]).catch(() => null)
  return hit && sameBookIdentity({ title: original.title, creator: original.author }, { title: hit.workTitle ?? hit.title, creator: hit.authors.join(', ') }) ? hit : null
}

async function main() {
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/translated-reidentify.jsonl'))
  const musePath = resolve(process.cwd(), argumentValue('muse', '../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl'))
  const mergePath = resolve(process.cwd(), argumentValue('merge-out', '../../data/celeb/figure-books/merge-candidates.json'))
  const backend = argumentValue('backend', 'codex')
  const limit = Number(argumentValue('limit', '0')) || 0
  const concurrency = Number(argumentValue('concurrency', '3'))
  const db = dbClient()

  // 역자 정보는 작품 후보 조사 결과에 있다. 없으면 카카오에 다시 묻는다.
  const translatorsByIsbn = new Map()
  if (existsSync(musePath)) {
    for (const line of readFileSync(musePath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      const row = JSON.parse(line)
      for (const book of row.books ?? []) {
        const isbn = bareIsbn(book.kakao?.isbn)
        if (isbn && book.kakao) translatorsByIsbn.set(isbn, (book.kakao.translators ?? []).filter(Boolean))
      }
    }
  }

  const figureIds = (await allRows('figure_book_contents', (f, t) => db.from('figure_book_contents').select('content_id').order('content_id').range(f, t))).map((row) => row.content_id)
  const contents = await inChunks(figureIds, 200, (ids) => db.from('contents').select('id,metadata').in('id', ids))
  const targetsAll = contents.filter((row) => {
    const fb = row.metadata?.figureBook
    return fb && /^book\/\d{13}$/.test(String(fb.workIdentity ?? '')) && !fb.wikidataQid
  })
  const locales = await inChunks(targetsAll.map((row) => row.id), 200, (ids) => db.from('content_locales').select('content_id,locale,title,creator,isbn,publisher').in('content_id', ids))
  const koByContent = new Map(locales.filter((row) => row.locale === 'ko').map((row) => [row.content_id, row]))
  const enSet = new Set(locales.filter((row) => row.locale === 'en').map((row) => row.content_id))

  const done = new Map()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { const row = JSON.parse(line); done.set(row.contentId, row) } catch { /* 다시 */ }
    }
  }

  if (!apply) {
    const pending = targetsAll.filter((row) => !done.has(row.id))
    const work = limit > 0 ? pending.slice(0, limit) : pending
    console.log(`book/<isbn> 작품 ${targetsAll.length} / 완료 ${done.size} / 이번 실행 ${work.length} (동시 ${concurrency}, ${backend})`)

    let cursor = 0
    let resolved = 0
    let domestic = 0
    const handle = async (content) => {
      const ko = koByContent.get(content.id)
      if (!ko) return
      const isbn = bareIsbn(ko.isbn)
      let translators = translatorsByIsbn.get(isbn)
      if (!translators) {
        const doc = await kakaoByIsbn(isbn).catch(() => null)
        translators = (doc?.translators ?? []).filter(Boolean)
      }
      const base = { contentId: content.id, koIsbn: isbn, koTitle: ko.title, koCreator: ko.creator, translators }
      if (translators.length === 0) {
        domestic += 1
        appendFileSync(outPath, `${JSON.stringify({ ...base, verdict: 'domestic' })}\n`, 'utf8')
        console.log(`· ${ko.title.slice(0, 30)} — 국내서, 그대로 둔다`)
        return
      }
      const text = await research(buildPrompt({ title: ko.title, creator: ko.creator, translators, publisher: ko.publisher, isbn }), { backend })
      if (declaredNone(text)) {
        appendFileSync(outPath, `${JSON.stringify({ ...base, verdict: 'unresolved', raw: text })}\n`, 'utf8')
        console.log(`△ ${ko.title.slice(0, 30)} — 원서 못 찾음`)
        return
      }
      const cells = parsePipeRow(text, '원제')
      if (!cells || cells.length < 3) {
        console.log(`↻ ${ko.title.slice(0, 30)} — 조사 실패 :: ${JSON.stringify(String(text).slice(0, 160))}`)
        return
      }
      const original = { title: cells[0], author: cells[1], isbn: bareIsbn(cells[2]).length === 13 ? bareIsbn(cells[2]) : null, evidence: cells[3] ?? null }
      const found = await resolveOpenLibrary(original)
      // OpenLibrary가 준 판본이 영어가 아니면(일본어판 등) en locale이 될 수 없다. 원제만 남긴다.
      const en = found && found.languages.includes('/languages/eng') ? found : null
      // OpenLibrary에 영문판이 없어도 원제·원저자는 확인된 사실이다. 정체성 갱신에 쓴다.
      const record = { ...base, original, en, verdict: en ? 'resolved' : 'original-only', raw: text }
      appendFileSync(outPath, `${JSON.stringify(record)}\n`, 'utf8')
      if (en) resolved += 1
      console.log(`${en ? '✔' : '△'} ${ko.title.slice(0, 26)} → ${original.title.slice(0, 30)} / ${original.author}${en ? ` (${en.isbn})` : ' — OpenLibrary 미확인'}`)
    }
    const worker = async () => {
      while (cursor < work.length) {
        const item = work[cursor]
        cursor += 1
        try { await handle(item) } catch (error) { console.log(`✖ ${item.id} — ${error instanceof Error ? error.message.slice(0, 80) : error}`) }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, work.length) }, worker))
    console.log(`\n원서 확인 ${resolved} / 국내서 ${domestic}`)
    console.log(`WROTE ${outPath}`)
    return
  }

  // ── 반영 ─────────────────────────────────────────────────────────────
  // 조사 메모나 원제만으로 기존 작품의 정체성을 바꾸지 않는다. 공식 판본과 서버 귀속을 먼저 확인한다.
  const rowsAll = [...done.values()].filter((row) => row.verdict === 'resolved' && row.en?.isbn)
  if (rowsAll.length === 0) { console.log('공식 판본을 검증할 대상이 없습니다. 기존 작품과 통합 후보를 그대로 둡니다.'); return }
  for (const row of rowsAll) {
    const official = await resolveBatchBook(row.en, 'en')
    row.scope = reviewedBatchScope(row.edition, official.externalId)
    row.attribution = await verifyBatchWork(db, row.contentId, official, row.scope)
    row.official = official
    row.en = { ...row.en, title: official.title, authors: [official.creator], isbn: official.externalId,
      publisher: official.metadata.publisher, thumbnailUrl: official.coverImageUrl, sourceUrl: official.metadata.link,
      workKey: official.metadata.workKey, workTitle: official.metadata.workTitle }
  }
  // P1이 먼저 QID를 붙였으면 그 정체성이 우선이다. 반영 시점의 DB로 다시 거른다.
  const fresh = await inChunks(rowsAll.map((row) => row.contentId), 200, (ids) => db.from('contents').select('id,metadata').in('id', ids))
  const freshById = new Map(fresh.map((row) => [row.id, row]))
  for (const row of rowsAll) {
    const current = freshById.get(row.contentId)
    if (!current || (current.metadata != null && (typeof current.metadata !== 'object' || Array.isArray(current.metadata)))) {
      throw new Error(`작품의 최신 메타데이터를 확인할 수 없습니다: ${row.contentId}`)
    }
  }
  const hasQid = new Set(fresh.filter((row) => row.metadata?.figureBook?.wikidataQid).map((row) => row.id))
  const resolvedRows = rowsAll.filter((row) => !hasQid.has(row.contentId))
  console.log(`반영 대상 ${resolvedRows.length} (QID가 먼저 붙어 건너뜀 ${rowsAll.length - resolvedRows.length})`)
  // 정체성: 영문판이 있으면 OpenLibrary 저자·제목, 없으면 조사한 원저자·원제. 슬러그가 안 되면(비라틴) 현재 값을 지킨다.
  const keepsOriginalIdentity = (row) => ['independent_series_review', 'independent_omnibus_review'].includes(row.attribution?.method)
  const identityOf = (row) => keepsOriginalIdentity(row)
    ? freshById.get(row.contentId)?.metadata?.figureBook?.workIdentity ?? null
    : row.en?.isbn
    ? originalIdentity(row.en.authors.join(', '), row.en.workTitle ?? row.en.title, `openlibrary:${String(row.en.workKey ?? row.en.editionKey ?? row.en.isbn).split('/').pop().toLowerCase()}`)
    : originalIdentity(row.original.author, row.original.title, null)

  // 같은 원저작으로 모이는 작품을 찾는다. 기존 작품 중 이미 그 정체성을 가진 것도 통합 대상이다.
  const byIdentity = new Map()
  for (const row of resolvedRows) {
    const identity = identityOf(row)
    if (identity) byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), row.contentId])
  }
  const existingByIdentity = new Map()
  for (const row of contents) {
    const identity = row.metadata?.figureBook?.workIdentity
    if (identity && !/^book\//.test(identity)) existingByIdentity.set(identity, row.id)
  }
  const merges = []
  for (const [identity, ids] of byIdentity) {
    const keep = existingByIdentity.get(identity) ?? ids[0]
    for (const id of ids) if (id !== keep) merges.push({ keep, drop: id, identity, reason: 'same-original-work' })
  }
  mkdirSync(dirname(mergePath), { recursive: true })
  writeFileSync(mergePath, JSON.stringify({ generatedAt: new Date().toISOString(), merges }, null, 2), 'utf8')

  let updated = 0
  let enAdded = 0
  for (const row of resolvedRows) {
    const identity = identityOf(row)
    const before = freshById.get(row.contentId).metadata ?? null
    const metadata = before ?? {}
    const preserveOriginal = keepsOriginalIdentity(row)
    const figureBook = preserveOriginal ? metadata.figureBook : {
      ...(metadata.figureBook ?? {}),
      workIdentity: identity ?? metadata.figureBook?.workIdentity,
      workTitle: row.en?.workTitle ?? row.en?.title ?? row.original.title,
      workCreator: row.en?.authors?.join(', ') ?? row.original.author ?? metadata.figureBook?.workCreator,
      originalTitle: metadata.figureBook?.originalTitle ?? row.official.metadata.workTitle ?? row.official.title,
      originalCreator: metadata.figureBook?.originalCreator ?? row.official.creator,
      openLibraryWork: row.en?.workKey ?? null,
      enIsbn: row.en?.isbn ?? null,
    }
    // 최신 원전 귀속을 다시 검증하고, 검증 이후의 변경도 전체 메타데이터 CAS로 보호한다.
    const currentAttribution = await verifyBatchWork(db, row.contentId, row.official, row.scope)
    if (currentAttribution.method !== row.attribution.method) throw new Error(`작품 귀속이 검증 중 변경되었습니다: ${row.contentId}`)
    if (!preserveOriginal) {
      const next = { ...metadata, figureBook }
      let query = db.from('contents').update({ metadata: next }).eq('id', row.contentId)
      query = before === null ? query.is('metadata', null) : query.eq('metadata', JSON.stringify(before))
      const { data, error } = await query.select('id,metadata').single()
      if (error || data?.id !== row.contentId || !isDeepStrictEqual(data.metadata, next)) {
        throw new Error(`메타데이터 저장 충돌 또는 실패: ${row.contentId}${error ? ` (${error.message})` : ''}`)
      }
      const saved = await db.from('contents').select('id,metadata').eq('id', row.contentId).single()
      if (saved.error || saved.data?.id !== row.contentId || !isDeepStrictEqual(saved.data.metadata, next)) {
        throw new Error(`저장한 메타데이터 재조회 검증 실패: ${row.contentId}`)
      }
      updated += 1
    }
    if (!row.en?.isbn || enSet.has(row.contentId)) continue
    const sources = { primary: 'openlibrary', title: row.en.sourceUrl, creator: row.en.sourceUrl, isbn: row.en.sourceUrl, publisher: row.en.sourceUrl, thumbnail: row.en.sourceUrl,
      work_attribution: row.attribution, physical_format: row.official.metadata.physical_format ?? null,
      ...(row.scope.scope_evidence ? { scope_evidence: row.scope.scope_evidence } : {}) }
    const introduction = await fetchBookIntroduction({ isbn: row.en.isbn, locale: 'en' }).catch(() => null)
    if (introduction?.source && introduction?.sourceUrl) sources.description = introduction.sourceUrl
    const locale = { description: introduction?.source ?? null, content_id: row.contentId, locale: 'en', title: row.en.title, creator: row.en.authors.join(', '), isbn: row.en.isbn, publisher: row.en.publisher, thumbnail_url: row.en.thumbnailUrl, verified: true, sources }
    const l = await db.from('content_locales').upsert(locale, { onConflict: 'content_id,locale', ignoreDuplicates: true })
    if (l.error) { console.log(`  en locale 실패 ${row.contentId}: ${l.error.message}`); continue }
    // 판본 트리거는 figure_book_contents 삽입 때만 돌므로 en 판본은 직접 넣는다.
    const e = await db.from('figure_book_editions').insert({ description: introduction?.source ?? null, content_id: row.contentId, locale: 'en', title: row.en.title, creator: row.en.authors.join(', '), isbn: row.en.isbn, publisher: row.en.publisher, thumbnail_url: row.en.thumbnailUrl, release_date: null, edition_kind: row.scope.edition_kind, text_scope: row.scope.text_scope, sort_order: 0, verified: true, sources })
    if (e.error && !/duplicate key/.test(e.error.message)) { console.log(`  en 판본 실패 ${row.contentId}: ${e.error.message}`); continue }
    enAdded += 1
  }
  console.log(`\n정체성 갱신 ${updated} / en 판본 추가 ${enAdded} / 통합 후보 ${merges.length}`)
  console.log(`WROTE ${mergePath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
