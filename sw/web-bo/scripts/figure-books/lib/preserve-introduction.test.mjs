import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNoIntroductionLoss, preserveIntroduction } from './preserve-introduction.mjs'

const korean = '이 책은 인간이 판단을 내릴 때 반복해서 저지르는 오류와 이를 줄이는 방법을 설명한다.'
const previous = { isbn: '978-89-12345-67-8', description: korean, sources: { description: 'https://publisher.example/book' } }
const missing = { isbn: '9788912345678', description: null, sources: { primary: 'kakao_book' } }

test('failed edition lookup preserves stored Korean text and its provenance', () => {
  const result = preserveIntroduction(previous, missing, 'ko')
  assert.equal(result.description, korean)
  assert.equal(result.sources.description, previous.sources.description)
  assert.equal(result.sources.primary, 'kakao_book')
})

test('display conversion preserves Korean introduction while removing edition metadata', () => {
  const result = preserveIntroduction(previous, { ...missing, isbn: null, sources: { primary: 'none', title: 'translated' } }, 'ko')
  assert.equal(result.description, korean)
  assert.equal(result.isbn, null)
  assert.equal(result.sources.title, 'translated')
  assertNoIntroductionLoss([previous], result)
})

test('same ISBN lookup failure preserves source marker and URL', () => {
  const marker = { ...previous, description: 'KAKAO' }
  assert.equal(preserveIntroduction(marker, missing, 'ko').description, 'KAKAO')
  assert.equal(preserveIntroduction(marker, missing, 'ko').sources.description, marker.sources.description)
  for (const isbn of [null, '9788912345679']) {
    assert.throws(() => preserveIntroduction(marker, { ...missing, isbn }, 'ko'), /source needs verification/)
  }
})

test('wrong-language or uncertain text blocks preservation without silently deleting it', () => {
  for (const description of ['A book about the story of a scientist.', 'Une histoire de la science.']) {
    assert.throws(() => preserveIntroduction({ ...previous, description }, missing, 'ko'), /language needs review/)
  }
  assert.throws(() => preserveIntroduction({ ...previous, description: 'OPEN' }, missing, 'ko'), /source needs verification/)
  assert.throws(() => preserveIntroduction({ ...previous, description: 'Une histoire de la science.' }, missing, 'en'), /language needs review/)
})

test('verified replacement is accepted and absent previous introduction stays absent', () => {
  const found = { ...missing, description: 'KAKAO', sources: { description: 'https://dapi.kakao.com/new' } }
  assert.equal(preserveIntroduction(previous, found, 'ko'), found)
  assert.equal(preserveIntroduction(null, missing, 'ko'), missing)
})

test('koDel stops for locale or edition introduction, including marker-only data', () => {
  assert.throws(() => assertNoIntroductionLoss([previous]), /must be preserved/)
  assert.throws(() => assertNoIntroductionLoss([{ description: null }, { description: 'DAUM' }]), /must be preserved/)
  assertNoIntroductionLoss([{ description: null }, { description: ' ' }])
})

test('an edition-only introduction or different source cannot be discarded during conversion', () => {
  assert.throws(() => assertNoIntroductionLoss([previous], missing), /must be preserved/)
  assert.throws(() => assertNoIntroductionLoss([{ description: 'DAUM', sources: { description: 'old' } }], { description: 'DAUM', sources: { description: 'new' } }), /must be preserved/)
})
