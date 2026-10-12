import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import type { FigureBookEdition } from './figureBookLocale'
import { resolveBookShelfBook } from '../../lib/books/bookShelf'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./figureBookEditions.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function load(tables: Record<string, Record<string, unknown>[]>) {
  const db = { from(table: string) {
    let rows = tables[table] ?? []
    const query = {
      select() { return query }, overrideTypes() { return query },
      in(key: string, values: string[]) { rows = rows.filter(row => values.includes(row[key] as string)); return query },
      eq(key: string, value: unknown) { rows = rows.filter(row => row[key] === value); return query },
      then(resolve: (result: unknown) => void) { return Promise.resolve({ data: rows, error: null }).then(resolve) },
    }
    return query
  } }
  const loaded = { exports: {} as { loadFigureBookEditions: (db: unknown, ids: string[], locale: string) => Promise<Map<string, FigureBookEdition[]>> } }
  new Function('require', 'module', 'exports', compiled)(require, loaded, loaded.exports)
  return (ids: string[], locale: string) => loaded.exports.loadFigureBookEditions(db, ids, locale)
}

test('판본 없는 ISBN 미상 제외 작품도 빈 지도값으로 남겨 locale fallback을 막는다', async () => {
  const figureBook = { workTitle: '아이에게 읽어 주는 그림책', workCreator: '실제 작가', workSelectionEvidence: [{
    method: 'independent_work_selection_review', content_id: 'protected', work_title: '아이에게 읽어 주는 그림책', work_creator: '실제 작가',
    reason: 'children_picture', source_url: 'https://publisher.example/picture-book', explanation: '출판사의 실제 소개와 본문을 대조하여 유아 전용 창작 그림책임을 확인했다.' }] }
  const tables = { contents: [{ id: 'protected', metadata: { figureBook } }, { id: 'normal', metadata: null }],
    content_locales: [{ content_id: 'protected', locale: 'ko', title: figureBook.workTitle, creator: figureBook.workCreator, isbn: null }] }
  const before = structuredClone(tables)
  const result = await load(tables)(['protected', 'normal'], 'ko')
  assert.equal(result.has('protected'), true)
  assert.deepEqual(result.get('protected'), [])
  assert.equal(result.has('normal'), false, '미검수 정상 감상 도서는 기존 locale fallback을 유지한다')
  assert.equal(resolveBookShelfBook({ id: 'protected', type: 'BOOK', content_locales: [{ locale: 'ko', title: '그림책', creator: '작가', thumbnail_url: null }] },
    result.get('protected')!, 'ko', undefined, !result.has('protected')), null)
  assert.deepEqual(tables, before)
})

test('locale ISBN 제외는 같은 상품만 막고 정상 번역판과 그 출처를 보존한다', async () => {
  const rejectedIsbn = '9788937460012', normalIsbn = '9791139721966'
  const base = { content_id: 'classic', locale: 'ko', title: '온전한 고전', creator: '원저자', description: null,
    publisher: '출판사', thumbnail_url: null, release_date: null, edition_kind: 'full', text_scope: 'complete', sort_order: 0 }
  const proof = { method: 'independent_selection_review', content_id: 'classic', isbn: rejectedIsbn, locale: 'ko', edition_title: base.title,
    reason: 'editorial_exclusion', source_url: 'https://publisher.example/edition', explanation: '운영자가 해당 실제 판본을 명시적으로 선정에서 제외했으며 다른 역자의 정상 번역본은 보존한다.' }
  const tables = { contents: [{ id: 'classic', metadata: null }],
    content_locales: [{ content_id: 'classic', locale: 'ko', title: base.title, isbn: rejectedIsbn, sources: { edition_selection_evidence: [proof] } }],
    figure_book_editions: [{ ...base, id: 1, isbn: rejectedIsbn, sources: { translators: ['제외 역자'] } },
      { ...base, id: 2, isbn: normalIsbn, sources: { translators: ['정상 역자'], provider_edition_url: 'https://publisher.example/normal' } }] }
  const result = (await load(tables)(['classic'], 'ko')).get('classic')!
  assert.deepEqual(result.map(edition => edition.id), [2])
  assert.deepEqual(result[0].sources, tables.figure_book_editions[1].sources)
})
