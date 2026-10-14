import assert from 'node:assert/strict'
import test from 'node:test'
import { toScriptureResult } from './scriptureResult'

const row = { content_id: 'book', content_type: 'BOOK', title_ko: '한국어판', title_en: 'English edition',
  creator: '저자', creator_en: 'Author', thumbnail_url: 'ko-cover', thumbnail_en: 'en-cover',
  celeb_count: '9', user_count: '3', avg_rating: 0, total_count: '25', has_en_edition: true, isbn_en: 'isbn' }

test('shared RPC mapping preserves both editions, page counts and zero ratings', () => {
  const ko = toScriptureResult([row], 'ko', 2, 12)
  const en = toScriptureResult([row], 'en', 2, 12)
  assert.equal(ko.contents[0].title, '한국어판')
  assert.equal(ko.contents[0].thumbnail_url, 'ko-cover')
  assert.equal(en.contents[0].title, 'English edition')
  assert.equal(en.contents[0].thumbnail_url, 'en-cover')
  assert.equal(en.contents[0].creator, 'Author')
  assert.equal(en.contents[0].isbn_en, 'isbn')
  assert.equal(en.contents[0].celeb_count, 9)
  assert.equal(en.contents[0].avg_rating, 0)
  assert.equal(en.currentPage, 2)
  assert.equal(en.totalPages, 3)
})

test('missing English book covers do not fall back to Korean editions', () => {
  assert.equal(toScriptureResult([{ ...row, thumbnail_en: null }], 'en', 1, 12).contents[0].thumbnail_url, null)
  assert.deepEqual(toScriptureResult(null, 'en', 2, 12), { contents: [], total: 0, totalPages: 0, currentPage: 2 })
})
