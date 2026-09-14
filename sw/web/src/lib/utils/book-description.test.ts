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

test('source markers never display as text, and NULL introductions stay empty', () => {
  for (const source of ['KAKAO', 'DAUM', 'OPEN']) {
    const locale = source === 'OPEN' ? 'en' : 'ko'
    assert.deepEqual(bookIntroductionDisplay(locale, {
      locale, isbn: '9780140449136', description: source,
      sources: { description: 'https://example.com/book' },
    }), {
      description: null,
      bookIntroduction: { isbn: '9780140449136', source, sourceUrl: 'https://example.com/book' },
      introductionAttribution: {
        provider: ({ KAKAO: 'kakao', DAUM: 'daum', OPEN: 'openlibrary' } as const)[source as 'KAKAO' | 'DAUM' | 'OPEN'],
        url: 'https://example.com/book', translated: false,
      },
    })
  }
  assert.deepEqual(bookIntroductionDisplay('ko', { locale: 'ko', isbn: '9780140449136', description: null }), {
    description: null, bookIntroduction: null,
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

test('selected source never falls back to a locale translation even for the same ISBN', () => {
  const locale = { locale: 'ko', isbn: '9788908062290', description: '보존할 번역문' }
  const selected = selectBookIntroduction('ko', { ...locale, isbn: '8908062297', description: 'DAUM' }, locale)
  assert.equal(selected.description, null)
  assert.equal(selected.bookIntroduction?.source, 'DAUM')
  const mismatch = selectBookIntroduction('ko', { ...locale, isbn: '9788937460456', description: 'DAUM' }, locale)
  assert.equal(mismatch.description, null)
  assert.equal(mismatch.bookIntroduction?.source, 'DAUM')
})

test('missing edition text or source URL never borrows from the same ISBN locale', () => {
  const locale = { locale: 'en', isbn: '9780140449136', description: 'OPEN', sources: { description: 'https://openlibrary.org/works/OL1W', url: 'https://example.com/other' } }
  assert.deepEqual(selectBookIntroduction('en', { ...locale, description: null, sources: {} }, locale), { description: null, bookIntroduction: null })
  assert.equal(selectBookIntroduction('en', { ...locale, sources: {} }, locale).bookIntroduction?.sourceUrl, null)
})

const attribution = (sources: unknown) => bookIntroductionDisplay('ko', {
  locale: 'ko', description: '표시할 책 소개입니다.', sources,
}).introductionAttribution

test('stored descriptions identify their explicit description URL, never the metadata provider', () => {
  for (const [url, provider] of [
    ['https://www.yes24.com/product/goods/123', 'yes24'],
    ['https://dapi.kakao.com/v3/search/book', 'kakao'],
    ['https://search.daum.net/search?w=bookpage&bookId=1', 'daum'],
    ['https://openlibrary.org/works/OL1W', 'openlibrary'],
    ['https://publisher.example/book', 'other'],
  ]) assert.deepEqual(attribution({ primary: 'unrelated', description: url }), { provider, url, translated: false })
  assert.deepEqual(attribution({ primary: 'kakao_book', title: 'translated', translation: true, sourceLocale: 'en' }), {
    provider: 'unknown', url: null, translated: false,
  })
  assert.deepEqual(attribution(null), { provider: 'unknown', url: null, translated: false })
})

test('explicit manual writing belongs to F&N without guessing from stored text alone', () => {
  assert.deepEqual(attribution({ manual: true }), { provider: 'feelandnote', url: null, translated: false })
  assert.deepEqual(attribution({ description_method: 'manual', description: 'https://publisher.example/book' }), {
    provider: 'feelandnote', url: 'https://publisher.example/book', translated: false,
  })
})

test('actual description translation keys preserve original source links', () => {
  const url = 'https://www.penguinrandomhouse.com/books/318643/believe-me-by-eddie-izzard/'
  for (const evidence of [
    { description_translation: 'en_to_ko', description_source_locale: 'en' },
    { description_translation: 'ko_summary_from_author' },
    { description_method: 'publisher_summary_translation' },
    { descriptionTranslation: true },
  ]) assert.deepEqual(attribution({ description: url, ...evidence }), { provider: 'other', url, translated: true })
  assert.deepEqual(attribution({ description: { type: 'locale-translation', source_locale: 'en',
    original_sources: { description: 'http://openlibrary.org/works/OL1W' } } }), {
    provider: 'openlibrary', url: 'http://openlibrary.org/works/OL1W', translated: true,
  })
})

test('translations identify the original snapshot provider without guessing from current metadata', () => {
  assert.deepEqual(attribution({ primary: 'kakao_book', description: {
    type: 'locale-translation', source_locale: 'en', original_sources: { primary: 'openlibrary' },
  } }), { provider: 'openlibrary', url: null, translated: true })
  assert.deepEqual(attribution({ primary: 'openlibrary', description_translation: 'en_to_ko' }), {
    provider: 'unknown', url: null, translated: true,
  })
  assert.deepEqual(attribution({ description: 'https://www.yes24.com/product/goods/123', description_translation: 'ko_to_en' }), {
    provider: 'yes24', url: 'https://www.yes24.com/product/goods/123', translated: true,
  })
})

test('backup restoration and bibliographic verification do not imply F&N authorship or translation', () => {
  assert.deepEqual(attribution({ primary: 'openlibrary', description: {
    type: 'backup-restored', original_locale: 'en', verification: 'titles and creators manually matched',
    original_sources: { primary: 'openlibrary', title: 'https://openlibrary.org/books/OL1M' },
  } }), { provider: 'unknown', url: null, translated: false })
})

test('marker attribution follows the actual selected external source despite old translation flags', () => {
  assert.deepEqual(bookIntroductionDisplay('ko', { locale: 'ko', description: 'KAKAO',
    sources: { description_translation: 'en_to_ko' } }).introductionAttribution, {
    provider: 'kakao', url: null, translated: false,
  })
})

test('attribution follows the selected row and never crosses an edition ISBN mismatch', () => {
  const locale = { locale: 'ko', isbn: '9788937460449', description: '한국어 소개',
    sources: { description: 'https://www.yes24.com/product/goods/1' } }
  const edition = { ...locale, isbn: '9788937460456', description: '판본 소개', sources: { manual: true } }
  assert.equal(selectBookIntroduction('ko', edition, locale).introductionAttribution?.provider, 'feelandnote')
  assert.deepEqual(selectBookIntroduction('ko', { ...edition, description: null }, locale), {
    description: null, bookIntroduction: null,
  })
  assert.equal(selectBookIntroduction('ko', { ...edition, isbn: locale.isbn, description: null }, locale)
    .introductionAttribution, undefined)
  const translated = { ...locale, sources: { ...locale.sources, description_translation: 'en_to_ko' } }
  assert.deepEqual(selectBookIntroduction('ko', { ...locale, description: 'DAUM' }, translated).introductionAttribution, {
    provider: 'daum', url: locale.sources.description, translated: false,
  })
})

test('unsafe URLs cannot become badge links or masquerade as known sources', () => {
  for (const url of ['javascript:alert(1)', 'https://user:password@www.yes24.com/book', '//www.yes24.com/book',
    'https://www.yes24.com/\nbook', 'https://www.yes24.com\\@evil.example/book']) {
    assert.deepEqual(attribution({ description: url }), { provider: 'unknown', url: null, translated: false })
    assert.equal(bookIntroductionDisplay('ko', { locale: 'ko', description: 'DAUM', sources: { description: url } })
      .bookIntroduction?.sourceUrl, null)
  }
  assert.equal(attribution({ description: 'https://www.yes24.com.evil.example/book' })?.provider, 'other')
  assert.deepEqual(attribution({ description: { type: 'locale-translation', sourceUrl: 'javascript:alert(1)' } }), {
    provider: 'unknown', url: null, translated: true,
  })
})
