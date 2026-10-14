import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { initialClassicsQuery, type ClassicsQuery } from '@/lib/library/classicsQuery'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./classics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture() {
  let locale = 'en'
  let fail = false
  const calls: Array<{ kind: string; params: Record<string, unknown> }> = []
  const read = (kind: string) => async (params: Record<string, unknown>) => {
    calls.push({ kind, params })
    if (fail) throw new Error('DB timeout')
    return { contents: [], total: 0, totalPages: 0, currentPage: params.page }
  }
  const mocks: Record<string, unknown> = {
    'next-intl/server': { getLocale: async () => locale },
    './chosen': { getChosenLibrary: read('all') },
    './era': { getEraContents: read('era') },
    './profession': { getLibraryByProfession: read('profession') },
  }
  const loaded = { exports: {} as { getClassicsLibrary: (query: ClassicsQuery) => Promise<unknown> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { ...loaded.exports, calls, locale: (value: string) => { locale = value }, fail: (value: boolean) => { fail = value } }
}

test('only the chosen basis is queried, with the shared page size and strict failures', async () => {
  const f = fixture()
  for (const basis of ['all', 'era', 'profession'] as const) {
    await f.getClassicsLibrary({ ...initialClassicsQuery('actor'), basis, category: 'BOOK', page: 2 })
  }
  assert.deepEqual(f.calls.map(c => c.kind), ['all', 'era', 'profession'])
  assert.ok(f.calls.every(c => c.params.category === 'BOOK' && c.params.page === 2 && c.params.limit === 12 && c.params.throwOnError === true))
})

test('same requests share in-flight work, but locales do not share results', async () => {
  const f = fixture()
  await Promise.all([f.getClassicsLibrary(initialClassicsQuery()), f.getClassicsLibrary(initialClassicsQuery())])
  assert.equal(f.calls.length, 1)
  f.locale('ko')
  await f.getClassicsLibrary(initialClassicsQuery())
  assert.equal(f.calls.length, 2)
})

test('upstream failure is retriable and invalid input never reaches the data source', async () => {
  const f = fixture()
  f.fail(true)
  await assert.rejects(f.getClassicsLibrary(initialClassicsQuery()), /DB timeout/)
  f.fail(false)
  await f.getClassicsLibrary(initialClassicsQuery())
  assert.equal(f.calls.length, 2)
  for (const invalid of [{ page: 0 }, { page: NaN }, { page: 1.5 }, { category: 'UNKNOWN' }, { basis: 'UNKNOWN' }, { era: 'UNKNOWN' }, { profession: null }]) {
    await assert.rejects(f.getClassicsLibrary({ ...initialClassicsQuery(), ...invalid } as ClassicsQuery), /Invalid classics filter/)
  }
  assert.equal(f.calls.length, 2)
})
