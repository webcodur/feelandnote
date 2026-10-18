import assert from 'node:assert/strict'
import test from 'node:test'
import { loadFigureBookCatalog, resolveFigureBookCatalog } from './figureBookCatalog'

test('embedded catalog reads once and reuses work, locale and bilingual editions without additional DB reads', async () => {
  const reads: string[] = []
  const base = { content_id: 'book', title: 'Classic', creator: 'Author', description: null, isbn: null,
    publisher: null, thumbnail_url: null, release_date: null, edition_kind: 'full', text_scope: 'complete', sort_order: 0 }
  const row = { id: 'book', type: 'BOOK' as const, figureBook: null, content_locales: [],
    catalog: { editions: [{ ...base, id: 1, locale: 'ko' }, { ...base, id: 2, locale: 'en' }], options: [] } }
  const query = { select: () => query, in: () => query, eq: () => query, overrideTypes: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [row], error: null }).then(resolve) }
  const db = { from: (table: string) => { reads.push(table); return query } } as unknown as Parameters<typeof loadFigureBookCatalog>[0]
  const result = await loadFigureBookCatalog(db, ['book'], 'ko')
  assert.deepEqual(result.editions.get('book')?.map(edition => edition.id), [1])
  assert.deepEqual((await resolveFigureBookCatalog(db, result.contents, 'en', true, true)).get('book')?.map(edition => edition.id), [2])
  assert.deepEqual(reads, ['contents'])
})
