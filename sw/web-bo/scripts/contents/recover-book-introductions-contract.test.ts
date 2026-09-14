import assert from 'node:assert/strict'
import test from 'node:test'
import { isRecoveryBody, recoveryInputs } from './recover-book-introductions-contract'
import { buildIntroductionApplySql, planIntroductionChange, type IntroductionRow } from './book-description-sources-contract'

const row: IntroductionRow = { content_id: 'book-id', locale: 'ko', title: 'Test', creator: 'Author',
  publisher: 'Publisher', isbn: '9780140328721', description: null, sources: null }

test('English edition metadata does not allow French prose or bibliographic dimensions as introductions', () => {
  assert.equal(isRecoveryBody('L’Étranger est le premier roman publié d’Albert Camus, paru en 1942.', 'en'), false)
  assert.equal(isRecoveryBody('223 pages ; 20 cm', 'en'), false)
  assert.equal(isRecoveryBody('The novel follows a young man and his family through years of war.', 'en'), true)
})

test('Korean display-title rows never borrow an English/representative ISBN or URL', () => {
  assert.deepEqual(recoveryInputs({ ...row, isbn: null, sources: { description: 'https://openlibrary.org/works/OL1W' } },
    { openlibrary_url: 'https://openlibrary.org/works/OL1W', isbn: row.isbn }), [])
  assert.deepEqual(recoveryInputs(row, null), [{ locale: 'ko', isbn: row.isbn }])
})

test('filled introductions are never candidates, including selected markers', () => {
  for (const description of ['OPEN', 'Existing prose']) {
    assert.deepEqual(recoveryInputs({ ...row, locale: 'en', description }, null), [])
  }
})

test('English rows can use their existing work reference even without an ISBN', () => {
  assert.deepEqual(recoveryInputs({ ...row, locale: 'en', isbn: null,
    sources: { description: 'https://openlibrary.org/works/OL1W.json', work: '/works/OL1W' } }, null),
  [{ locale: 'en', sourceUrl: 'https://openlibrary.org/works/OL1W' }])
})

test('untrusted hosts and different ISBN URLs are excluded', () => {
  assert.deepEqual(recoveryInputs({ ...row, locale: 'en', sources: {
    description: 'https://openlibrary.org.evil.com/works/OL1W',
    work: 'https://openlibrary.org/isbn/9780439064873', edition: 'https://evil.com/books/OL1M',
  } }, null), [{ locale: 'en', isbn: row.isbn }])
})

test('explicit OpenLibrary metadata references are supported, arbitrary metadata URLs are not', () => {
  assert.deepEqual(recoveryInputs({ ...row, locale: 'en', isbn: null }, {
    description: 'https://openlibrary.org/works/OL2W',
    openlibrary: { workKey: '/works/OL1W' },
  }), [{ locale: 'en', sourceUrl: 'https://openlibrary.org/works/OL1W' }])
})

test('successful retrieval is required and every old identity field is guarded on apply', () => {
  assert.equal(planIntroductionChange('content_locales', row,
    { source: 'KAKAO', sourceUrl: 'https://dapi.kakao.com/v3/search/book', description: null }).change, null)
  const change = planIntroductionChange('content_locales', row,
    { source: 'KAKAO', sourceUrl: 'https://dapi.kakao.com/v3/search/book', description: 'Verified introduction' }).change!
  const sql = buildIntroductionApplySql(row.content_id, [change])
  for (const field of ['description', 'sources', 'isbn', 'title', 'creator', 'publisher']) assert.ok(sql.includes(`'${field}'`))
  assert.ok(sql.includes('"description":null'))
  assert.ok(sql.includes("RAISE EXCEPTION 'Book introduction changed concurrently'"))
})
