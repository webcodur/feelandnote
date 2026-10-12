import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import type { FigureBookContent } from './getFigureBooks'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getFigureBooks.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

test('인물 책장은 ISBN 미상의 확정 제외 작품을 catalog-only로 되살리지 않고 정상 관계와 변경된 원작은 유지한다', async () => {
  const proof = { method: 'independent_work_selection_review', content_id: 'picture', work_title: '유아용 그림책', work_creator: '실제 작가',
    reason: 'children_picture', source_url: 'https://publisher.example/picture', explanation: '실제 출판사의 소개와 본문을 확인하여 유아 전용 창작 그림책으로 판정했다.' }
  const figureBook = { workTitle: proof.work_title, workCreator: proof.work_creator, workSelectionEvidence: [proof] }
  const content = (id: string, figure: unknown) => ({ id, type: 'BOOK', figureBook: figure,
    content_locales: [{ locale: 'ko', title: id, creator: '실제 작가', thumbnail_url: null, isbn: null }] })
  const contents = [content('picture', figureBook), content('normal', { workTitle: '일반 독자용 작품', workCreator: '실제 작가' })]
  const assignments = contents.map(row => ({ content_id: row.id, celeb_id: 'figure', relation_type: 'appearance' }))
  const before = structuredClone({ contents, assignments })
  const db = { from(table: string) {
    let rows = table === 'contents' ? contents : []
    const query = {
      select() { return query }, overrideTypes() { return query }, eq() { return query },
      in(key: string, values: string[]) { rows = rows.filter(row => values.includes(row[key as 'id'])); return query },
      then(resolve: (result: unknown) => void) { return Promise.resolve({ data: rows, error: null }).then(resolve) },
    }
    return query
  } }
  const mocks: Record<string, unknown> = {
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read() },
    '@/lib/developer-mode': { isDeveloperMode: () => false },
    './figureBookAssignments': { getFigureBookAssignmentsByCeleb: async () => assignments },
  }
  const loaded = { exports: {} as { getFigureBooksForCeleb: (id: string, locale: string, catalogOnly: boolean) => Promise<FigureBookContent[]> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => mocks[key] ?? require(key), loaded, loaded.exports)
  const read = () => loaded.exports.getFigureBooksForCeleb('figure', 'ko', true)
  assert.deepEqual((await read()).map(row => row.id), ['normal'])
  assert.deepEqual({ contents, assignments }, before)
  figureBook.workTitle = '새로 확인한 정상 원작'
  assert.deepEqual((await read()).map(row => row.id), ['picture', 'normal'])
})
