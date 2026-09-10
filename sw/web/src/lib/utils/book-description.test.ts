import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bookIntroductionDisplay, resolveBookIsbn, selectBookIntroduction } from './book-description'
import { withoutBookDescription } from '@feelandnote/shared/lib/book-metadata'

test('selected edition ISBN wins over the work representative ISBN', () => {
  assert.equal(resolveBookIsbn('ko', '979-11-9053375-1', '9788937460449', '9788937460456'), '9791190533751')
})

test('English never falls back to the Korean representative ISBN or a work UUID', () => {
  assert.equal(resolveBookIsbn('en', null, '9780140449136', '9788937460449'), '9780140449136')
  assert.equal(resolveBookIsbn('en', null, null, '9788937460449'), null)
  assert.equal(resolveBookIsbn('ko', null, null, '7aa8d267-daea-4444-9999-6270bddd82dd'), null)
})

test('stored intro aliases are excluded without mutating bibliography metadata', () => {
  const stored = { description: 'old publisher text', summary: 'old summary', overview: 'old intro', storyline: 'old copy', isbn: '9780140449136', publisher: 'Penguin' }
  assert.deepEqual(withoutBookDescription(stored), { isbn: stored.isbn, publisher: 'Penguin' })
  assert.equal(stored.description, 'old publisher text')
})

test('source markers never display as text; migration compatibility keeps NULL introductions readable without writing a source', () => {
  for (const source of ['KAKAO', 'DAUM', 'OPEN']) {
    const locale = source === 'OPEN' ? 'en' : 'ko'
    assert.deepEqual(bookIntroductionDisplay(locale, {
      locale, isbn: '9780140449136', description: source,
      sources: { description: 'https://example.com/book' },
    }), {
      description: null,
      bookIntroduction: { isbn: '9780140449136', source, sourceUrl: 'https://example.com/book' },
    })
  }
  assert.deepEqual(bookIntroductionDisplay('ko', { locale: 'ko', isbn: '9780140449136', description: null }), {
    description: null, bookIntroduction: { isbn: '9780140449136', source: 'KAKAO', sourceUrl: null, legacyFallback: true },
  })
})

test('stored text survives missing ISBN and only the exact display language is used', () => {
  assert.equal(bookIntroductionDisplay('en', { locale: 'en', description: 'A translated introduction.' }).description, 'A translated introduction.')
  assert.equal(bookIntroductionDisplay('en', { locale: 'ko', description: '한국어 소개' }).description, null)
  assert.equal(bookIntroductionDisplay('en', { locale: 'en', description: '한국어 소개' }).description, null)
  assert.equal(bookIntroductionDisplay('en', { locale: 'en', description: 'KAKAO' }).bookIntroduction, null)
  assert.equal(bookIntroductionDisplay('ko', { locale: 'ko', description: 'OPEN' }).bookIntroduction, null)
})

test('edition text wins, and a different ISBN never borrows locale text or source', () => {
  const locale = { locale: 'ko', isbn: '9788937460449', description: '대표 판본 번역문' }
  assert.equal(selectBookIntroduction('ko', { ...locale, description: '선택 판본 번역문' }, locale).description, '선택 판본 번역문')
  assert.equal(selectBookIntroduction('ko', { ...locale, isbn: '9788937460456', description: null }, locale).description, null)
  assert.equal(selectBookIntroduction('ko', { ...locale, isbn: null, description: null }, locale).description, null)
})

test('same ISBN locale translation takes priority over an edition source marker', () => {
  const locale = { locale: 'ko', isbn: '9788908062290', description: '보존할 번역문' }
  const selected = selectBookIntroduction('ko', { ...locale, isbn: '8908062297', description: 'DAUM' }, locale)
  assert.equal(selected.description, '보존할 번역문')
  assert.equal(selected.bookIntroduction, null)
  const mismatch = selectBookIntroduction('ko', { ...locale, isbn: '9788937460456', description: 'DAUM' }, locale)
  assert.equal(mismatch.description, null)
  assert.equal(mismatch.bookIntroduction?.source, 'DAUM')
})

test('same ISBN locale source URL follows the selected source, not unrelated provenance', () => {
  const locale = { locale: 'en', isbn: '9780140449136', description: 'OPEN', sources: { description: 'https://openlibrary.org/works/OL1W', url: 'https://example.com/other' } }
  assert.equal(selectBookIntroduction('en', { ...locale, description: null, sources: {} }, locale).bookIntroduction?.sourceUrl, 'https://openlibrary.org/works/OL1W')
  assert.equal(selectBookIntroduction('en', { ...locale, sources: {} }, locale).bookIntroduction?.sourceUrl, 'https://openlibrary.org/works/OL1W')
})
