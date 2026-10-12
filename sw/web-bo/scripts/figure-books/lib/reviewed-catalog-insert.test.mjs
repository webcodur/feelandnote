import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SNAPSHOT_TABLES } from './merge-work-sql.mjs'
import { applyReviewedCatalogInsert, bindReviewedCatalogInsertIdentity, buildReviewedCatalogInsertSql, planReviewedCatalogInsert, verifyReviewedCatalogInsertReadback } from './reviewed-catalog-insert.mjs'

const ids = ['existing-a', 'existing-b']
const timestamp = '2026-10-11T07:00:00+00:00'
function fixture() {
  const before = Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
  before.contents = [
    { id: ids[0], type: 'BOOK', release_date: '2013-10-10', metadata: { figureBook: { workTitle: 'Existing original A', workCreator: 'Original Author A' } }, member_count: 1, celeb_count: 1 },
    { id: ids[1], type: 'BOOK', release_date: null, metadata: { figureBook: { workTitle: 'Existing original B', workCreator: 'Original Author B' } } },
  ]
  before.content_locales = [
    { content_id: ids[0], locale: 'en', title: 'Original A', creator: 'Original Author A', isbn: '9780451464163', publisher: ' English Publisher ',
      description: 'A complete introduction already written by a person.', thumbnail_url: null, verified: false,
      sources: { primary: 'openlibrary', isbn: 'https://openlibrary.org/books/OL1234M', description: 'https://publisher.example/a', translators: [] } },
    { content_id: ids[0], locale: 'ko', title: '한국어 번역 A', creator: '원저자 A', isbn: '9791167972064', publisher: '한국 출판사',
      description: '기존 한국어 소개는 글자와 출처를 그대로 보존한다.', thumbnail_url: 'https://publisher.example/cover.jpg', verified: true,
      sources: { primary: 'kakao_book', title: 'https://search.daum.net/search?w=bookpage&bookId=123', translators: ['실제 역자'], description: 'https://publisher.example/ko-a' } },
    { content_id: ids[1], locale: 'ko', title: '기존 국내 저작', creator: '국내 작가', isbn: '9788932042596', publisher: '국내 출판사',
      description: null, thumbnail_url: null, verified: true,
      sources: { primary: 'kakao_book', isbn: 'https://dapi.kakao.com/v3/search/book?target=isbn&query=9788932042596' } },
    { content_id: ids[1], locale: 'en', title: 'Display title only', creator: 'Author', isbn: null, sources: { primary: 'none', title: 'translated' }, description: 'Preserved display introduction.' },
  ]
  before.celeb_contents = [{ id: 1, content_id: ids[0], celeb_id: 'celeb', review: '감상 원문', review_en: 'Original reading account', source_url: 'https://example.org/account', visibility: 'public', rating: 5 }]
  before.member_contents = [{ id: 2, content_id: ids[0], member_id: 'member', status: 'completed', rating: 5 }]
  before.flows = [{ id: 3, tiers: { shelf: [ids[0], 'other', ids[1]] } }]
  before.activity_logs = [{ id: 4, content_id: ids[0], data: { ordered: [1, 2] } }]
  const reviews = [
    { contentId: ids[0], locale: 'en', textLanguage: 'en', isbn: '9780451464163', title: 'Original A', creator: 'Original Author A',
      workTitle: 'Existing original A', workCreator: 'Original Author A', sourceUrl: 'https://publisher.example/a', reason: 'Exact publisher ISBN and English original reviewed; scope has not been asserted.', editionKind: null, textScope: null },
    { contentId: ids[0], locale: 'ko', textLanguage: 'ko', isbn: '9791167972064', title: '한국어 번역 A', creator: '원저자 A', translators: ['실제 역자'],
      workTitle: 'Existing original A', workCreator: 'Original Author A', sourceUrl: 'https://publisher.example/ko-a', reason: '정확한 ISBN과 실제 역자·전체 번역 목차를 확인했다.', editionKind: 'full', textScope: 'complete' },
    { contentId: ids[1], locale: 'ko', textLanguage: 'ko', isbn: '9788932042596', title: '기존 국내 저작', creator: '국내 작가',
      workTitle: 'Existing original B', workCreator: 'Original Author B', sourceUrl: 'https://publisher.example/b', reason: '실제 한국어 원문과 시작권 목차를 확인했다.', editionKind: 'volume', textScope: '한국어 원작 분권 1권; 시작권 대표' },
  ]
  return { before, reviews }
}
function committed(before, reviews) {
  const plan = planReviewedCatalogInsert(ids, before, reviews), after = structuredClone(before)
  for (const content_id of plan.newParentIds) after.figure_book_contents.push({ content_id, created_at: timestamp, updated_at: timestamp })
  plan.editions.forEach((row, index) => after.figure_book_editions.push({ ...row, id: 100 + index, created_at: timestamp, updated_at: timestamp }))
  return after
}

function isbnlessFixture() {
  const { before } = fixture()
  before.contents[0].metadata.figureBook = { workTitle: 'Apology; Protagoras', workCreator: 'Plato' }
  const providerUrl = 'https://search.daum.net/search?w=bookpage&bookId=74319'
  Object.assign(before.content_locales[0], { isbn: null, sources: { primary: 'none', title: 'original' } })
  Object.assign(before.content_locales[1], { title: '플라톤(상)', creator: '플라톤', isbn: null, publisher: '명지', verified: true,
    sources: { primary: 'kakao_book', title: providerUrl, provider_product_id: '74319', provider_edition_url: providerUrl,
      translators: ['박양운'], description: 'https://www.nl.go.kr/contents/CNTS-00055343841' } })
  const review = { contentId: ids[0], locale: 'ko', textLanguage: 'ko', isbn: null, title: '플라톤(상)', creator: '플라톤',
    workTitle: 'Apology; Protagoras', workCreator: 'Plato', translators: ['박양운'],
    sourceUrl: 'https://www.nl.go.kr/contents/CNTS-00055343841',
    reason: '국립중앙도서관 판권과 목차를 읽고 1975년 명지문고 21의 박양운 번역, 222쪽짜리 플라톤(상) 실물 판본임을 확인했다. 본문에는 소크라테스의 변명과 프로타고라스 두 대화편이 수록되어 있다.',
    editionKind: 'volume', textScope: '플라톤 대화편 선집 상권; 『소크라테스의 변명』·『프로타고라스』 합본, 시작권 대표' }
  review.isbnlessPhysicalEditionReview = { method: 'independent_isbnless_physical_edition_review', llmReviewed: true,
    contentId: review.contentId, locale: review.locale, isbn: null, title: review.title, creator: review.creator,
    workTitle: review.workTitle, workCreator: review.workCreator, translators: [...review.translators], publisher: '명지',
    providerProductId: '74319', providerUrl, sourceUrl: review.sourceUrl, reason: review.reason,
    editionKind: review.editionKind, textScope: review.textScope }
  return { before, reviews: [review] }
}

function englishIsbnlessFixture() {
  const { before } = fixture()
  before.contents[0].metadata.figureBook = { workTitle: 'Paradise Lost', workCreator: 'John Milton' }
  const providerProductId = 'OL20458778M', providerUrl = `https://openlibrary.org/books/${providerProductId}`
  // 실제 OL의 1826년 영어 서지를 사용한다. 독립 판권·본문 근거는 명시적인 테스트 대역이다.
  const sourceUrl = 'https://library.example/fixtures/milton-1826-title-page-and-text'
  Object.assign(before.content_locales[0], { title: 'Paradise Lost: A Poem in Twelve Books', creator: 'John Milton', isbn: null,
    publisher: 'T. Bedlington', verified: true, sources: { primary: 'openlibrary', title: providerUrl,
      provider_product_id: providerProductId, provider_edition_url: providerUrl,
      provider_edition_key: `/books/${providerProductId}`, provider_language_keys: ['/languages/eng'],
      provider_physical_format: null, translators: [], description: sourceUrl } })
  Object.assign(before.content_locales[1], { isbn: null, sources: { primary: 'none', title: 'translated' } })
  const card = before.content_locales[0]
  const review = { contentId: ids[0], locale: 'en', textLanguage: 'en', isbn: null, title: card.title, creator: card.creator,
    workTitle: 'Paradise Lost', workCreator: 'John Milton', translators: [], sourceUrl,
    reason: '독립 도서관의 판권·영문 본문 검토를 대체하는 테스트 입력이다. 1826년 T. Bedlington 영어 종이책 판본이며, 수록 권 범위를 확인하지 않아 kind와 scope는 null로 둔다.',
    editionKind: null, textScope: null }
  review.isbnlessPhysicalEditionReview = { method: 'independent_isbnless_physical_edition_review', llmReviewed: true,
    contentId: review.contentId, locale: review.locale, isbn: null, title: review.title, creator: review.creator,
    workTitle: review.workTitle, workCreator: review.workCreator, translators: [], publisher: card.publisher,
    providerProductId, providerUrl, providerEditionKey: `/books/${providerProductId}`, providerLanguageKeys: ['/languages/eng'],
    providerPhysicalFormat: null, physicalMedium: 'paper', sourceUrl, reason: review.reason, editionKind: null, textScope: null }
  return { before, reviews: [review] }
}

test('independently reviewed pre-ISBN English paper edition binds the actual OpenLibrary M and raw language', async () => {
  const { before, reviews } = englishIsbnlessFixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), plan)
  assert.deepEqual(plan.editions[0].sources.isbnless_physical_edition_evidence, reviews[0].isbnlessPhysicalEditionReview)
  assert.equal(plan.editions[0].isbn, null); assert.equal(plan.editions[0].edition_kind, null)
  const after = committed(before, reviews); let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, compact, {
    capture: async () => ++reads === 1 ? before : after,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED',
  })
  assert.equal(result.checkedTables, 18); assert.deepEqual(before, original)
  assert.deepEqual(result.insertedEditions, [{ contentId: ids[0], locale: 'en', isbn: null, id: 100 }])
  before.figure_book_contents.push({ content_id: ids[0], created_at: timestamp, updated_at: timestamp })
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /INSERT INTO public.figure_book_editions/)
  assert.doesNotMatch(sql, /ISBN already registered|isbn=NULL|isbn IN \(\)/)
})

test('ISBN-less English proof rejects display cards, foreign or unknown language, changed M keys and forged provider URLs', () => {
  const changes = [
    s => { s.content_locales[0].sources.primary = 'none' },
    s => { s.content_locales[0].sources.primary = 'kakao_book' },
    s => { s.content_locales[0].sources.title = 'display_only' },
    s => { s.content_locales[0].verified = false },
    (s, r) => { delete r.isbnlessPhysicalEditionReview },
    (s, r) => { r.isbnlessPhysicalEditionReview.locale = 'ko' },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = 'OL20458778W' },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = 'OL16920547M' },
    s => { s.content_locales[0].sources.provider_edition_key = '/books/OL16920547M' },
    s => { delete s.content_locales[0].sources.provider_edition_key },
    s => { delete s.content_locales[0].sources.provider_language_keys },
    (s, r) => { s.content_locales[0].sources.provider_language_keys = r.isbnlessPhysicalEditionReview.providerLanguageKeys = [] },
    (s, r) => { s.content_locales[0].sources.provider_language_keys = r.isbnlessPhysicalEditionReview.providerLanguageKeys = ['/languages/fre'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerLanguageKeys = ['/languages/eng', '/languages/fre'] },
    (s, r) => { delete r.isbnlessPhysicalEditionReview.providerPhysicalFormat },
    s => { delete s.content_locales[0].sources.provider_physical_format },
    (s, r) => { r.isbnlessPhysicalEditionReview.physicalMedium = 'digital' },
    (s, r) => { r.isbnlessPhysicalEditionReview.translators = ['Unverified Translator'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.publisher = 'Different Publisher' },
  ]
  for (const format of ['Microform', 'Microfilm', 'Microfiche', 'Audio CD', 'eBook', 'Electronic resource', 'Digital'])
    changes.push((s, r) => { s.content_locales[0].sources.provider_physical_format = r.isbnlessPhysicalEditionReview.providerPhysicalFormat = format })
  for (const url of ['https://openlibrary.org/books/OL16920547M', 'https://openlibrary.org/works/OL20458778W',
    'https://openlibrary.org/books/OL20458778M?lang=en', 'https://openlibrary.org/books/OL20458778M#paper',
    'http://openlibrary.org/books/OL20458778M', 'https://openlibrary.org.example/books/OL20458778M'])
    changes.push((s, r) => { s.content_locales[0].sources.provider_edition_url = r.isbnlessPhysicalEditionReview.providerUrl = url })
  for (const change of changes) {
    const { before, reviews } = englishIsbnlessFixture(); change(before, reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /ISBN-less physical|verified translators/)
  }
})

test('ISBN-less English paper proof remains subject to full CAS and all protected relationships', async () => {
  for (const change of [s => { s.celeb_contents[0].review = '변경' }, s => { s.celeb_contents[0].source_url = 'https://other.example' },
    s => { s.celeb_contents[0].visibility = 'private' }, s => { s.member_contents[0].rating = 1 },
    s => { s.content_locales[0].sources.provider_language_keys = [] },
    s => { s.figure_book_editions[0].sources.isbnless_physical_edition_evidence.providerEditionKey = '/books/OL16920547M' }]) {
    const { before, reviews } = englishIsbnlessFixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
  const { before, reviews } = englishIsbnlessFixture(), compact = compactReviews(before, reviews)
  before.content_locales[0].sources.provider_edition_key = '/books/OL16920547M'
  let writes = 0
  await assert.rejects(applyReviewedCatalogInsert(null, ids, compact, { capture: async () => before,
    execute: () => { writes++; return '' } }), /ISBN-less physical/)
  assert.equal(writes, 0)
})

test('independently read ISBN-less Kakao physical editions retain NULL and exact provider/source identity', async () => {
  const { before, reviews } = isbnlessFixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), plan)
  assert.equal(plan.editions[0].isbn, null)
  assert.deepEqual(plan.editions[0].sources.isbnless_physical_edition_evidence, reviews[0].isbnlessPhysicalEditionReview)
  assert.equal(plan.editions[0].sources.edition_text_scope_evidence.isbn, null)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /AND isbn IS NULL;/)
  assert.match(sql, /active automatic edition seed required/)
  assert.doesNotMatch(sql, /isbn=E'null'|isbn=NULL|isbn IN \(\)|ISBN already registered/)
  const after = committed(before, reviews), paths = []; let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, compact, {
    capture: async () => ++reads === 1 ? before : after,
    execute(path) { paths.push(path); return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' },
  })
  assert.deepEqual(result.insertedEditions, [{ contentId: ids[0], locale: 'ko', isbn: null, id: 100 }])
  assert.equal(result.checkedTables, 18); assert.equal(reads, 2)
  assert.ok(paths.every(path => !existsSync(path))); assert.deepEqual(before, original)
})

test('unrelated NULL editions and two distinct ISBN-less works are not global ISBN duplicates', () => {
  const { before, reviews } = isbnlessFixture()
  before.figure_book_contents.push({ content_id: ids[1], created_at: timestamp, updated_at: timestamp })
  before.figure_book_editions.push({ id: 99, content_id: ids[1], locale: 'en', isbn: null, title: 'Unrelated physical original' })
  assert.equal(planReviewedCatalogInsert(ids, before, reviews).editions.length, 1)
  const second = structuredClone(reviews[0]), card = before.content_locales[2]
  Object.assign(card, structuredClone(before.content_locales[1]), { content_id: ids[1], title: '두 번째 실물', creator: '다른 작가',
    sources: { ...structuredClone(before.content_locales[1].sources), provider_product_id: '74320',
      provider_edition_url: 'https://search.daum.net/search?w=bookpage&bookId=74320' } })
  Object.assign(second, { contentId: ids[1], title: card.title, creator: card.creator,
    workTitle: 'Existing original B', workCreator: 'Original Author B' })
  Object.assign(second.isbnlessPhysicalEditionReview, { contentId: second.contentId, title: second.title, creator: second.creator,
    workTitle: second.workTitle, workCreator: second.workCreator, providerProductId: '74320', providerUrl: card.sources.provider_edition_url })
  const selected = [...reviews, second], sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.equal(planReviewedCatalogInsert(ids, before, selected).editions.length, 2)
  assert.match(sql, /INSERT INTO public.figure_book_editions/)
  assert.doesNotMatch(sql, /ISBN already registered/)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, selected, committed(before, selected)).checkedTables, 18)
  assert.throws(() => planReviewedCatalogInsert(ids, before, [...selected, second]), /duplicate locale/)
})

test('ISBN-less display cards, missing independent proof and stale live/proof identities are refused', () => {
  const changes = [
    (s, r) => { delete r.isbnlessPhysicalEditionReview },
    (s, r) => { r.isbnlessPhysicalEditionReview.llmReviewed = false },
    (s, r) => { r.isbnlessPhysicalEditionReview.method = 'machine_review' },
    s => { s.content_locales[1].sources.primary = 'none' },
    s => { s.content_locales[1].sources.primary = 'openlibrary' },
    s => { s.content_locales[1].sources.title = 'display_only' },
    s => { s.content_locales[1].sources.title = 'kakao_title_search' },
    s => { s.content_locales[1].verified = false },
    s => { s.content_locales[1].publisher = null },
    s => { delete s.contents[0].metadata.figureBook.workTitle },
    s => { s.content_locales[1].sources.provider_product_id = '999' },
    s => { delete s.content_locales[1].sources.provider_edition_url },
    s => { s.content_locales[1].sources.translators = ['다른 역자'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = 74319 },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = '999' },
    (s, r) => { r.isbnlessPhysicalEditionReview.translators = ['다른 역자'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.publisher = '다른 출판사' },
  ]
  for (const field of ['contentId', 'locale', 'isbn', 'title', 'creator', 'workTitle', 'workCreator', 'sourceUrl', 'reason', 'editionKind', 'textScope'])
    changes.push((s, r) => { r.isbnlessPhysicalEditionReview[field] = 'different' })
  for (const change of changes) {
    const { before, reviews } = isbnlessFixture(); change(before, reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /ISBN-less physical|verified translators/)
  }
  for (const url of ['http://search.daum.net/search?w=bookpage&bookId=74319',
    'https://search.daum.net/search?w=bookpage&bookId=999', 'https://search.daum.net/other?w=bookpage&bookId=74319',
    'https://search.daum.net/search?w=book&bookId=74319', 'https://example.org/search?w=bookpage&bookId=74319']) {
    const { before, reviews } = isbnlessFixture()
    before.content_locales[1].sources.provider_edition_url = reviews[0].isbnlessPhysicalEditionReview.providerUrl = url
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /ISBN-less physical/)
  }
  for (const sourceUrl of ['https://search.daum.net/search?w=bookpage&bookId=74319',
    'https://dapi.kakao.com/v3/search/book?query=플라톤', 'https://openlibrary.org/books/OL123M']) {
    const { before, reviews } = isbnlessFixture()
    reviews[0].sourceUrl = reviews[0].isbnlessPhysicalEditionReview.sourceUrl = sourceUrl
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /independent|ISBN-less physical/)
  }
  const real = fixture(); real.reviews[1].isbnlessPhysicalEditionReview = isbnlessFixture().reviews[0].isbnlessPhysicalEditionReview
  assert.throws(() => planReviewedCatalogInsert(ids, real.before, real.reviews), /explicitly null ISBN/)
})

test('ISBN-less physical insertion retains full snapshot CAS and all protected rows', async () => {
  for (const table of SNAPSHOT_TABLES) {
    const { before, reviews } = isbnlessFixture(), after = committed(before, reviews)
    after[table].push({ id: 'unexpected' })
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ|identity/)
  }
  for (const change of [s => { s.celeb_contents[0].review = '감상 변경' }, s => { s.celeb_contents[0].source_url = 'https://other.example' },
    s => { s.celeb_contents[0].visibility = 'private' }, s => { s.member_contents[0].rating = 1 },
    s => { s.contents[0].member_count = 0 }, s => { s.content_locales[1].isbn = '9780140449273' },
    s => { s.figure_book_editions[0].sources.isbnless_physical_edition_evidence.reason = '변경' }]) {
    const { before, reviews } = isbnlessFixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
  const { before, reviews } = isbnlessFixture(), after = committed(before, reviews); let reads = 0
  after.celeb_contents[0].review_en = 'Unexpected change'
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => { reads++; return before },
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' }), /celeb_contents rows differ/)
  assert.equal(reads, 1)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  assert.doesNotMatch(sql, /DISABLE TRIGGER|UPDATE public\.(?:contents|content_locales|celeb_contents|member_contents)/)
})

test('one parent per original seeds both reviewed real languages while preserving display cards and unknown scope', () => {
  const { before, reviews } = fixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews)
  assert.deepEqual(plan.parentIds, ids); assert.equal(plan.editions.length, 3)
  assert.equal(plan.editions[0].edition_kind, null); assert.equal(plan.editions[0].text_scope, null)
  assert.equal(plan.editions[0].publisher, 'English Publisher'); assert.equal(plan.editions[0].release_date, null)
  assert.deepEqual(plan.editions[1].sources.translators, ['실제 역자'])
  assert.equal(plan.editions[1].description, before.content_locales[1].description)
  assert.equal(plan.editions[1].sources.description, before.content_locales[1].sources.description)
  assert.deepEqual(before, original)
})

test('physical edition dates remain unknown unless independently reviewed for each ISBN', () => {
  const { before, reviews } = fixture()
  const original = structuredClone(before)
  reviews[0].editionReleaseDate = '2017-02-28'
  reviews[1].editionReleaseDate = '2024-02-29'
  const plan = planReviewedCatalogInsert(ids, before, reviews)
  assert.deepEqual(plan.editions.map(row => row.release_date), ['2017-02-28', '2024-02-29', null])
  assert.deepEqual(before, original)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /release_date=E'2017-02-28'/)
  assert.match(sql, /release_date=E'2024-02-29'/)
  assert.match(sql, /release_date=NULL/)
  for (const invalid of ['2023-02-29', '2024-02-30', '2024-13-01', '2024-01', '2024-01-01T00:00:00Z', '', 20240101]) {
    reviews[0].editionReleaseDate = invalid
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /invalid reviewed edition release date/)
  }
})
const compactReviews = (before, reviews) => bindReviewedCatalogInsertIdentity(before, reviews.map(review => {
  const result = { ...review }
  for (const key of ['title', 'creator', 'workTitle', 'workCreator', 'translators']) delete result[key]
  return result
}))

test('explicitly reviewed snapshot identity produces the identical plan and SQL without duplicating bibliography', () => {
  const { before, reviews } = fixture(), original = structuredClone(before), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), planReviewedCatalogInsert(ids, before, reviews))
  assert.equal(buildReviewedCatalogInsertSql(ids, before, compact), buildReviewedCatalogInsertSql(ids, before, reviews))
  const after = committed(before, compact)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, compact, after).checkedTables, 18)
  assert.deepEqual(before, original)
  assert.deepEqual(compact, compactReviews(before, reviews))
})

test('compact input cannot silently invent an anchor, mask conflicting explicit identity or infer the review decision', () => {
  for (const change of [s => { delete s.contents[0].metadata.figureBook.workTitle },
    s => { s.contents[0].metadata.figureBook.workCreator = '' },
    s => { s.content_locales.push(structuredClone(s.content_locales[0])) }]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => compactReviews(before, reviews), /reviewed original anchor/)
  }
  for (const key of ['title', 'creator', 'workTitle', 'workCreator', 'translators']) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews)
    compact[0][key] = key === 'translators' ? [] : 'Conflicting input'
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), /mixed with explicit identity/)
  }
  for (const [field, value, message] of [['useReviewedSnapshotIdentity', false, /independent work review/],
    ['isbn', '9780140444964', /live locale/], ['textLanguage', 'ko', /exact text language/],
    ['sourceUrl', 'https://openlibrary.org/books/OL1234M', /independent work review/],
    ['reason', '', /independent work review/], ['editionKind', undefined, /reviewed kind/],
    ['textScope', undefined, /reviewed kind/]]) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews); compact[0][field] = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), message)
  }
})

test('compact decisions stay bound to the exact reviewed identity before a fresh live capture', () => {
  for (const change of [s => { s.content_locales[0].title = 'Other book' }, s => { s.content_locales[0].creator = 'Other writer' },
    s => { s.contents[0].metadata.figureBook.workTitle = 'Other original' },
    s => { s.contents[0].metadata.figureBook.workCreator = 'Other original writer' },
    s => { s.content_locales[1].sources.translators = ['다른 역자'] }]) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), /snapshot identity changed/)
  }
  for (const value of [undefined, '', '0'.repeat(64)]) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews)
    compact[0].reviewedIdentityHash = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), /binding missing/)
  }
})

test('missing 18-table state, absent BOOK and unassigned work fail before execution', () => {
  const { before, reviews } = fixture()
  const missing = structuredClone(before); delete missing.tier_lists
  assert.throws(() => planReviewedCatalogInsert(ids, missing, reviews), /full snapshot tier_lists/)
  const video = structuredClone(before); video.contents[0].type = 'VIDEO'
  assert.throws(() => planReviewedCatalogInsert(ids, video, reviews), /existing assigned BOOK/)
  assert.throws(() => planReviewedCatalogInsert([ids[0]], before, reviews), /assigned owner/)
  assert.throws(() => planReviewedCatalogInsert([ids[0], ids[0]], before, reviews), /distinct assigned/)
})

test('existing editions, duplicate parents and duplicate ISBNs are refused instead of being duplicated', () => {
  for (const change of [s => s.figure_book_contents.push({ content_id: ids[0] }, { content_id: ids[0] }), s => s.figure_book_editions.push({ id: 99, content_id: ids[0], isbn: null }),
    s => s.figure_book_editions.push({ id: 99, content_id: 'other', isbn: '9780451464163' }), s => s.content_locales.push({ content_id: 'other', locale: 'en', isbn: '9780451464163' })]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /existing catalog|existing edition|ISBN already/)
  }
  const { before, reviews } = fixture()
  assert.throws(() => planReviewedCatalogInsert(ids, before, [...reviews, reviews[0]]), /duplicate locale or ISBN/)
  const duplicate = structuredClone(reviews); duplicate[2].isbn = reviews[0].isbn
  assert.throws(() => planReviewedCatalogInsert(ids, before, duplicate), /duplicate locale or ISBN/)
})

test('a reviewed missing language preserves the existing physical edition and its product history exactly', () => {
  const { before, reviews } = fixture()
  before.figure_book_contents.push({ content_id: ids[0], created_at: timestamp, updated_at: timestamp })
  const retained = { ...planReviewedCatalogInsert(ids, fixture().before, reviews).editions[1], id: 99, created_at: timestamp, updated_at: timestamp }
  before.figure_book_editions.push(retained)
  before.figure_book_products.push({ id: 70, edition_id: 99, platform: 'shop', is_active: true })
  const selected = [reviews[0]], original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, selected)
  assert.deepEqual(plan.newParentIds, []); assert.deepEqual(plan.existingParentIds, [ids[0]])
  const after = committed(before, selected)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, selected, after).checkedTables, 18)
  assert.deepEqual(after.figure_book_editions.find(row => row.id === 99), retained)
  assert.deepEqual(after.figure_book_products, before.figure_book_products)
  assert.deepEqual(before, original)
  const sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_contents/)
  assert.match(sql, /INSERT INTO public.figure_book_editions/)
  assert.throws(() => planReviewedCatalogInsert(ids, before, [reviews[1]]), /existing edition for locale/)
  const changed = structuredClone(after); changed.figure_book_editions.find(row => row.id === 99).description = 'Unexpected change'
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, selected, changed), /figure_book_editions/)
  const orphan = structuredClone(before); orphan.figure_book_contents = []
  assert.throws(() => planReviewedCatalogInsert(ids, orphan, selected), /without catalog parent/)
})

test('English Kakao, swapped providers and unbound official URLs are rejected by the plan', () => {
  for (const change of [s => { s.content_locales[0].sources.primary = 'kakao_book' }, s => { s.content_locales[1].sources.primary = 'openlibrary' },
    s => { s.content_locales[0].sources.isbn = 'https://publisher.example/a' }, s => { s.content_locales[2].sources.isbn += '999' }]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /wrong primary|official ISBN binding/)
  }
})

test('every real card must be reviewed before the parent trigger runs; no-ISBN real placeholders are refused', () => {
  const { before, reviews } = fixture()
  assert.throws(() => planReviewedCatalogInsert(ids, before, [reviews[0], reviews[2]]), /unreviewed locale/)
  const real = structuredClone(before); real.content_locales[3].sources.primary = 'openlibrary'
  assert.throws(() => planReviewedCatalogInsert(ids, real, reviews), /unreviewed locale/)
  const invalidDisplay = structuredClone(before); invalidDisplay.content_locales[3].isbn = '9780140444964'
  assert.throws(() => planReviewedCatalogInsert(ids, invalidDisplay, reviews), /unreviewed locale/)
})

test('a source-reviewed excluded card is preserved while only the other real language is registered', () => {
  const {before,reviews}=fixture(),card=before.content_locales[1]
  const proof={method:'independent_selection_review',reason:'abridged',isbn:card.isbn,locale:card.locale,edition_title:card.title,
    source_url:'https://publisher.example/exact-abridged-isbn',explanation:'Publisher explicitly confirms that this ISBN reduces the original chapter bodies.'}
  card.sources.edition_selection_evidence=[proof]
  const selected=[reviews[0],reviews[2]],original=structuredClone(before)
  assert.equal(planReviewedCatalogInsert(ids,before,selected).editions.length,2)
  assert.deepEqual(before,original)
  for(const changed of [{isbn:'9780451464163'},{locale:'en'},{edition_title:'Different edition'},
    {source_url:'https://openlibrary.org/books/OL123M'},{reason:'low_rating'},{method:'machine_review'},{explanation:''}]) {
    const stale=structuredClone(before);stale.content_locales[1].sources.edition_selection_evidence=[{...proof,...changed}]
    assert.throws(()=>planReviewedCatalogInsert(ids,stale,selected),/unreviewed locale/)
  }
})

test('source, original anchor, actual language, live bibliography and known translators are explicit and cannot be fabricated', () => {
  for (const [field, value, message] of [
    ['sourceUrl', 'https://openlibrary.org/books/OL1234M', /independent work review/],
    ['sourceUrl', 'https://publisher.example/a?token=secret', /independent work review/],
    ['workTitle', 'Different original', /live work anchor/], ['workCreator', 'Different original author', /live work anchor/],
    ['textLanguage', 'ko', /exact text language/], ['isbn', '9780451464164', /real ISBN13/],
    ['title', 'Other product title', /live locale/], ['creator', 'Other contributor', /live locale/],
    ['editionKind', 'invented', /reviewed kind/], ['textScope', '', /reviewed kind/],
  ]) {
    const { before, reviews } = fixture(); reviews[0][field] = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), message)
  }
  const { before, reviews } = fixture(); reviews[1].translators = ['다른 역자']
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /verified translators/)
  delete reviews[1].translators
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /verified translators/)
})

test('abridged, graded, later-volume and wrong-language cards remain subject to existing policy', () => {
  for (const change of [r => { r.editionKind = 'abridged' }, r => { r.textScope = 'abridged' },
    r => { r.textScope = 'volume 2 of 3' }]) {
    const { before, reviews } = fixture(); change(reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /reviewed kind|excluded or non-start/)
  }
  const { before, reviews } = fixture()
  before.content_locales[0].title = reviews[0].title = 'Oxford Bookworms Original A'
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /excluded or non-start/)
  const other = fixture(); other.before.contents[0].metadata.fictionSource = { editionKind: 'abridged' }
  assert.throws(() => planReviewedCatalogInsert(ids, other.before, other.reviews), /excluded or non-start/)
})

test('SQL uses automatic seed once per original and retains 18 before/after guards, FK checks and live trigger', () => {
  const { before, reviews } = fixture(), sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.equal(sql.match(/INSERT INTO public.figure_book_contents\(/g)?.length, 2)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_editions/)
  assert.equal(sql.match(/SELECT id INTO STRICT seeded_id/g)?.length, 3)
  assert.match(sql, /BEGIN ISOLATION LEVEL READ COMMITTED/)
  assert.match(sql, /active automatic edition seed required/); assert.match(sql, /unhandled foreign reference/)
  assert.match(sql, /ISBN already registered/); assert.match(sql, /SHARE ROW EXCLUSIVE MODE/)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  assert.doesNotMatch(sql, /DISABLE TRIGGER|session_replication_role|DELETE FROM|UPDATE public\.(?:contents|content_locales|celeb_contents|member_contents)/)
  assert.ok(sql.indexOf('CATALOG_INSERT_EXPECTED:') < sql.indexOf('\nCOMMIT;'))
})

test('successful execution has two full reads, one transaction and compact actual generated IDs', async () => {
  const { before, reviews } = fixture(), after = committed(before, reviews), calls = [], paths = []
  let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async (_db, owned) => { assert.deepEqual(owned, ids); calls.push('read'); return ++reads === 1 ? before : after },
    execute(path) { paths.push(path); calls.push('execute'); const sql = readFileSync(path, 'utf8'); assert.match(sql, /expected_editions/)
      return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED\n' },
  })
  assert.deepEqual(calls, ['read', 'execute', 'read'])
  assert.equal(result.completed, true); assert.equal(result.insertedParents, 2); assert.equal(result.checkedTables, 18)
  assert.deepEqual(result.insertedEditions.map(row => row.id), [100, 101, 102]); assert.ok(paths.every(path => !existsSync(path)))
})

test('every table and protected field is compared even if the emitted snapshot and actual readback agree', () => {
  for (const table of SNAPSHOT_TABLES) {
    const { before, reviews } = fixture(), after = committed(before, reviews)
    after[table].push({ id: 'unreviewed', field: 'unexpected' })
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), new RegExp(table + ' rows differ'))
  }
  for (const change of [s => { s.celeb_contents[0].review = 'changed' }, s => { s.member_contents[0].rating = 1 },
    s => { s.flows[0].tiers.shelf.reverse() }, s => { s.content_locales[0].description = 'changed' }]) {
    const { before, reviews } = fixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
})

test('seeded bibliography, description/source, kind/scope, arbitrary columns and generated timestamps cannot be silently accepted', () => {
  for (const change of [s => { s.figure_book_editions[0].description = 'changed' }, s => { s.figure_book_editions[0].sources.description = 'other source' },
    s => { s.figure_book_editions[0].text_scope = 'complete' }, s => { s.figure_book_editions[0].extra_column = 'unknown' },
    s => { s.figure_book_contents[0].extra_column = 'unknown' }, s => { s.figure_book_editions[0].id = -1 },
    s => { s.figure_book_editions[1].id = s.figure_book_editions[0].id }, s => { s.figure_book_editions[0].updated_at = 'later' },
    s => { s.figure_book_contents[1].created_at = '2026-10-12T00:00:00Z' }]) {
    const { before, reviews } = fixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ|identity\/timestamp/)
  }
})

test('execution failures and missing commit proof stop with no retry and clean temporary SQL', async () => {
  const { before, reviews } = fixture(), paths = []; let writes = 0
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => before,
    execute(path) { paths.push(path); writes++; throw Error('seed trigger rejected') } }), /seed trigger rejected/)
  assert.equal(writes, 1); assert.ok(paths.every(path => !existsSync(path)))
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => before,
    execute: () => 'MERGE_COMMITTED' }), /committed expected snapshot missing/)
})

test('a later live readback discrepancy fails even after a valid committed snapshot', async () => {
  const { before, reviews } = fixture(), committedState = committed(before, reviews), changed = structuredClone(committedState); let reads = 0
  changed.celeb_contents[0].review_en = 'corrupted'
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => ++reads === 1 ? before : changed,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(committedState) + '\nMERGE_COMMITTED',
  }), /actual celeb_contents rows differ/)
  assert.equal(reads, 2)
})

test('an original referenced by Remotion keeps its exact BOOK ID, locale cards and all existing references when the catalog is added', async () => {
  const { before, reviews } = fixture(), after = committed(before, reviews); let reads = 0
  // 삭제·통합용 가드를 읽지 않고 추가 경로 자체의 전후 18표 계약을 확인한다.
  const fixedOriginalId = before.contents[0].id
  const result = await applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => ++reads === 1 ? before : after,
    execute(path) {
      const sql = readFileSync(path, 'utf8')
      assert.doesNotMatch(sql, /DELETE FROM|UPDATE public\.(?:contents|content_locales)|SET content_id=/)
      assert.match(sql, /unhandled foreign reference/)
      return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED'
    },
  })
  assert.equal(result.completed, true)
  assert.equal(after.contents[0].id, fixedOriginalId)
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_contents', 'figure_book_editions'].includes(table)))
    assert.deepEqual(after[table], before[table])
  assert.equal(after.figure_book_contents[0].content_id, fixedOriginalId)
  assert.ok(after.figure_book_editions.filter(row => row.content_id === fixedOriginalId).length === 2)
  assert.doesNotMatch(readFileSync(new URL('./reviewed-catalog-insert.mjs', import.meta.url), 'utf8'), /checkFixedReferences/)
})

test('existing zero-edition parents keep every original field and timestamp and receive only explicitly reviewed real cards', async () => {
  const { before, reviews } = fixture()
  before.figure_book_contents = ids.map(content_id => ({ content_id, created_at: '2020-01-01T00:00:00+00:00', updated_at: '2023-02-03T04:05:06+00:00', synopsis: '기존 값' }))
  // 자동 seed가 없는 기존 부모 경로에서는 ISBN 미확인 카드를 추가하지 않는다.
  before.content_locales[1].isbn = null
  const selected = [reviews[0], reviews[2]], original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, selected), after = committed(before, selected)
  assert.deepEqual(plan.newParentIds, []); assert.deepEqual(plan.existingParentIds, ids)
  assert.equal(plan.editions.length, 2)
  const sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.equal(sql.match(/INSERT INTO public.figure_book_editions\(/g)?.length, 2)
  assert.equal(sql.match(/RETURNING id INTO seeded_id/g)?.length, 2)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_contents|UPDATE public.figure_book_contents|SELECT id INTO STRICT seeded_id/)
  assert.match(sql, /unhandled foreign reference/)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, selected, {
    capture: async () => ++reads === 1 ? before : after,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED',
  })
  assert.equal(result.insertedParents, 0); assert.equal(result.insertedEditions.length, 2)
  assert.deepEqual(before, original)
  for (const table of SNAPSHOT_TABLES.filter(table => table !== 'figure_book_editions')) assert.deepEqual(after[table], before[table])
  const changed = structuredClone(after); changed.figure_book_contents[0].updated_at = timestamp
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, selected, changed), /figure_book_contents rows differ/)
})

test('mixed missing-parent automatic seed and existing-parent zero-edition insert remain one atomic plan', () => {
  const { before, reviews } = fixture()
  before.figure_book_contents.push({ content_id: ids[0], created_at: '2018-01-01T00:00:00Z', updated_at: '2019-01-01T00:00:00Z' })
  const plan = planReviewedCatalogInsert(ids, before, reviews), after = committed(before, reviews)
  assert.deepEqual(plan.newParentIds, [ids[1]]); assert.deepEqual(plan.existingParentIds, [ids[0]])
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.equal(sql.match(/INSERT INTO public.figure_book_contents\(/g)?.length, 1)
  assert.equal(sql.match(/INSERT INTO public.figure_book_editions\(/g)?.length, 2)
  assert.equal(sql.match(/SELECT id INTO STRICT seeded_id/g)?.length, 1)
  assert.match(sql, /active automatic edition seed required/)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, reviews, after).insertedParents, 1)
  const altered = structuredClone(after); altered.figure_book_editions[0].created_at = '2026-10-12T00:00:00Z'
  altered.figure_book_editions[0].updated_at = altered.figure_book_editions[0].created_at
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, altered), /identity\/timestamp/)
})
