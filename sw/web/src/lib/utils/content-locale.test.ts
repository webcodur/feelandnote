import assert from 'node:assert/strict'
import test from 'node:test'

import { flattenLocales, type ContentLocaleRow } from './content-locale'

const koRow: ContentLocaleRow = {
  locale: 'ko',
  title: '홍길동전',
  creator: '허균',
  thumbnail_url: 'https://example.test/ko.jpg',
  isbn: '9788901234567',
  sources: { primary: 'kakao_book' },
}

const enRow: ContentLocaleRow = {
  locale: 'en',
  title: 'The Tale of Hong Gildong',
  creator: 'Heo Gyun',
  thumbnail_url: 'https://example.test/en.jpg',
  isbn: '9780140123456',
  sources: { primary: 'openlibrary' },
}

/** 표시용 제목 행 — 제목만 있고 sources.title로 번역·음차를 밝힌다 */
function displayTitleRow(locale: string, title: string, kind: string): ContentLocaleRow {
  return {
    locale,
    title,
    creator: null,
    thumbnail_url: null,
    isbn: null,
    publisher: null,
    description: null,
    sources: { primary: 'none', title: kind },
  }
}

test('요청 ko, ko 행이 없으면 no-ko', () => {
  const flat = flattenLocales([enRow], 'ko')
  assert.equal(flat.title_badge, 'no-ko')
  assert.equal(flat.title, enRow.title)
})

test('요청 en, en 행이 음차 표시용 제목이면 no-en', () => {
  const flat = flattenLocales([koRow, displayTitleRow('en', 'Hong Gildong jeon', 'romanized')], 'en')
  assert.equal(flat.title_badge, 'no-en')
  assert.equal(flat.title, 'Hong Gildong jeon')
})

test('요청 ko, ko 행이 정상이면 null', () => {
  const flat = flattenLocales([koRow, enRow], 'ko')
  assert.equal(flat.title_badge, null)
  assert.equal(flat.title, koRow.title)
})

test('요청 en, en도 ko도 없으면 no-en', () => {
  const flat = flattenLocales([], 'en')
  assert.equal(flat.title_badge, 'no-en')
  assert.equal(flat.title, '')
})

test('요청 en, en 행이 번역 표시용 제목이면 no-en', () => {
  const flat = flattenLocales([koRow, displayTitleRow('en', 'The Tale of Hong Gildong', 'translated')], 'en')
  assert.equal(flat.title_badge, 'no-en')
})

test('locale 미전달은 ko 기준으로 판정한다', () => {
  assert.equal(flattenLocales([enRow]).title_badge, 'no-ko')
  assert.equal(flattenLocales([koRow, enRow]).title_badge, null)
})

test('제목이 비어 반대 언어로 폴백하면 배지를 붙인다', () => {
  const flat = flattenLocales([{ ...koRow, title: '' }, enRow], 'ko')
  assert.equal(flat.title_badge, 'no-ko')
  assert.equal(flat.title, enRow.title)
})

test('title이 null인 행도 미확인으로 본다', () => {
  assert.equal(flattenLocales([{ ...koRow, title: null }, enRow], 'ko').title_badge, 'no-ko')
})

test('sources.title이 출처 URL인 옛 행은 표시행이 아니다(「샘 올트먼: AI 제국의 설계자」 회귀)', () => {
  const legacy: ContentLocaleRow = {
    locale: 'ko', title: '샘 올트먼: AI 제국의 설계자', creator: '저우헝싱', thumbnail_url: null, isbn: '9791194620150', publisher: null, description: null,
    sources: { primary: 'kakao_book', title: 'https://search.daum.net/search?w=bookpage&bookId=7015854', isbn: 'https://search.daum.net/search?w=bookpage&bookId=7015854' },
  }
  assert.equal(flattenLocales([legacy], 'ko').title_badge, null)
  assert.equal(flattenLocales([legacy], 'en').title_badge, 'no-en')
})

test('표식 값이라도 primary가 none이 아니면 표시행이 아니다', () => {
  const row: ContentLocaleRow = { locale: 'ko', title: '정상 제목', creator: null, thumbnail_url: null, sources: { primary: 'kakao_book', title: 'translated' } }
  assert.equal(flattenLocales([row], 'ko').title_badge, null)
})

test('sources가 없거나 title 표기가 없으면 배지를 붙이지 않는다', () => {
  assert.equal(flattenLocales([{ ...koRow, sources: undefined }], 'ko').title_badge, null)
  assert.equal(flattenLocales([{ ...koRow, sources: null }], 'ko').title_badge, null)
  assert.equal(flattenLocales([{ ...koRow, sources: { primary: 'kakao_book', title: '' } }], 'ko').title_badge, null)
})
