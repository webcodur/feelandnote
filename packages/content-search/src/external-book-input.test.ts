import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveExternalBookInput, type ExternalBookInput } from './external-book-input'
import type { OpenLibraryBookMetadata } from './openlibrary'

const official: OpenLibraryBookMetadata = {
  isbn: '9780771038518', title: 'Sapiens: A Brief History of Humankind', creator: 'Yuval Noah Harari',
  publisher: 'Signal', publishDate: '2014', coverImageUrl: null,
  sourceUrl: 'https://openlibrary.org/books/OL27700871M', workKey: '/works/OL17075811W',
  languages: ['/languages/eng'],
}
const selected: ExternalBookInput = {
  externalId: official.isbn, externalSource: 'openlibrary', title: 'Sapiens', creator: official.creator,
  coverImageUrl: null, metadata: { isbn: official.isbn, editionKey: '/books/OL27700871M', workKey: official.workKey },
}
const options = { getEnglishBookMetadata: async () => official }

test('selected edition/work verification accepts an omitted subtitle and keeps canonical metadata', async () => {
  const result = await resolveExternalBookInput(selected, options)
  assert.equal(result.title, official.title)
  assert.equal(result.metadata.publisher, 'Signal')
  assert.equal(result.locale, 'en')
})

test('a different edition or work is rejected even with the same title', async () => {
  for (const metadata of [
    { ...selected.metadata, editionKey: '/books/OL1M' },
    { ...selected.metadata, workKey: '/works/OL1W' },
    { ...selected.metadata, workKey: undefined },
  ]) await assert.rejects(resolveExternalBookInput({ ...selected, title: official.title, metadata }, options), /판본과 ISBN/)
})

test('unanchored inputs still require title and original author agreement', async () => {
  await assert.rejects(resolveExternalBookInput({ ...selected, metadata: { isbn: official.isbn } }, options), /제목·원저자/)
})

test('mismatched ISBN and forbidden suppliers never reach the lookup', async () => {
  const noLookup = { getEnglishBookMetadata: async () => { throw new Error('Should not lookup') } }
  await assert.rejects(resolveExternalBookInput({ ...selected, externalId: '9780553448191' }, noLookup), /외부 ID/)
  await assert.rejects(resolveExternalBookInput({ ...selected, externalSource: 'amazon' }, noLookup), /카카오 또는 OpenLibrary/)
})
