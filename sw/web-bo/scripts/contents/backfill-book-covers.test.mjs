import assert from 'node:assert/strict'
import test from 'node:test'
import { matchCoverEdition, buildCoverApplySql } from './backfill-book-covers.mjs'
import { storedCoverCandidates } from './book-cover-backfill-contract.mjs'

const row = { table: 'content_locales', content_id: 'e84164c1-f657-5156-af8b-a2ed876c5197', locale: 'en',
  title: 'The Quants', creator: 'Scott Patterson', isbn: '9780307453372', sources: { primary: 'openlibrary' }, row_hash: 'a'.repeat(32) }
const official = { isbn: row.isbn, title: 'The Quants: How a New Breed of Math Whizzes Conquered Wall Street and Nearly Destroyed It',
  mainTitle: 'The Quants', creator: row.creator }

test('ISBN·제목·전체 저자가 일치한 표지만 허용하며 표시용 제목은 제외한다', () => {
  assert.equal(matchCoverEdition(row, official), null)
  assert.equal(matchCoverEdition({ ...row, sources: { primary: 'none', title: 'translated' } }, official), 'display_title')
  assert.equal(matchCoverEdition({ ...row, sources: { primary: 'none', title: 'https://example.com/book' } }, official), 'no_provider')
  assert.equal(matchCoverEdition(row, { ...official, isbn: '9781501197260' }), 'isbn_mismatch')
  assert.equal(matchCoverEdition({ ...row, title: 'The Quants Workbook' }, official), 'title_mismatch')
  assert.equal(matchCoverEdition({ ...row, creator: 'Scott Patterson, Other Author' }, official), 'creator_mismatch')
  assert.equal(matchCoverEdition(row, { error: 'english_language_not_confirmed' }), 'english_language_not_confirmed')
})

test('기존 표지는 같은 작품·언어·ISBN·메타에서만 재사용하고 근거 행도 동시 수정을 검사한다', () => {
  const donor = { ...row, cover: 'https://covers.openlibrary.org/b/id/123-L.jpg', sources: { primary: 'openlibrary', thumbnail: 'https://openlibrary.org/books/OL24032618M' } }
  const changes = storedCoverCandidates(() => [donor], [row, { ...row, locale: 'ko' }, { ...row, isbn: '9781501197260' }, { ...row, creator: 'Other Author' }, { ...row, publisher: 'Other Publisher' }])
  assert.equal(changes.length, 1)
  assert.match(buildCoverApplySql(changes), /AND EXISTS \(SELECT 1 FROM content_locales d WHERE/u)
  assert.equal(storedCoverCandidates(() => [{ ...donor, cover: 'https://books.google.com/cover.jpg' }], [row]).length, 0)
})

test('저장 SQL은 비어 있는 표지만 고치고 행 해시로 동시 수정을 보호한다', () => {
  const sql = buildCoverApplySql([{ row, cover: 'https://covers.openlibrary.org/b/id/9263972-L.jpg', source: 'https://openlibrary.org/books/OL24032618M' }])
  assert.match(sql, /thumbnail_url=.*sources=jsonb_set/su)
  assert.match(sql, /nullif\(btrim\(t.thumbnail_url\),' '\)|nullif\(btrim\(t.thumbnail_url\),''\) IS NULL/u)
  assert.match(sql, /md5\(to_jsonb\(t\)::text\)=E'a{32}'/u)
  assert.doesNotMatch(sql, /SET (?:title|creator|isbn|publisher)=/u)
  assert.match(sql, /preserved_hash/u)
  assert.doesNotMatch(sql, /::uuid/u)
  assert.throws(() => buildCoverApplySql([{ row: { ...row, table: 'contents' }, cover: 'https://example.com/a', source: 'https://example.com/b' }]), /Unsupported/)
})
