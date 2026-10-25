import assert from 'node:assert/strict'
import test from 'node:test'
import { visibleBookIntroductionCensus, buildReviewedIntroductionChanges, targetKey, refreshCollectionRows } from './book-introductions-lib.mjs'

const id = '212b634d-3f26-5e60-9e4f-e1c8207db208'
const work = { id, type: 'BOOK', metadata: {} }
const card = (locale = 'en', extra = {}) => ({ content_id: id, locale, title: 'A Book', creator: 'An Author',
  isbn: '9781612192048', description: null, sources: { primary: 'openlibrary' }, affiliate_url: null, ...extra })
const edition = (extra = {}) => ({ ...card(), id: 1, publisher: 'A Publisher', thumbnail_url: null,
  release_date: null, edition_kind: 'full', text_scope: 'complete', sort_order: 0, ...extra })
const catalog = (cards, editions = []) => ({ contents: [work], content_locales: cards, figure_book_editions: editions, options: [] })
const target = { contentId: id, editionId: 1, locale: 'en', title: 'A Book', creator: 'An Author',
  isbn: '9781612192048', isDefault: true, hasText: false }
const review = { target, llmReviewed: true, description: 'The book follows a family as its members confront changes in their lives and their relationships with one another.',
  sourceUrl: 'https://www.penguinrandomhouse.com/books/224693/book/', method: 'provider', sourceLocale: 'en',
  evidence: [{ url: 'https://www.penguinrandomhouse.com/books/224693/book/', note: 'Read the publisher body; the actual title, author and scope match the selected edition.' }] }

test('번역판 없는 표시용 카드는 서비스 노출 소개 누락으로 세지 않는다', async () => {
  const result = await visibleBookIntroductionCensus(catalog([card('ko', { sources: { primary: 'none', title: 'translated' } })]))
  assert.equal(result.targetRows, 0)
  assert.equal(result.counts.ko.visibleWorks, 0)
})

test('소개 있는 대표 카드가 선택 판본의 공란을 가리지 않는다', async () => {
  const result = await visibleBookIntroductionCensus(catalog([card('en', { description: review.description })], [edition()]))
  assert.equal(result.counts.en.defaultMissing, 1)
  assert.deepEqual(result.targets.map(row => row.editionId), [1])
})

test('기본판 소개가 있어도 선택 가능한 다른 판본의 누락을 찾는다', async () => {
  const result = await visibleBookIntroductionCensus(catalog([card()], [edition({ description: review.description,
    sources: { primary: 'openlibrary', translators: ['First Translator'] } }),
    edition({ id: 2, isbn: '9781612192055', sort_order: 1, sources: { primary: 'openlibrary', translators: ['Second Translator'] } })]))
  assert.equal(result.counts.en.defaultMissing, 0)
  assert.deepEqual(result.targets.map(row => [row.editionId, row.isDefault]), [[2, false]])
})

test('유효한 출처 예약값은 공란에 합산하지 않고 다른 언어 본문은 누락으로 센다', async () => {
  const marked = await visibleBookIntroductionCensus(catalog([card()], [edition({ description: 'OPEN' })]))
  assert.equal(marked.targetRows, 0)
  const foreign = await visibleBookIntroductionCensus(catalog([card()], [edition({ description: '한국어로 쓰인 소개문입니다.' })]))
  assert.equal(foreign.targetRows, 1)
  assert.equal(foreign.targets[0].hasText, true)
})

test('선정 제외 오디오 CD는 남아 있는 카드로 되살리지 않는다', async () => {
  const sources = { primary: 'openlibrary', edition_selection_evidence: [{ method: 'independent_selection_review',
    llmReviewed: true, content_id: id, isbn: target.isbn, locale: 'en', edition_title: 'A Book', reason: 'non_reading_product',
    source_url: 'https://www.hachettebookgroup.com/catalog.pdf', explanation: 'Read the exact ISBN in the publisher catalogue: the product is a six-disc audiobook on CD.' }] }
  const result = await visibleBookIntroductionCensus(catalog([card('en', { sources })], [edition({ sources })]))
  assert.equal(result.targetRows, 0)
})

test('새 책은 같은 실행 자료의 과거 대상과 무관하게 현재 카탈로그에서 새로 발견한다', async () => {
  const before = await visibleBookIntroductionCensus({ contents: [], content_locales: [], figure_book_editions: [], options: [] })
  const after = await visibleBookIntroductionCensus(catalog([card()], [edition()]))
  assert.equal(before.targetRows, 0)
  assert.equal(after.targetRows, 1)
})

test('검수된 소개는 같은 작품·언어·ISBN의 빈 카드와 판본에만 반영하며 입력을 바꾸지 않는다', () => {
  const data = catalog([card(), card('ko')], [edition(), edition({ id: 2, isbn: '9781612192055' })])
  const saved = structuredClone(data)
  const changes = buildReviewedIntroductionChanges(data, [review], [target])
  assert.equal(changes.length, 2)
  assert.ok(changes.every(change => change.before.locale === 'en' && change.before.isbn === target.isbn))
  assert.deepEqual(data, saved)
})

test('미검수·숨겨진 대상·변경된 제목·기존 소개를 거부한다', () => {
  assert.throws(() => buildReviewedIntroductionChanges(catalog([card()], [edition()]), [{ ...review, llmReviewed: false }], [target]))
  assert.throws(() => buildReviewedIntroductionChanges(catalog([card()], [edition()]), [review], []))
  assert.throws(() => buildReviewedIntroductionChanges(catalog([card()], [edition({ title: 'A Different Book' })]), [review], [target]))
  assert.throws(() => buildReviewedIntroductionChanges(catalog([card()], [edition({ description: review.description })]), [review], [target]))
})

test('타 언어 소개가 저장된 행은 빈칸 반영기로 덮지 않는다', () => {
  assert.throws(() => buildReviewedIntroductionChanges(catalog([card()], [edition({ description: '한국어 소개' })]), [review], [target]))
})

test('일본어 원문 소개의 한국어 번역도 실제 원문 언어와 agy 경로를 확인한다', () => {
  const koTarget = { ...target, locale: 'ko' }
  const data = catalog([card('ko')], [edition({ locale: 'ko' })])
  const translated = { ...review, target: koTarget, method: 'translation', sourceLocale: 'ja',
    translationBackend: 'agy', description: '가족과 권력의 갈등 속에서 자신의 삶을 지키려는 인물의 이야기를 그린 소설이다.' }
  const changes = buildReviewedIntroductionChanges(data, [translated], [koTarget])
  assert.equal(changes.length, 2)
  assert.ok(changes.every(change => change.patch.sources.description_source_locale === 'ja'))
  assert.throws(() => buildReviewedIntroductionChanges(data, [{ ...translated, translationBackend: undefined }], [koTarget]))
  assert.throws(() => buildReviewedIntroductionChanges(data, [{ ...translated, method: 'provider' }], [koTarget]))
})

test('본문 언어·출처·번역 백엔드와 상충하는 중복 결정을 거부한다', () => {
  const data = catalog([card()], [edition()])
  assert.throws(() => buildReviewedIntroductionChanges(data, [{ ...review, description: '다른 언어의 설명입니다.' }], [target]))
  assert.throws(() => buildReviewedIntroductionChanges(data, [{ ...review, sourceUrl: 'http://example.com' }], [target]))
  assert.throws(() => buildReviewedIntroductionChanges(data, [{ ...review, evidence: [] }], [target]))
  assert.throws(() => buildReviewedIntroductionChanges(data, [review, { ...review, description: review.description + ' The second version differs.' }], [target]))
  assert.equal(targetKey(target), targetKey({ ...target, isDefault: false }))
})

test('OpenLibrary 요청 실패를 원문 없음으로 저장하지 않는다', async () => {
  const { createBookIntroductionCollectors } = await import('./book-introductions-sources.mjs')
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 })
    await assert.rejects(createBookIntroductionCollectors().openlibrary(target), /HTTP 503/)
    globalThis.fetch = async () => new Response('', { status: 404 })
    assert.deepEqual(await createBookIntroductionCollectors().openlibrary(target), { status: 'ok', candidates: [] })
  } finally { globalThis.fetch = original }
})

test('Google Books ISBN 상세는 API와 별도로 본문과 실제 서지를 수집한다', async () => {
  const { googleBooksPageCandidate } = await import('./book-introductions-sources.mjs')
  const html = '<title>Another edition - Google Books</title><div id="synopsistext">A story<div>within a story</div><p>Second paragraph.</p></div><div>Unrelated footer</div><table class="bib_info"><tr><td>ISBN</td><td>9781612192055</td></tr></table>'
  const result = googleBooksPageCandidate(html, target.isbn, 'en')
  assert.match(result.description, /within a story/)
  assert.match(result.description, /Second paragraph/)
  assert.doesNotMatch(result.description, /Unrelated footer/)
  assert.equal(result.identity.requestedIsbn, target.isbn)
  assert.match(result.identity.bibliography, /9781612192055/)
  assert.equal(result.identity.pageTitle, 'Another edition - Google Books')
  const unquoted = googleBooksPageCandidate('<div id=synopsistext dir=ltr>Actual body</div><table id="metadata_content_table"><tr><td>Actual ISBN</td></tr></table>', target.isbn, 'en')
  assert.equal(unquoted.description, 'Actual body')
  assert.match(unquoted.identity.bibliography, /Actual ISBN/)
  assert.equal(googleBooksPageCandidate('<title>No preview</title>', target.isbn, 'en').description, null)
  assert.throws(() => googleBooksPageCandidate('<div class="g-recaptcha"></div>', target.isbn, 'en'), /CAPTCHA/)
  assert.throws(() => googleBooksPageCandidate('<div id="synopsistext">Incomplete', target.isbn, 'en'), /incomplete/)
})

test('새 책만 또는 영어만 재실행해도 다른 책·한국어의 미완료 원문을 보존한다', () => {
  const ko = { ...target, locale: 'ko' }, another = { ...target, contentId: 'another' }
  const saved = [{ provider: 'google', target, status: 'ok' }, { provider: 'naru', target: ko, status: 'ok' },
    { provider: 'google', target: another, status: 'ok' }]
  const scoped = refreshCollectionRows(saved, [], { contentIds: [id], locale: 'en' })
  assert.deepEqual(scoped.map(row => row.target), [ko, another])
  const fresh = { ...target, isDefault: false }
  const refreshed = refreshCollectionRows(saved, [fresh], { locale: 'en' })
  assert.equal(refreshed.find(row => row.target.locale === 'en').target.isDefault, false)
  assert.equal(refreshed.some(row => row.target.locale === 'ko'), true)
  assert.equal(refreshed.some(row => row.target.contentId === 'another'), false)
})
