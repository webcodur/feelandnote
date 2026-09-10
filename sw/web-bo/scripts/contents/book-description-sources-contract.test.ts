import assert from 'node:assert/strict'
import test from 'node:test'
import { buildIntroductionApplySql, planIntroductionChange, planIntroductionMetadataCleanup, type IntroductionRow } from './book-description-sources-contract'
import { refreshBookMetadata } from '@feelandnote/shared/lib/book-metadata'

const row: IntroductionRow = { content_id: 'book', locale: 'ko', title: '책', creator: '저자',
  publisher: '출판사', isbn: '9788908062290', description: null, sources: { primary: 'kakao_book' } }
const fetched = { source: 'DAUM' as const, sourceUrl: 'https://m.search.daum.net/search?w=bookpage&bookId=362238', description: '책에 대한 외부 소개입니다.' }

test('a successful external lookup fills a NULL with its source, not its body', () => {
  const result = planIntroductionChange('content_locales', row, fetched)
  assert.equal(result.change?.description, 'DAUM')
  assert.equal(result.change?.sources.description, fetched.sourceUrl)
  assert.equal(result.change?.sources.primary, 'kakao_book')
  assert.equal(result.change?.verifiedDescription, fetched.description)
})
test('a selected source and manually prepared text are preserved', () => {
  assert.equal(planIntroductionChange('content_locales', { ...row, description: 'DAUM' }, fetched).reason, 'already-selected')
  assert.equal(planIntroductionChange('content_locales', { ...row, description: fetched.description, sources: { translation: 'manual' } }, fetched).reason, 'prepared-text')
})
test('unknown summaries are retained even when a longer external introduction exists', () => {
  const result = planIntroductionChange('content_locales', { ...row, description: '김홍도가 인용한 시를 수록한다.' }, fetched)
  assert.equal(result.reason, 'unverified-stored-text')
  assert.equal(result.change, null)
  assert.equal(planIntroductionChange('content_locales', { ...row, description: '온도는 -1도다.' }, { ...fetched, description: '온도는 1도다.' }).change, null)
})
test('an exact copy or a long truncated prefix can be replaced', () => {
  const exact = planIntroductionChange('content_locales', { ...row, description: fetched.description }, fetched)
  assert.equal(exact.reason, 'external-copy')
  const text = '원문에 있는 긴 책 소개'.repeat(15)
  const prefix = planIntroductionChange('content_locales', { ...row, description: text.slice(0, 150) }, { ...fetched, description: text })
  assert.equal(prefix.reason, 'external-copy')
  assert.equal(planIntroductionChange('content_locales', { ...row, description: '책에 대한' }, fetched).change, null)
})
test('missing text, missing URL, and the wrong language do not mark a row checked', () => {
  assert.equal(planIntroductionChange('content_locales', row, { ...fetched, description: null }).change, null)
  assert.equal(planIntroductionChange('content_locales', row, { ...fetched, sourceUrl: null }).change, null)
  assert.equal(planIntroductionChange('content_locales', { ...row, locale: 'en' }, fetched).change, null)
})
test('SQL preserves unrelated columns and refuses concurrent edits in one transaction', () => {
  const change = planIntroductionChange('content_locales', { ...row, title: "O'Brien", description: fetched.description }, fetched).change!
  const sql = buildIntroductionApplySql('book', [change])
  assert.match(sql, /^BEGIN;/)
  assert.match(sql, /O''Brien/)
  assert.match(sql, /Book introduction changed concurrently/)
  assert.match(sql, /jsonb_build_object\('description'/)
  assert.doesNotMatch(sql, /SET (title|creator|isbn|publisher)/)
  assert.doesNotMatch(sql, /CREATE (TABLE|TRIGGER|FUNCTION)/i)
  assert.throws(() => buildIntroductionApplySql('different-book', [change]), /One book/)
})

test('routine refresh drops legacy and incoming introduction copies', () => {
  assert.deepEqual(refreshBookMetadata({ description: 'Stored translation', isbn: 'old' }, { description: 'API text', summary: 'duplicate', isbn: 'new' }),
    { isbn: 'new' })
  assert.deepEqual(refreshBookMetadata(null, { description: 'API text', isbn: 'new' }), { isbn: 'new' })
})

test('metadata cleanup removes only copies also held by a locale or edition', () => {
  const metadata = { description: '보존된 문장', description_en: 'No locale has this text', publisher: '출판사' }
  const result = planIntroductionMetadataCleanup(metadata, [{ ...row, description: '보존된 문장' }])!
  assert.deepEqual(result.removed, ['description'])
  assert.equal(result.after.description_en, metadata.description_en)
  assert.equal(result.after.publisher, metadata.publisher)
  assert.equal(metadata.description, '보존된 문장')
  assert.equal(planIntroductionMetadataCleanup(metadata, [{ ...row, description: 'DAUM' }]), null)
  assert.match(buildIntroductionApplySql('book', [], result), /Book metadata changed concurrently/)
})

test('metadata cleanup removes a verified external copy even when the locale was NULL', () => {
  const metadata = { description: fetched.description, publisher: '출판사' }
  const result = planIntroductionMetadataCleanup(metadata, [{ ...row, description: null }], [fetched.description])!
  assert.deepEqual(result.removed, ['description'])
  assert.deepEqual(result.after, { publisher: '출판사' })
})

test('SQL text cannot terminate its DO block through stored book text', () => {
  const change = planIntroductionChange('content_locales', { ...row, title: '$book_introductions$' }, fetched).change!
  assert.match(buildIntroductionApplySql('book', [change]), /DO \$book_introductions_x\$/)
})
