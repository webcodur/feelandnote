/**
 * 인물 도서 EN 판본 결손 채우기 — ko 판본만 있는 인물 도서 작품의 OpenLibrary 영문판을 찾아
 * en 언어 카드와 en 판본을 붙인다.
 *   대상: figure_book_characters 관계가 있고 figure_book_editions에 ko는 있고 en이 없는 작품
 *   제외: book/<isbn> 국내서 정체성 + en 카드 없음 (영문판이 없는 정상 KO-only)
 *   검증: OpenLibrary가 eng로 확인한 ISBN만 쓴다. 언어가 비어 있으면 978-0·978-1·979-8만 본다.
 *   반영: --apply가 en 판본을 넣고 표시용 en 카드를 공식 값으로 덮는다(없으면 만든다).
 *
 * node --env-file=.env scripts/figure-books/en-edition-fill.mjs [--limit N] [--concurrency 3] [--ids a,b]
 * node --env-file=.env scripts/figure-books/en-edition-fill.mjs --apply [--limit N]
 */

const introductionModule = await import('@feelandnote/content-search/book-introduction')
const { fetchBookIntroduction } = introductionModule.default ?? introductionModule
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  allRows, argumentValue, bareIsbn, dbClient, hasFlag, inChunks, isbn10to13,
  openLibraryByIsbn, openLibraryEditionForWork, openLibrarySearch, squash, sleep, wbEntities,
} from './lib/figure-work.mjs'

const apply = hasFlag('apply')
const OPENLIBRARY_URL = 'https://openlibrary.org'
const USER_AGENT = 'feelandnote-figure-books/1.0 (https://feelandnote.com)'

async function olJson(path) {
  try {
    const response = await fetch(`${OPENLIBRARY_URL}${path}`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// OL이 프랑스어·스페인어판에 eng를 잘못 태그한 사례가 있어 제목 언어도 검사한다.
const FOREIGN_WORDS = new Set('le la les de des du un une sur aux avec dans chez der die das und mit für zu ist im am el los las del y con para por al que si dos versiones completa completas edicion traduccion introduccion jeune homme parfait'.split(' '))
const ENGLISH_WORDS = new Set('the of and a an in on for to with from by is are was were his her its their my your our at as be or not this that who what when where why how'.split(' '))
const FOREIGN_ISBN_GROUPS = /^(9782|9783|9784|9785|9786|9787|9788|9789|9791)/
const EN_PUBLISHERS_ABROAD = /taschen|prestel|könig|konig|kodansha international|foreign languages|abbeville|skira|rizzoli/i
const TRUSTED_EN_PUBLISHERS = /penguin|oxford|cambridge|university|press|knopf|harper(?!collins español)|random|simon|vintage|dover|yale|princeton|harvard|\bmit\b|new riders|tuttle|columbia/i
/** 제목이 영어가 아닌 것으로 보이면 참을 반환한다. 영미 신뢰 출판사는 이름 속 van/der 같은 어절을 제목 언어로 오인하지 않게 한다. */
function looksNonEnglishTitle(en) {
  const title = en?.title ?? ''
  const tokens = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z']+/).filter((t) => t.length > 1)
  const foreign = tokens.filter((t) => FOREIGN_WORDS.has(t)).length
  if (foreign === 0) return false
  if (foreign >= 2) return true
  const english = tokens.filter((t) => ENGLISH_WORDS.has(t)).length + (/'s\b/.test(title) ? 1 : 0)
  return english === 0 && !TRUSTED_EN_PUBLISHERS.test(en.publisher ?? '')
}
/** OpenLibrary가 영어판으로 확인했거나, 언어 미상이어도 영어권 국가군 ISBN인 판본만 인정한다. */
function isEnglishEdition(en) {
  if (!en?.isbn) return false
  const placeholder = /^(Unti|Anon)\d/.test(en.title ?? '') || (en.authors ?? []).some((name) => /^(Unti|Anon)\d|to be confirmed/i.test(name))
  if (placeholder) return false
  if (/[¿¡ß]/.test(en.title ?? '') || looksNonEnglishTitle(en)) return false
  // 비영어권 국가군 ISBN에 eng 태그가 붙은 것은 태그 오염일 수 있다 — 영문서를 내는 출판사만 인정한다.
  if (FOREIGN_ISBN_GROUPS.test(en.isbn) && !EN_PUBLISHERS_ABROAD.test(en.publisher ?? '')) return false
  if (en.languages.length > 0) return en.languages.includes('/languages/eng')
  return /^(9780|9781|9798)/.test(en.isbn)
}

/** 저작 키(/works/OL…W)에서 영어 판본 하나를 고른다. ISBN10만 있으면 13으로 올린다. */
async function englishEditionForWork(workKey) {
  const payload = await olJson(`${workKey}/editions.json?limit=50`)
  const entries = payload?.entries ?? []
  const english = entries.filter((entry) => {
    const langs = (entry.languages ?? []).map((language) => language.key)
    return langs.length === 0 || langs.includes('/languages/eng')
  })
  // 표지 있는 영어 판본을 우선한다
  const withIsbn = (english.length > 0 ? english : entries).filter((entry) => (entry.isbn_13 ?? []).length > 0 || (entry.isbn_10 ?? []).length > 0)
  withIsbn.sort((a, b) => Number(Boolean((b.covers ?? []).find((c) => Number.isInteger(c) && c > 0))) - Number(Boolean((a.covers ?? []).find((c) => Number.isInteger(c) && c > 0))))
  for (const entry of withIsbn.slice(0, 5)) {
    const isbn = bareIsbn(entry.isbn_13?.[0]) || isbn10to13(entry.isbn_10?.[0])
    if (!isbn || isbn.length !== 13) continue
    const hit = await openLibraryByIsbn(isbn).catch(() => null)
    if (isEnglishEdition(hit)) return hit
  }
  return null
}

/** 위키데이터 P648(OLID) 경로 — 작품 OLID면 판본에서 영어판을 고르고, 판본 OLID면 그 판본을 직접 본다. */
async function editionFromWikidataOlid(olid) {
  const key = String(olid)
  if (/w$/i.test(key)) return englishEditionForWork(`/works/${key}`)
  const edition = await olJson(`/books/${key}.json`)
  const workKey = (edition?.works ?? []).map((work) => work.key).find(Boolean)
  if (workKey) return englishEditionForWork(workKey)
  return null
}

async function findEnglishEdition(work, enCard) {
  const fb = work.fb
  // 1순위: 이미 확인된 ISBN(카드 또는 메타)
  for (const isbn of [enCard?.isbn, fb.enIsbn].map(bareIsbn).filter((v) => v?.length === 13)) {
    const hit = await openLibraryByIsbn(isbn).catch(() => null)
    if (isEnglishEdition(hit)) return { en: hit, via: 'stored-isbn' }
  }
  // 2순위: 위키데이터 P648 → OpenLibrary
  if (fb.wikidataQid) {
    const entities = await wbEntities([fb.wikidataQid]).catch(() => new Map())
    for (const olid of entities.get(fb.wikidataQid)?.olid ?? []) {
      const en = await editionFromWikidataOlid(olid).catch(() => null)
      if (isEnglishEdition(en)) return { en, via: 'wikidata-olid' }
    }
  }
  // 3순위: 저장된 OpenLibrary 저작 키
  if (fb.openLibraryWork) {
    const en = await englishEditionForWork(fb.openLibraryWork).catch(() => null)
    if (isEnglishEdition(en)) return { en, via: 'stored-ol-work' }
  }
  // 4순위: 제목+저자 검색. 표시 제목과 유통 제목이 다를 수 있어 제목 후보를 전부 순회한다.
  const titles = [...new Set([enCard?.title, fb.workTitle, fb.originalTitle].map((v) => String(v ?? '').trim()).filter(Boolean))]
  const authors = [enCard?.creator, fb.workCreator, fb.originalCreator].map((v) => String(v ?? '').trim()).filter(Boolean)
  const author = authors[0] ?? null
  if (!titles.length) return { en: null, via: 'no-title' }
  // 저자 비교는 토큰 교집합이다 — "Ono Yasumaro"와 "Yasumaro Ō"처럼 명·성 순서가 갈려도 걸린다.
  // en 카드 저자·원저자 등 알려진 저자 전부를 기대 토큰으로 쓴다.
  const wantAuthorWords = authors.length
    ? new Set(authors.flatMap((a) => a.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9가-힣]+/)).filter((t) => t.length > 1))
    : null
  const authorMatches = (names) => wantAuthorWords
    && names.some((name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9가-힣]+/).some((t) => t.length > 1 && wantAuthorWords.has(t)))
  for (const title of titles) {
    const wantTitle = squash(title)
    // 필드 검색(제목+저자·제목 단독)과 통합 검색을 모두 본다 — 고전은 OL author가 번역자라 저자 조건이 걸러낸다.
    const docs = [
      ...(await openLibrarySearch(title, author).catch(() => [])),
      ...(await openLibrarySearch(title, null).catch(() => [])),
      ...(author ? await olJson(`/search.json?${new URLSearchParams({ q: `${title} ${author}`, limit: '5', fields: 'key,title,author_name,first_publish_year,language' })}`).then((p) => (p?.docs ?? []).map((doc) => ({ workKey: doc.key, title: doc.title, authors: doc.author_name ?? [], year: doc.first_publish_year ?? null, isbns: [], languages: doc.language ?? [] }))).catch(() => []) : []),
    ]
    const seen = new Set()
    const titleMatches = docs.filter((candidate) => {
      if (!candidate.workKey || seen.has(candidate.workKey)) return false
      seen.add(candidate.workKey)
      const gotTitle = squash(candidate.title)
      return wantTitle && (gotTitle === wantTitle || gotTitle.includes(wantTitle) || wantTitle.includes(gotTitle))
    })
    // 후보 순위: 저자 토큰이 겹치는 저작 → 제목 완전 일치+eng 저작(최구판 순). 고전은 OL author가
    // 번역자라 저자가 어긋나고, 동명 현대 소설(Keith Yatsuhashi의 Kojiki 2016)은 최구판이 아니라 뒤로 간다.
    const ranked = [
      ...titleMatches.filter((candidate) => authorMatches(candidate.authors)),
      ...[...titleMatches.filter((candidate) => squash(candidate.title) === wantTitle && (candidate.languages ?? []).includes('eng'))]
        .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)),
    ]
    const tried = new Set()
    for (const doc of ranked) {
      if (tried.has(doc.workKey)) continue
      tried.add(doc.workKey)
      const en = await englishEditionForWork(doc.workKey).catch(() => null)
      // 저자 토큰이 안 겹치는 제목 일치는 동명이서 위험이 있어 자동 반영하지 않고 검토 큐로 내린다.
      if (isEnglishEdition(en)) return { en, via: authorMatches(doc.authors) ? 'ol-search' : 'ol-search-title-only' }
    }
  }
  return { en: null, via: 'ol-search-miss', searched: { title: titles[0], author } }
}

async function main() {
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/en-edition-fill.jsonl'))
  const backupPath = resolve(process.cwd(), argumentValue('backup', '../../data/celeb/figure-books/_backup/en-edition-fill-before.json'))
  const limit = Number(argumentValue('limit', '0')) || 0
  const concurrency = Number(argumentValue('concurrency', '3'))
  const onlyIds = new Set((argumentValue('ids', '') ?? '').split(',').map((v) => v.trim()).filter(Boolean))
  const db = dbClient()

  // ── 대상 수집 ──────────────────────────────────────────────────────────
  const figureIds = (await allRows('figure_book_contents', (f, t) => db.from('figure_book_contents').select('content_id').order('content_id').range(f, t))).map((row) => row.content_id)
  const editions = await allRows('figure_book_editions', (f, t) => db.from('figure_book_editions').select('content_id,locale').order('content_id').range(f, t))
  const edLocales = new Map()
  for (const row of editions) {
    const set = edLocales.get(row.content_id) ?? new Set()
    set.add(row.locale); edLocales.set(row.content_id, set)
  }
  const targetIds = figureIds.filter((id) => {
    const set = edLocales.get(id) ?? new Set()
    return set.has('ko') && !set.has('en')
  })
  const contents = await inChunks(targetIds, 200, (ids) => db.from('contents').select('id,metadata').in('id', ids))
  const locales = await inChunks(targetIds, 200, (ids) => db.from('content_locales').select('content_id,locale,title,creator,isbn,publisher,sources').in('content_id', ids))
  const enCardById = new Map(locales.filter((row) => row.locale === 'en').map((row) => [row.content_id, row]))
  const koCardById = new Map(locales.filter((row) => row.locale === 'ko').map((row) => [row.content_id, row]))

  const targets = contents.map((row) => ({ id: row.id, fb: row.metadata?.figureBook ?? {} }))
    .filter((work) => onlyIds.size === 0 || onlyIds.has(work.id))

  const done = new Map()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { const row = JSON.parse(line); done.set(row.contentId, row) } catch { /* 다시 */ }
    }
  }

  if (!apply) {
    const pending = targets.filter((work) => !done.has(work.id))
    const work = limit > 0 ? pending.slice(0, limit) : pending
    console.log(`en 판본 결손 ${targets.length} / 완료 ${done.size} / 이번 실행 ${work.length} (동시 ${concurrency})`)
    mkdirSync(dirname(outPath), { recursive: true })

    let cursor = 0
    let resolved = 0
    let skipped = 0
    let titleOnlyCount = 0
    const handle = async (work) => {
      const enCard = enCardById.get(work.id) ?? null
      const koCard = koCardById.get(work.id) ?? null
      const base = { contentId: work.id, identity: work.fb.workIdentity ?? null, qid: work.fb.wikidataQid ?? null, koTitle: koCard?.title ?? work.fb.workTitle ?? null, enCardTitle: enCard?.title ?? null }
      // 국내서 정체성 + 카드 없음 = 영문판이 없는 정상 KO-only
      if (!enCard && String(work.fb.workIdentity ?? '').startsWith('book/')) {
        skipped += 1
        appendFileSync(outPath, `${JSON.stringify({ ...base, verdict: 'domestic' })}\n`, 'utf8')
        return
      }
      const { en, via, searched } = await findEnglishEdition(work, enCard)
      const titleOnly = via === 'ol-search-title-only'
      const record = { ...base, via, searched: searched ?? null, en, verdict: en ? (titleOnly ? 'title-only' : 'resolved') : 'unresolved' }
      appendFileSync(outPath, `${JSON.stringify(record)}\n`, 'utf8')
      if (en && !titleOnly) resolved += 1
      if (titleOnly) titleOnlyCount += 1
      console.log(`${en ? (titleOnly ? '▵' : '✔') : '△'} ${(base.koTitle ?? work.id).slice(0, 28)} → ${en ? `${en.title} (${en.isbn}) [${via}]` : via}`)
    }
    const worker = async () => {
      while (cursor < work.length) {
        const item = work[cursor]
        cursor += 1
        try { await handle(item) } catch (error) { console.log(`✖ ${item.id} — ${error instanceof Error ? error.message.slice(0, 80) : error}`) }
        await sleep(150)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, work.length) }, worker))
    console.log(`\n영문판 확인 ${resolved} / 제목만 일치(검토 필요) ${titleOnlyCount} / 국내서 건너뜀 ${skipped}`)
    console.log(`WROTE ${outPath}`)
    return
  }

  // ── 반영 ──────────────────────────────────────────────────────────────
  const rowsAll = [...done.values()].filter((row) => row.verdict === 'resolved' && row.en?.isbn && (onlyIds.size === 0 || onlyIds.has(row.contentId)))
  const batch = limit > 0 ? rowsAll.slice(0, limit) : rowsAll
  console.log(`반영 대상 ${batch.length} (원장 resolved ${rowsAll.length})`)
  if (batch.length === 0) return

  // 반영 전 상태 스냅샷
  mkdirSync(dirname(backupPath), { recursive: true })
  const beforeIds = batch.map((row) => row.contentId)
  const beforeLocales = await inChunks(beforeIds, 200, (ids) => db.from('content_locales').select('*').in('content_id', ids))
  const beforeEditions = await inChunks(beforeIds, 200, (ids) => db.from('figure_book_editions').select('*').in('content_id', ids))
  appendFileSync(backupPath, `${JSON.stringify({ at: new Date().toISOString(), locales: beforeLocales, editions: beforeEditions })}\n`, 'utf8')

  let enAdded = 0
  let cardUpdated = 0
  for (const row of batch) {
    const en = row.en
    // 적용 시점의 DB로 다시 건다 — 이미 en 판본이 있으면 건너뛴다
    const { data: existing } = await db.from('figure_book_editions').select('id').eq('content_id', row.contentId).eq('locale', 'en').eq('isbn', en.isbn).maybeSingle()
    const sources = { primary: 'openlibrary', title: en.sourceUrl, creator: en.sourceUrl, isbn: en.sourceUrl, publisher: en.sourceUrl, thumbnail: en.sourceUrl }
    const introduction = await fetchBookIntroduction({ isbn: en.isbn, locale: 'en' }).catch(() => null)
    if (introduction?.source && introduction?.sourceUrl) sources.description = introduction.sourceUrl

    const card = enCardById.get(row.contentId) ?? null
    if (card) {
      // 표시용 제목 행을 공식 값으로 덮는다. 제목(통용 영어 표제)은 유지하고 판본 값만 채운다.
      const update = { isbn: en.isbn, creator: en.authors.join(', ') || card.creator, publisher: en.publisher, thumbnail_url: card.thumbnail_url ?? en.thumbnailUrl, verified: true, sources: { ...(card.sources ?? {}), ...sources } }
      const { error } = await db.from('content_locales').update(update).eq('content_id', row.contentId).eq('locale', 'en')
      if (error) { console.log(`  en 카드 갱신 실패 ${row.contentId}: ${error.message}`); continue }
      cardUpdated += 1
    } else {
      const locale = { description: introduction?.source ?? null, content_id: row.contentId, locale: 'en', title: en.title, creator: en.authors.join(', '), isbn: en.isbn, publisher: en.publisher, thumbnail_url: en.thumbnailUrl, verified: true, sources }
      const { error } = await db.from('content_locales').upsert(locale, { onConflict: 'content_id,locale', ignoreDuplicates: true })
      if (error) { console.log(`  en 카드 생성 실패 ${row.contentId}: ${error.message}`); continue }
      cardUpdated += 1
    }
    if (existing) { console.log(`· ${row.koTitle ?? row.contentId} — en 판본 이미 있음`); continue }
    const meta = contents.find((c) => c.id === row.contentId)?.metadata?.figureBook ?? {}
    const e = await db.from('figure_book_editions').insert({ description: introduction?.source ?? null, content_id: row.contentId, locale: 'en', title: en.title, creator: en.authors.join(', ') || null, isbn: en.isbn, publisher: en.publisher, thumbnail_url: en.thumbnailUrl, release_date: null, edition_kind: meta.editionKind ?? 'full', text_scope: meta.textScope ?? 'complete', sort_order: 0, verified: true, sources })
    if (e.error && !/duplicate key/.test(e.error.message)) { console.log(`  en 판본 실패 ${row.contentId} (${en.isbn}): ${e.error.message}`); continue }
    enAdded += 1
    console.log(`✔ ${row.koTitle ?? row.contentId} → ${en.title} (${en.isbn})`)
  }
  console.log(`\nen 판본 추가 ${enAdded} / en 카드 갱신·생성 ${cardUpdated}`)
  console.log(`백업 ${backupPath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
