/**
 * 작품 일치 확인 — 위키데이터에서 꺼낸 작품 항목이 DB 작품과 같은지 확인한다. 인물 도서 정비의 둘째 단계.
 *   판본 항목(P629 있음)은 그 저작으로 접는다. 확인·등록은 저작 단위다.
 *   같은 작품  → wikidataQid를 붙이고 정체성을 wikidata:로 올린다 (metadata.figureBook, 스키마 무변경)
 *   없는 작품  → 새 작품 책 정보 채우기: 카카오·OpenLibrary에서 책 정보를 받은 것만 만든다 (위키데이터 라벨로 언어 카드를 만들지 않는다)
 *   두 작품에 걸림 → merge-candidates-wikidata.json에 통합 후보로만 남긴다 (merge-works.mjs 입력). QID·관계는 붙이지 않는다
 *   저자(P50·P170·P800)와 작품 사이에 관계가 없으면 창작 관계(authored)를 만들고, related로 남아 있으면 authored로 올린다.
 *
 * node --env-file=.env scripts/figure-books/wikidata-works-match.mjs            (dry-run)
 * node --env-file=.env scripts/figure-books/wikidata-works-match.mjs --apply
 *   --slug <인물>   한 인물만   --limit N  새 작품 상한   --concurrency 6
 *   --repair        미완성 작품 복구(언어 카드 없는 작품 행) + 잘못 붙은 영문 카드 제거(비영어권 ISBN)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  MULTIPART, allRows, argumentValue, backfillEditionKinds, bareIsbn, dbClient, deterministicContentId, hasFlag, isbn10to13,
  kakaoByIsbn, kakaoByTitle, kakaoCreator, openLibraryByIsbn, openLibraryEditionForWork, squash, wbEntities, wikidataIdentity,
} from './lib/figure-work.mjs'

const apply = hasFlag('apply')
const AUTHOR_PROPS = new Set(['P50', 'P170', 'P800'])

// ── 카탈로그 ─────────────────────────────────────────────────────────────

async function loadCatalog(db) {
  const [contents, locales, editions, figureBooks, relations] = await Promise.all([
    allRows('contents', (f, t) => db.from('contents').select('id,metadata,external_id').eq('type', 'BOOK').order('id').range(f, t)),
    allRows('content_locales', (f, t) => db.from('content_locales').select('content_id,locale,title,creator,isbn').order('content_id').order('locale').range(f, t)),
    allRows('figure_book_editions', (f, t) => db.from('figure_book_editions').select('content_id,locale,isbn').order('id').range(f, t)),
    allRows('figure_book_contents', (f, t) => db.from('figure_book_contents').select('content_id').order('content_id').range(f, t)),
    allRows('figure_book_characters', (f, t) => db.from('figure_book_characters').select('content_id,celeb_id,relation_type,sort_order').order('content_id').order('celeb_id').range(f, t)),
  ])
  const bookIds = new Set(contents.map((row) => row.id))
  const qidToContent = new Map()
  const metaById = new Map()
  for (const row of contents) {
    metaById.set(row.id, row.metadata ?? {})
    const qid = row.metadata?.figureBook?.wikidataQid
    if (qid) qidToContent.set(String(qid).toUpperCase(), row.id)
  }
  const isbnToContent = new Map()
  const enTitle = new Map()
  const koTitle = new Map()
  const creatorByContent = new Map()   // 작품 → 저자 토큰 집합(ko·en locale 합산)
  const koTitleByContent = new Map()
  const push = (map, key, id) => { if (!key) return; const list = map.get(key) ?? []; if (!list.includes(id)) list.push(id); map.set(key, list) }
  for (const row of locales) {
    if (!bookIds.has(row.content_id)) continue
    const isbn = bareIsbn(row.isbn)
    if (isbn && !isbnToContent.has(isbn)) isbnToContent.set(isbn, row.content_id)
    if (row.locale === 'en') push(enTitle, squash(row.title), row.content_id)
    if (row.locale === 'ko') { push(koTitle, squash(row.title), row.content_id); koTitleByContent.set(row.content_id, squash(row.title)) }
    const tokens = creatorByContent.get(row.content_id) ?? new Set()
    for (const token of nameTokens(row.creator)) tokens.add(token)
    creatorByContent.set(row.content_id, tokens)
  }
  for (const row of editions) {
    const isbn = bareIsbn(row.isbn)
    if (isbn && !isbnToContent.has(isbn)) isbnToContent.set(isbn, row.content_id)
  }
  // contents.external_id는 유니크다. locale·판본에 없어도 여기 있는 ISBN으로 새 작품을 만들면 삽입이 깨진다.
  for (const row of contents) {
    const isbn = bareIsbn(row.external_id)
    if (isbn.length >= 10 && !isbnToContent.has(isbn)) isbnToContent.set(isbn, row.id)
  }
  const relationPairs = new Map(relations.map((row) => [`${row.celeb_id}:${row.content_id}`, row.relation_type]))
  const relationCount = new Map()
  const nextSort = new Map()
  for (const row of relations) {
    relationCount.set(row.content_id, (relationCount.get(row.content_id) ?? 0) + 1)
    nextSort.set(row.celeb_id, Math.max(nextSort.get(row.celeb_id) ?? 0, (row.sort_order ?? 0) + 1))
  }
  return {
    qidToContent, metaById, isbnToContent, enTitle, koTitle, koTitleByContent, creatorByContent,
    figureBookIds: new Set(figureBooks.map((row) => row.content_id)), relationPairs, relationCount, nextSort,
  }
}

/** 이름을 토큰으로 쪼갠다. 표기 변형(푸시킨/푸쉬킨, Mao Zedong/Mao Tse-tung)은 성 하나만 겹쳐도 같은 사람으로 본다. */
function nameTokens(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((token) => (/[\uac00-\ud7a3]/.test(token) ? token.length >= 2 : token.length >= 3))
}

// ── 저작 단위로 접기 (판본 항목 → 저작) ─────────────────────────────────

/** 예전 추출 줄에는 types·editionOf가 없다. 없는 것만 엔티티 API로 채우고 캐시에 둔다. */
async function fillDetails(people, cachePath) {
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
  const need = new Set()
  for (const { works } of people) for (const work of works) if (!work.types && !cache[work.qid]) need.add(work.qid)
  if (need.size > 0) {
    console.log(`작품 항목 상세 보충 ${need.size}건 (엔티티 API)`)
    const detail = await wbEntities([...need])
    for (const [qid, info] of detail) cache[qid] = info
    writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
  }
  for (const { works } of people) for (const work of works) {
    if (work.types) continue
    const info = cache[work.qid] ?? {}
    work.types = info.types ?? []
    work.editionOf = info.editionOf ?? []
    if (!work.isbn13?.length && info.isbn13?.length) work.isbn13 = info.isbn13
    if (!work.olid?.length && info.olid?.length) work.olid = info.olid
  }
  // 판본이 가리키는 저작 항목이 추출본에 없으면 라벨·ISBN을 받아 둔다.
  const parents = new Set()
  for (const { works } of people) for (const work of works) for (const parent of work.editionOf ?? []) parents.add(parent)
  const missingParents = [...parents].filter((qid) => !cache[qid])
  if (missingParents.length > 0) {
    console.log(`저작 항목 보충 ${missingParents.length}건 (판본 → 저작)`)
    const detail = await wbEntities(missingParents)
    for (const [qid, info] of detail) cache[qid] = info
    writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
  }
  return cache
}

function foldWorks(people, cache) {
  const canonical = new Map()   // 저작 QID → { qid, en, ko, kowiki, isbn13:Set, olid:Set, year, persons: Map }
  let folded = 0
  const get = (qid, seed) => {
    if (!canonical.has(qid)) canonical.set(qid, { qid, en: seed.en ?? null, ko: seed.ko ?? null, kowiki: seed.kowiki ?? null, isbn13: new Set(), olid: new Set(), year: seed.year ?? null, persons: new Map() })
    return canonical.get(qid)
  }
  for (const { person, works } of people) {
    for (const work of works) {
      const parentQid = (work.editionOf ?? [])[0] ?? null
      const target = parentQid ? get(parentQid, cache[parentQid] ?? work) : get(work.qid, work)
      if (parentQid) folded += 1
      for (const isbn of work.isbn13 ?? []) target.isbn13.add(isbn)
      for (const isbn of work.isbn10 ?? []) { const converted = isbn10to13(isbn); if (converted) target.isbn13.add(converted) }
      for (const olid of work.olid ?? []) target.olid.add(olid)
      target.en ??= work.en ?? null
      target.ko ??= work.ko ?? null
      target.kowiki ??= work.kowiki ?? null
      target.year ??= work.year ?? null
      const entry = target.persons.get(person.id) ?? { person, props: new Set() }
      for (const prop of work.props ?? []) entry.props.add(prop)
      target.persons.set(person.id, entry)
    }
  }
  // P629가 없는 판본 항목은 같은 OpenLibrary 저작·ISBN을 공유한다. 그것도 한 저작으로 접는다(낮은 QID가 대표).
  const parent = new Map()
  const find = (qid) => { while (parent.get(qid) !== undefined && parent.get(qid) !== qid) qid = parent.get(qid); return qid }
  const byKey = new Map()
  for (const work of canonical.values()) {
    for (const key of [...work.isbn13, ...[...work.olid].filter((olid) => /W$/.test(olid))]) {
      const other = byKey.get(key)
      if (!other) { byKey.set(key, work.qid); continue }
      const a = find(other); const b = find(work.qid)
      if (a === b) continue
      const [keep, drop] = Number(a.slice(1)) <= Number(b.slice(1)) ? [a, b] : [b, a]
      parent.set(drop, keep)
    }
  }
  for (const [qid, work] of [...canonical]) {
    const root = find(qid)
    if (root === qid) continue
    const target = canonical.get(root)
    for (const isbn of work.isbn13) target.isbn13.add(isbn)
    for (const olid of work.olid) target.olid.add(olid)
    target.en ??= work.en; target.ko ??= work.ko; target.kowiki ??= work.kowiki; target.year ??= work.year
    mergePersons(target, work)
    canonical.delete(qid)
    folded += 1
  }
  return { canonical, folded }
}

function mergePersons(target, work) {
  for (const [personId, entry] of work.persons) {
    const mine = target.persons.get(personId) ?? { person: entry.person, props: new Set() }
    for (const prop of entry.props) mine.props.add(prop)
    target.persons.set(personId, mine)
  }
}

// ── 일치 확인 ─────────────────────────────────────────────────────────────

function personTokensOf(work) {
  return new Set([...work.persons.values()].flatMap(({ person }) => [...nameTokens(person.nickname), ...nameTokens(person.nicknameEn)]))
}

/** 규칙 순서대로 첫 강한 일치를 돌려주고, 규칙을 통틀어 걸린 작품 집합도 함께 준다(통합 후보 탐지). */
function match(work, catalog) {
  const hits = new Set()
  let strong = null
  let weak = null
  const take = (rule, contentId, isWeak = false) => {
    hits.add(contentId)
    if (isWeak) weak ??= { rule, contentId, weak: true }
    else strong ??= { rule, contentId }
  }
  const qid = work.qid.toUpperCase()
  if (catalog.qidToContent.has(qid)) take('qid', catalog.qidToContent.get(qid))
  for (const isbn of work.isbn13) if (catalog.isbnToContent.has(isbn)) take('isbn', catalog.isbnToContent.get(isbn))
  const personTokens = personTokensOf(work)
  const creatorMatches = (contentId) => [...(catalog.creatorByContent.get(contentId) ?? [])].some((token) => personTokens.has(token))
  const koLabels = [work.ko, work.kowiki].map((label) => squash(label)).filter((label) => label.length >= 3)
  const en = squash(work.en)
  if (en.length >= 4 && catalog.enTitle.get(en)?.length === 1) {
    const contentId = catalog.enTitle.get(en)[0]
    // 영문 제목이 유일해도 저자가 다르면 동명 저작이다(Night·The Prophet·Symposium). 저자가 맞거나 한국어 제목까지 같아야 강한 일치다.
    const koAgrees = koLabels.includes(catalog.koTitleByContent.get(contentId) ?? '')
    take('en-title', contentId, !creatorMatches(contentId) && !koAgrees)
  }
  for (const label of [work.ko, work.kowiki]) {
    const ko = squash(label)
    if (ko.length < 3) continue
    const list = catalog.koTitle.get(ko) ?? []
    if (list.length !== 1) continue
    take('ko-title+author', list[0], !creatorMatches(list[0]))
  }
  return { strong, weak, hits: [...hits] }
}

// ── 새 작품 책 정보 채우기 ─────────────────────────────────────────────────

async function enrich(work) {
  // ISBN13이 있으면 카카오(ko)·OpenLibrary(en)에서 책 정보를 받는다. 없으면 OpenLibrary 저작 ID로 영어판 하나를 찾는다.
  let ko = null
  let en = null
  for (const isbn of [...work.isbn13].slice(0, 6)) {
    ko ??= await kakaoByIsbn(isbn).catch(() => null)
    en ??= await openLibraryByIsbn(isbn).catch(() => null)
    if (ko && en) break
  }
  if (!en) {
    for (const olid of [...work.olid].slice(0, 3)) {
      if (!/^OL\d+W$/.test(olid)) continue
      const isbn = await openLibraryEditionForWork(`/works/${olid}`).catch(() => null)
      if (isbn) en = await openLibraryByIsbn(isbn).catch(() => null)
      if (en) break
    }
  }
  // 한국어 위키 문서가 있는 저작은 카카오 제목 검색으로 한국어판을 찾는다. 제목이 같고 저자에 인물명이 있어야 받는다.
  if (!ko && work.kowiki) {
    const personTokens = personTokensOf(work)
    const title = work.kowiki.replace(/\s*\(.*?\)\s*$/, '')
    const docs = await kakaoByTitle(title).catch(() => [])
    ko = docs.find((doc) => squash(doc.title) === squash(title) && nameTokens((doc.authors ?? []).join(' ')).some((token) => personTokens.has(token))) ?? null
  }
  if (en && !isEnglishEdition(en)) en = null
  // 도서관 목록식 제목(" / by …", 마이크로필름)은 소비자용 판본이 아니다. 그런 OpenLibrary 판본은 버린다.
  if (en && (/ \/ /.test(en.title) || /microf/i.test(en.title))) en = null
  // 카카오는 수입 원서도 낸다. 한국 ISBN(978-89·979-11)이 아니면 한국어판이 아니므로 ko locale로 쓰지 않는다.
  if (ko && !isKoreanIsbn(ko.isbn)) ko = null
  return { ko, en }
}

// 언어가 비어 있는 OpenLibrary 판본은 ISBN 국가군으로 본다. 프랑스(978-2)·독일(978-3)·일본(978-4) 판본이 영문판으로 들어온 적이 있다.
const isEnglishEdition = (en) => {
  if (!en?.isbn) return false
  if (en.languages.length > 0) return en.languages.includes('/languages/eng')
  return /^(9780|9781|9798)/.test(bareIsbn(en.isbn))
}
/** 캐시에서 꺼낸 책 정보에도 같은 판정을 건다. 규칙이 바뀐 뒤 옛 캐시가 비영어 판본을 되살린 적이 있다. */
function sanitizeEnriched(enriched) {
  if (!enriched) return { ko: null, en: null }
  let { ko = null, en = null } = enriched
  if (en && (!isEnglishEdition(en) || / \/ /.test(en.title ?? '') || /microf/i.test(en.title ?? ''))) en = null
  if (ko && !isKoreanIsbn(ko.isbn)) ko = null
  return { ko, en }
}
const isKoreanIsbn = (value) => String(value ?? '').split(' ').some((isbn) => /^(97889|9791)/.test(bareIsbn(isbn)))

function buildRows(work, enriched) {
  const identity = wikidataIdentity(work.qid)
  const contentId = deterministicContentId(identity)
  const firstPerson = [...work.persons.values()][0].person
  const enTitle = enriched.en?.title || work.en || null
  const koTitle = enriched.ko?.title || work.kowiki || work.ko || null
  const workCreator = enriched.en?.authors?.[0] || firstPerson.nicknameEn || firstPerson.nickname
  const releaseDate = enriched.ko?.datetime?.slice(0, 10) ?? (work.year ? `${work.year}-01-01` : null)
  const wikidataUrl = `https://www.wikidata.org/wiki/${work.qid}`
  const koIsbn = enriched.ko ? bareIsbn(String(enriched.ko.isbn ?? '').split(' ').find((v) => v.length === 13) ?? '') || null : null

  const content = {
    id: contentId,
    type: 'BOOK',
    external_source: enriched.en ? 'openlibrary' : 'kakao_book',
    external_id: enriched.en?.isbn ?? koIsbn,
    release_date: releaseDate,
    metadata: {
      isbn: koIsbn,
      publisher: enriched.ko?.publisher ?? enriched.en?.publisher ?? null,
      publishDate: releaseDate,
      figureBook: {
        workTitle: enTitle ?? koTitle,
        workCreator,
        workIdentity: identity,
        wikidataQid: work.qid,
        koTranslationStatus: enriched.ko ? 'published' : 'unknown',
        koLabel: enriched.ko ? undefined : (koTitle ?? undefined),
        source: 'wikidata-works',
      },
    },
  }
  const locales = []
  if (enriched.en) {
    locales.push({
      content_id: contentId, locale: 'en', title: enTitle,
      creator: enriched.en.authors?.join(', ') || workCreator,
      description: enriched.en.description ?? null,
      isbn: enriched.en.isbn ?? null, publisher: enriched.en.publisher ?? null,
      thumbnail_url: enriched.en.thumbnailUrl ?? null,
      verified: true,
      sources: { primary: 'openlibrary', title: enriched.en.sourceUrl, creator: enriched.en.sourceUrl, isbn: enriched.en.sourceUrl, wikidata: wikidataUrl },
    })
  }
  if (enriched.ko) {
    locales.push({
      content_id: contentId, locale: 'ko', title: koTitle,
      creator: kakaoCreator(enriched.ko),
      description: enriched.ko.contents || null,
      isbn: koIsbn, publisher: enriched.ko.publisher || null,
      thumbnail_url: enriched.ko.thumbnail || null,
      verified: true,
      sources: { primary: 'kakao_book', title: enriched.ko.url, creator: enriched.ko.url, isbn: enriched.ko.url, wikidata: wikidataUrl },
    })
  }
  return { contentId, content, locales, figureBook: { content_id: contentId } }
}

// ── 미완성 작품 복구 · 잘못 붙은 영문 카드 제거 ────────────────────────────

/**
 * 반영이 중간에 끊기면 contents만 들어가고 언어 카드·판본이 없는 미완성 작품이 남는다. 그런 작품은 책 정보를 다시 받아 채우고,
 * 못 받으면 관계째 지운다. 영어권 ISBN이 아닌 en 카드는 OpenLibrary 언어를 다시 확인해 영어가 아니면 뗀다.
 */
async function repair(db, canonical, enrichCachePath) {
  const enrichCache = existsSync(enrichCachePath) ? JSON.parse(readFileSync(enrichCachePath, 'utf8')) : {}
  const mine = await allRows('contents', (f, t) => db.from('contents').select('id,external_id,metadata').eq('type', 'BOOK').contains('metadata', { figureBook: { source: 'wikidata-works' } }).order('id').range(f, t))
  const ids = mine.map((row) => row.id)
  const locales = []
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await db.from('content_locales').select('content_id,locale,isbn').in('content_id', ids.slice(index, index + 200))
    if (error) throw new Error(error.message)
    locales.push(...(data ?? []))
  }
  const localesByContent = new Map()
  for (const row of locales) localesByContent.set(row.content_id, [...(localesByContent.get(row.content_id) ?? []), row])

  const must = async (label, promise) => { const { error } = await promise; if (error) throw new Error(`${label}: ${error.message}`) }
  const dropContent = async (id) => {
    await must('관계 삭제', db.from('figure_book_characters').delete().eq('content_id', id))
    await must('판본 삭제', db.from('figure_book_editions').delete().eq('content_id', id))
    await must('작품 표시 삭제', db.from('figure_book_contents').delete().eq('content_id', id))
    await must('locale 삭제', db.from('content_locales').delete().eq('content_id', id))
    await must('작품 삭제', db.from('contents').delete().eq('id', id))
  }
  const insertEditions = async (contentId, rows, title) => {
    for (const locale of rows) {
      const kind = MULTIPART.test(String(title ?? '')) ? {} : { edition_kind: 'full', text_scope: 'complete' }
      const { error } = await db.from('figure_book_editions').insert({
        content_id: contentId, locale: locale.locale, title: locale.title, creator: locale.creator, description: locale.description,
        isbn: locale.isbn, publisher: locale.publisher, thumbnail_url: locale.thumbnail_url, release_date: null, sort_order: 0, verified: true, sources: locale.sources, ...kind,
      })
      if (error && !/duplicate key/.test(error.message)) throw new Error(`판본 삽입: ${error.message}`)
    }
  }

  // 1) 미완성 작품: 언어 카드가 하나도 없는 작품
  const orphans = mine.filter((row) => !localesByContent.has(row.id))
  let filled = 0
  let dropped = 0
  let seen = 0
  console.log(`미완성 작품 ${orphans.length}`)
  for (const row of orphans) {
    seen += 1
    const qid = row.metadata?.figureBook?.wikidataQid
    const work = qid ? canonical.get(qid) : null
    if (!work) { await dropContent(row.id); dropped += 1; continue }
    const enriched = sanitizeEnriched(enrichCache[qid] ?? await enrich(work))
    enrichCache[qid] = enriched
    if (seen % 50 === 0) { writeFileSync(enrichCachePath, JSON.stringify(enrichCache), 'utf8'); console.log(`  미완성 작품 복구 ${seen}/${orphans.length} (채움 ${filled}, 삭제 ${dropped})`) }
    if (!enriched.ko && !enriched.en) { await dropContent(row.id); dropped += 1; continue }
    const built = buildRows(work, enriched)
    // 책 정보가 다른 기존 작품과 겹치면(ISBN 유니크) 이 행은 중복이다. 지운다.
    const { error: upsertError } = await db.from('contents').upsert(built.content, { onConflict: 'id' })
    if (upsertError) { await dropContent(row.id); dropped += 1; continue }
    await must('locale', db.from('content_locales').upsert(built.locales, { onConflict: 'content_id,locale', ignoreDuplicates: true }))
    await must('작품 표시', db.from('figure_book_contents').upsert({ content_id: row.id }, { onConflict: 'content_id', ignoreDuplicates: true }))
    await insertEditions(row.id, built.locales, built.content.metadata.figureBook.workTitle)
    filled += 1
  }
  writeFileSync(enrichCachePath, JSON.stringify(enrichCache), 'utf8')
  console.log(`미완성 작품 복구 — 채움 ${filled} / 삭제 ${dropped}`)

  // 2) 잘못 붙은 영문 카드: 영어권 ISBN이 아닌 en 카드는 OpenLibrary 언어를 다시 본다
  const suspects = locales.filter((row) => row.locale === 'en' && !/^(9780|9781|9798)/.test(bareIsbn(row.isbn)))
  let detached = 0
  let removed = 0
  console.log(`비영어권 ISBN en 카드 ${suspects.length}`)
  for (const row of suspects) {
    const again = await openLibraryByIsbn(bareIsbn(row.isbn)).catch(() => null)
    if (again && again.languages.includes('/languages/eng')) continue
    await must('en 판본 삭제', db.from('figure_book_editions').delete().eq('content_id', row.content_id).eq('locale', 'en'))
    await must('en locale 삭제', db.from('content_locales').delete().eq('content_id', row.content_id).eq('locale', 'en'))
    detached += 1
    const remaining = (localesByContent.get(row.content_id) ?? []).filter((l) => l.locale !== 'en')
    if (remaining.length === 0) { await dropContent(row.content_id); removed += 1 }
  }
  console.log(`잘못 붙은 영문 카드 제거 — 카드 뗌 ${detached} / 작품 삭제 ${removed}`)
}

// ── 본문 ─────────────────────────────────────────────────────────────────

async function main() {
  const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/wikidata-works.jsonl'))
  const reportPath = resolve(process.cwd(), argumentValue('report', '../../data/celeb/figure-books/wikidata-works-reconcile.json'))
  const mergePath = resolve(dirname(reportPath), 'merge-candidates-wikidata.json')
  const cachePath = resolve(dirname(reportPath), 'wikidata-works-detail.json')
  const enrichCachePath = resolve(dirname(reportPath), 'wikidata-works-enrich.json')
  const limit = Number(argumentValue('limit', '0')) || 0
  const onlySlug = argumentValue('slug')
  const concurrency = Number(argumentValue('concurrency', '6'))
  const db = dbClient()

  let people = readFileSync(inPath, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line))
  if (onlySlug) people = people.filter((row) => row.person.slug === onlySlug)
  const cache = await fillDetails(people, cachePath)
  const { canonical, folded } = foldWorks(people, cache)
  if (hasFlag('repair')) { await repair(db, canonical, enrichCachePath); return }
  const catalog = await loadCatalog(db)

  const matched = []          // { rule, contentId, qid, en, persons }
  const weak = []
  const merges = new Map()    // 저작 QID → 걸린 작품 ID들
  const contentQids = new Map()
  const fresh = []
  let noBibliography = 0
  for (const work of canonical.values()) {
    if (!work.en && !work.ko && !work.kowiki) continue
    const persons = [...work.persons.values()].map(({ person }) => person.slug)
    const { strong, weak: soft, hits } = match(work, catalog)
    // 한 저작이 작품 둘 이상에 걸리면 어느 쪽이 원작이고 어느 쪽이 해설서인지 제목·ISBN만으로는 모른다. 통합 후보로만 남기고 QID·관계는 붙이지 않는다.
    if (hits.length >= 2) { merges.set(work.qid, hits); weak.push({ rule: 'multi-hit', contentIds: hits, qid: work.qid, en: work.en, ko: work.ko ?? work.kowiki, persons }); continue }
    if (!strong) {
      if (soft) weak.push({ ...soft, qid: work.qid, en: work.en, ko: work.ko ?? work.kowiki, persons })
      else if (work.isbn13.size > 0 || work.olid.size > 0 || work.kowiki) fresh.push(work)
      else noBibliography += 1
      continue
    }
    const existingQid = catalog.metaById.get(strong.contentId)?.figureBook?.wikidataQid
    if (existingQid && existingQid.toUpperCase() !== work.qid.toUpperCase()) {
      weak.push({ rule: 'qid-conflict', contentId: strong.contentId, qid: work.qid, existingQid, en: work.en, persons }); continue
    }
    const list = contentQids.get(strong.contentId) ?? []
    list.push(work.qid)
    contentQids.set(strong.contentId, list)
    matched.push({ ...strong, qid: work.qid, en: work.en, persons })
  }
  // 한 작품에 저작 QID가 둘 이상 걸리면: 영문 제목이 모두 같으면 가장 오래된(낮은) QID를 대표로 두고, 다르면 어느 것도 붙이지 않는다.
  const ambiguous = new Set()
  const representative = new Map()
  for (const [contentId, qids] of contentQids) {
    if (qids.length < 2) continue
    const titles = new Set(qids.map((qid) => squash(canonical.get(qid).en).replace(/\(.*$/, '')))
    if (titles.size === 1) representative.set(contentId, [...qids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))[0])
    else ambiguous.add(contentId)
  }
  for (const row of matched.filter((row) => ambiguous.has(row.contentId))) weak.push({ ...row, rule: 'qid-ambiguous', weak: true })
  const attachable = matched.filter((row) => !ambiguous.has(row.contentId) && (!representative.has(row.contentId) || representative.get(row.contentId) === row.qid))
  // 대표가 아닌 QID의 저자 관계도 같은 작품에 붙어야 하므로 인물을 대표 저작에 합친다.
  for (const row of matched.filter((row) => representative.has(row.contentId) && representative.get(row.contentId) !== row.qid)) {
    mergePersons(canonical.get(representative.get(row.contentId)), canonical.get(row.qid))
  }

  // 통합 후보: 같은 저작이 DB 작품 둘 이상에 걸렸다. 관계가 많은 쪽을 남긴다. 실제 통합은 merge-works.mjs dry-run이 다시 본다.
  const mergeCandidates = [...merges].flatMap(([qid, ids]) => {
    const sorted = [...ids].sort((a, b) => (catalog.relationCount.get(b) ?? 0) - (catalog.relationCount.get(a) ?? 0))
    return sorted.slice(1).map((drop) => ({ keep: sorted[0], drop, identity: wikidataIdentity(qid), reason: `wikidata ${qid} (${canonical.get(qid).en ?? canonical.get(qid).ko ?? ''})` }))
  })

  // 창작 관계: 강한 일치 작품과 이번에 만들 작품 모두 대상이다. 이미 있는 쌍은 건드리지 않는다.
  // 없는 쌍은 만들고, related로 남은 쌍은 authored로 올린다. appearance는 건드리지 않는다.
  const relationPlan = (work, contentId) => [...work.persons.values()]
    .filter(({ props }) => [...props].some((prop) => AUTHOR_PROPS.has(prop)))
    .map(({ person }) => ({ celeb_id: person.id, content_id: contentId, existing: catalog.relationPairs.get(`${person.id}:${contentId}`) ?? null }))
    .filter((row) => row.existing === null || row.existing === 'related')
  const relationsForMatched = attachable.flatMap((row) => relationPlan(canonical.get(row.qid), row.contentId))

  const newWorks = limit > 0 ? fresh.slice(0, limit) : fresh
  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    totals: {
      people: people.length,
      rawWorks: people.reduce((sum, row) => sum + row.works.length, 0),
      works: canonical.size,
      foldedEditions: folded,
      matched: attachable.length,
      matchedByRule: attachable.reduce((acc, row) => ({ ...acc, [row.rule]: (acc[row.rule] ?? 0) + 1 }), {}),
      weak: weak.length,
      mergeCandidates: mergeCandidates.length,
      newWorks: fresh.length,
      noBibliography,
      relationsForMatched: relationsForMatched.length,
      relationsToUpgrade: relationsForMatched.filter((row) => row.existing === 'related').length,
    },
    weak,
    mergeCandidates,
    matched: attachable,
    newWorksSample: newWorks.slice(0, 200).map((work) => ({ qid: work.qid, en: work.en, ko: work.ko ?? work.kowiki, isbn13: [...work.isbn13], olid: [...work.olid], persons: [...work.persons.values()].map(({ person }) => person.slug) })),
  }
  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  writeFileSync(mergePath, JSON.stringify(mergeCandidates, null, 2), 'utf8')
  console.log(JSON.stringify(report.totals, null, 2))
  console.log(`WROTE ${reportPath}`)
  console.log(`WROTE ${mergePath}`)
  if (!apply) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  // 1) 겹친 작품에 QID를 붙인다. metadata는 읽어둔 값에 합쳐 통째로 쓴다.
  let tagged = 0
  for (const row of attachable) {
    const metadata = catalog.metaById.get(row.contentId) ?? {}
    if (metadata.figureBook?.wikidataQid === row.qid) continue
    const figureBook = { ...(metadata.figureBook ?? {}), wikidataQid: row.qid }
    if (!figureBook.workIdentity || /^book\//.test(figureBook.workIdentity)) figureBook.workIdentity = wikidataIdentity(row.qid)
    figureBook.workTitle ??= row.en ?? null
    const { error } = await db.from('contents').update({ metadata: { ...metadata, figureBook } }).eq('id', row.contentId)
    if (error) console.log(`  QID 부착 실패 ${row.contentId}: ${error.message}`)
    else tagged += 1
  }
  console.log(`QID 부착 ${tagged}건`)

  // 2) 새 작품 책 정보 채우기. 조회는 동시에, 삽입은 표 순서대로.
  // BOOK 책 정보는 카카오·OpenLibrary만 쓴다(AGENTS.md). 둘 다 못 받은 항목은 작품으로 만들지 않고 보고에만 남긴다.
  const enrichedWorks = []
  const unenrichable = []
  // 책 정보 받기는 저작당 OpenLibrary 두세 번이라 전량이면 한 시간이다. 결과를 캐시해 재실행 때는 다시 묻지 않는다.
  const enrichCache = existsSync(enrichCachePath) ? JSON.parse(readFileSync(enrichCachePath, 'utf8')) : {}
  const flushEnrichCache = () => writeFileSync(enrichCachePath, JSON.stringify(enrichCache), 'utf8')
  let cursor = 0
  let seen = 0
  const worker = async () => {
    while (cursor < newWorks.length) {
      const work = newWorks[cursor]
      cursor += 1
      const enriched = sanitizeEnriched(enrichCache[work.qid] ?? await enrich(work))
      enrichCache[work.qid] = enriched
      seen += 1
      if (seen % 50 === 0) flushEnrichCache()
      if (enriched.ko || enriched.en) enrichedWorks.push({ work, enriched })
      else unenrichable.push({ qid: work.qid, en: work.en, ko: work.ko ?? work.kowiki, persons: [...work.persons.values()].map(({ person }) => person.slug) })
      if (seen % 50 === 0) console.log(`  책 정보 받기 ${seen}/${newWorks.length} (확인 ${enrichedWorks.length})`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, newWorks.length) }, worker))
  flushEnrichCache()

  // 책 정보를 받은 뒤에야 같은 책임이 드러나는 경우가 있다. 카탈로그 ISBN에 걸리면 새 작품이 아니라 늦은 일치이고,
  // 이번 묶음 안에서 같은 OpenLibrary 저작·ISBN이면 앞의 것에 인물만 합친다.
  const built = []
  const lateMatched = []
  const seenKeys = new Map()
  for (const { work, enriched } of enrichedWorks) {
    const koIsbn = bareIsbn(String(enriched.ko?.isbn ?? '').split(' ').find((v) => v.length === 13) ?? '')
    const keys = [enriched.en?.isbn, enriched.en?.workKey, koIsbn, enriched.en?.isbn ?? koIsbn].filter(Boolean)
    const catalogHit = keys.map((key) => catalog.isbnToContent.get(key)).find(Boolean)
    if (catalogHit) { lateMatched.push({ rule: 'isbn-after-enrich', contentId: catalogHit, qid: work.qid, en: work.en, persons: [...work.persons.values()].map(({ person }) => person.slug) }); continue }
    const earlier = keys.map((key) => seenKeys.get(key)).find(Boolean)
    if (earlier) { mergePersons(earlier.work, work); continue }
    const row = { work, ...buildRows(work, enriched) }
    for (const key of keys) seenKeys.set(key, row)
    built.push(row)
  }
  for (const row of lateMatched) {
    const metadata = catalog.metaById.get(row.contentId) ?? {}
    if (metadata.figureBook?.wikidataQid) continue
    const figureBook = { ...(metadata.figureBook ?? {}), wikidataQid: row.qid }
    if (!figureBook.workIdentity || /^book\//.test(figureBook.workIdentity)) figureBook.workIdentity = wikidataIdentity(row.qid)
    const { error } = await db.from('contents').update({ metadata: { ...metadata, figureBook } }).eq('id', row.contentId)
    if (!error) { tagged += 1; catalog.metaById.set(row.contentId, { ...metadata, figureBook }) }
  }
  report.lateMatched = lateMatched
  report.totals.lateMatched = lateMatched.length
  report.unenrichable = unenrichable
  report.totals.unenrichable = unenrichable.length
  report.totals.built = built.length

  const contents = built.map((row) => row.content)
  const locales = built.flatMap((row) => row.locales)
  // 관계의 FK 대상이라 강한 일치 작품도 figure_book_contents에 있어야 한다.
  const figureBooks = [...new Set([...built.map((row) => row.contentId), ...attachable.map((row) => row.contentId), ...lateMatched.map((row) => row.contentId)])]
    .filter((id) => !catalog.figureBookIds.has(id)).map((content_id) => ({ content_id }))
  for (const [table, rows, conflict] of [
    ['contents', contents, 'id'],
    ['content_locales', locales, 'content_id,locale'],
    ['figure_book_contents', figureBooks, 'content_id'],
  ]) {
    for (let index = 0; index < rows.length; index += 200) {
      const { error } = await db.from(table).upsert(rows.slice(index, index + 200), { onConflict: conflict, ignoreDuplicates: true })
      if (error) throw new Error(`${table} 반영 실패(${index}): ${error.message}`)
    }
    console.log(`  ${table} ${rows.length}`)
  }
  if (built.length > 0) await backfillEditionKinds(db, built.map((row) => row.contentId), new Map(built.map((row) => [row.contentId, row.content.metadata.figureBook.workTitle])))

  // 3) 창작 관계. 인물별 sort_order 뒤에 붙여 기존 등장·큐레이션 순서를 밀지 않는다.
  const relations = [...relationsForMatched, ...built.flatMap((row) => relationPlan(row.work, row.contentId)), ...lateMatched.flatMap((row) => relationPlan(canonical.get(row.qid), row.contentId))]
  const rows = relations.filter((row) => row.existing === null).map(({ celeb_id, content_id }) => {
    const sort = catalog.nextSort.get(celeb_id) ?? 0
    catalog.nextSort.set(celeb_id, sort + 1)
    return { celeb_id, content_id, relation_type: 'authored', sort_order: sort, description: null, description_en: null }
  })
  for (let index = 0; index < rows.length; index += 200) {
    const { error } = await db.from('figure_book_characters').upsert(rows.slice(index, index + 200), { onConflict: 'content_id,celeb_id', ignoreDuplicates: true })
    if (error) throw new Error(`figure_book_characters 반영 실패(${index}): ${error.message}`)
  }
  let upgraded = 0
  for (const { celeb_id, content_id } of relations.filter((row) => row.existing === 'related')) {
    const { error } = await db.from('figure_book_characters').update({ relation_type: 'authored' }).eq('celeb_id', celeb_id).eq('content_id', content_id).eq('relation_type', 'related')
    if (error) throw new Error(`창작 승격 실패 ${content_id}: ${error.message}`)
    upgraded += 1
  }
  report.totals.relationsAdded = rows.length
  report.totals.relationsUpgraded = upgraded
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\n반영 완료 — QID 부착 ${tagged} / 새 작품 ${contents.length} (en 카드 ${built.filter((row) => row.locales.some((l) => l.locale === 'en')).length}, ko 카드 ${built.filter((row) => row.locales.some((l) => l.locale === 'ko')).length}) / 창작 관계 새로 ${rows.length}·연관에서 승격 ${upgraded}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
