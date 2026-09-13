import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBookIntroductionEdit } from './book-introduction-edit'

const isbn = '9791128823107'

test('editing a translation retains its source URL', async () => {
  const sources = { primary: 'kakao_book', description: 'https://example.com/original' }
  const result = await resolveBookIntroductionEdit({
    description: 'A translated introduction.', isbn, locale: 'en',
    current: { description: 'Previous translation.', isbn, sources },
  })
  assert.deepEqual(result, { description: 'A translated introduction.', sources: { ...sources, translation: 'manual' } })
  assert.equal(sources.description, 'https://example.com/original')
})

test('saving unchanged catalog fields preserves the selected source without a new lookup', async () => {
  const sources = { description: 'https://openlibrary.org/books/OL1M' }
  const result = await resolveBookIntroductionEdit({
    description: 'OPEN', isbn, locale: 'en', current: { description: 'OPEN', isbn, sources },
  })
  assert.deepEqual(result, { description: 'OPEN', sources })
})

test('clearing an introduction clears only its source and translation markers', async () => {
  const result = await resolveBookIntroductionEdit({
    description: '  ', isbn, locale: 'ko',
    current: { description: '기존 문장', isbn, sources: { primary: 'kakao_book', description: 'https://example.com/book', translation: 'manual' } },
  })
  assert.deepEqual(result, { description: null, sources: { primary: 'kakao_book' } })
})

test('a different ISBN cannot inherit a previous introduction source URL', async () => {
  const result = await resolveBookIntroductionEdit({
    description: 'New translation.', isbn: '9780140449136', locale: 'en',
    current: { description: 'Old translation.', isbn, sources: { description: 'https://example.com/old' } },
  })
  assert.deepEqual(result, { description: 'New translation.', sources: { translation: 'manual' } })
})

test('a reserved source value cannot be stored without a verifiable ISBN', async () => {
  await assert.rejects(resolveBookIntroductionEdit({ description: 'KAKAO', isbn: null, locale: 'ko' }))
})

test('a translated introduction cannot silently carry over to a changed edition', async () => {
  await assert.rejects(resolveBookIntroductionEdit({
    description: 'A translation for the old edition.', isbn: '9780140449136', locale: 'en',
    current: { description: 'A translation for the old edition.', isbn, sources: {} },
  }), /ISBN/)
})

test('stored translations must match the requested display language', async () => {
  await assert.rejects(resolveBookIntroductionEdit({ description: '한국어 문장', isbn: null, locale: 'en' }), /영어/)
  await assert.rejects(resolveBookIntroductionEdit({ description: 'An English sentence.', isbn: null, locale: 'ko' }), /한국어/)
  assert.equal((await resolveBookIntroductionEdit({ description: 'An English translation.', isbn: null, locale: 'en' })).description, 'An English translation.')
})
