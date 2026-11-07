import assert from 'node:assert/strict'
import test from 'node:test'
import { findBookIsbnOwners, hasBookWorkKeyMatch, type BookWorkLookupDb } from './book-work-lookup'

type Row = Record<string, unknown>

function fakeDb(tables: Record<string, Row[]>, failTable?: string): BookWorkLookupDb {
  return {
    from(table: string) {
      const filters: [string, unknown][] = []
      const query = {
        select: () => query,
        limit: () => query,
        eq(field: string, value: unknown) { filters.push([field, value]); return query },
        then(resolve: (value: { data: Row[] | null; error: unknown }) => unknown) {
          if (table === failTable) return Promise.resolve(resolve({ data: null, error: new Error('lookup failed') }))
          const read = (row: Row, field: string) => field.split(/->>?/u).reduce<unknown>((value, key) => (value as Row | undefined)?.[key], row)
          return Promise.resolve(resolve({ data: (tables[table] ?? []).filter(row => filters.every(([field, value]) => read(row, field) === value)), error: null }))
        },
      }
      return query
    },
  }
}

const isbn = '9788954655972'

test('대표 ID·언어 카드·판본에 나뉜 같은 ISBN을 한 작품으로 모은다', async () => {
  const db = fakeDb({ contents: [{ id: 'a', type: 'BOOK', external_id: isbn }], content_locales: [{ content_id: 'a', isbn }], figure_book_editions: [{ content_id: 'a', isbn }] })
  assert.deepEqual(await findBookIsbnOwners(db, isbn), { ids: ['a'], error: null })
})

test('판본에만 있는 ISBN도 원래 작품을 찾는다', async () => {
  const db = fakeDb({ figure_book_editions: [{ content_id: 'b', isbn }] })
  assert.deepEqual((await findBookIsbnOwners(db, isbn)).ids, ['b'])
})

test('같은 ISBN이 여러 작품에 있으면 모두 돌려준다', async () => {
  const db = fakeDb({ content_locales: [{ content_id: 'a', isbn }, { content_id: 'b', isbn }] })
  assert.deepEqual((await findBookIsbnOwners(db, isbn)).ids, ['a', 'b'])
})

test('도서가 아닌 작품의 같은 외부 ID는 소유자로 세지 않는다', async () => {
  const db = fakeDb({ contents: [{ id: 'v', type: 'VIDEO', external_id: isbn }] })
  assert.deepEqual((await findBookIsbnOwners(db, isbn)).ids, [])
})

test('ISBN 조회 오류를 없는 작품으로 바꾸지 않는다', async () => {
  const result = await findBookIsbnOwners(fakeDb({}, 'figure_book_editions'), isbn)
  assert.deepEqual(result.ids, [])
  assert.ok(result.error)
})

test('원작 키는 작품 메타·판본·언어 카드 어디서든 찾는다', async () => {
  const key = '/works/OL1W'
  for (const tables of [
    { contents: [{ id: 'a', type: 'BOOK', metadata: { workKey: key } }] },
    { contents: [{ id: 'a', type: 'BOOK', metadata: { figureBook: { openLibraryWork: key } } }] },
    { figure_book_editions: [{ content_id: 'a', sources: { workKey: key } }] },
    { content_locales: [{ content_id: 'a', sources: { workKey: key } }] },
  ]) assert.deepEqual(await hasBookWorkKeyMatch(fakeDb(tables), key), { found: true, error: null })
  assert.deepEqual(await hasBookWorkKeyMatch(fakeDb({}), key), { found: false, error: null })
})

test('원작 키 조회 오류를 일치 없음으로 바꾸지 않는다', async () => {
  const result = await hasBookWorkKeyMatch(fakeDb({}, 'contents'), '/works/OL1W')
  assert.equal(result.found, false)
  assert.ok(result.error)
})
