import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getFactionMemberShelf.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture() {
  const reads: string[] = []
  const cached = new Map<string, Promise<unknown>>()
  let fail = false
  let inCache = false
  const db = { from(table: string) {
    reads.push(table)
    const q = { select: () => q, eq: () => q, in: () => q, order: () => q, range: () => q, overrideTypes: () => q,
      then: (resolve: (value: unknown) => void) => Promise.resolve({ data: table === 'celeb_contents'
        ? [{ content_id: 'book', celeb_id: 'a' }] : [{ id: 'a', profession: 'writer' }], error: null }).then(resolve) }
    return q
  } }
  const mocks: Record<string, unknown> = {
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/cache': { cachedList: (_tag: string, key: string[], read: () => Promise<unknown>) => {
      const id = JSON.stringify(key)
      if (!cached.has(id)) cached.set(id, (async () => { inCache = true; try { return await read() } finally { inCache = false } })().catch(error => { cached.delete(id); throw error }))
      return cached.get(id)
    } },
    './factionBookHydrate': { hydrateFactionBooks: async () => {
      reads.push('hydrate')
      if (fail) throw new Error('DB failed')
      return [{ contentId: 'book' }]
    } },
    '@/actions/books/getProfessionBooks': { getProfessionBooks: async () => { assert.equal(inCache, false, 'shared profession cache must not be nested'); reads.push('professionBooks'); return [] } },
  }
  const loaded = { exports: {} as {
    getFactionReadBooks: (ids: string[], locale: string) => Promise<unknown>
    getFactionProfessionShelf: (ids: string[], locale: string) => Promise<unknown>
  } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { ...loaded.exports, reads, setFail: (value: boolean) => { fail = value } }
}

test('감상과 직군은 독립 조회하며 구성원 순서·중복에 관계없이 같은 캐시를 쓴다', async () => {
  const f = fixture()
  await f.getFactionReadBooks(['b', 'a', 'a'], 'ko')
  assert.deepEqual(f.reads, ['celeb_contents', 'hydrate'])
  await f.getFactionReadBooks(['a', 'b'], 'ko')
  assert.deepEqual(f.reads, ['celeb_contents', 'hydrate'])
  await f.getFactionProfessionShelf(['b', 'a'], 'ko')
  assert.deepEqual(f.reads, ['celeb_contents', 'hydrate', 'celebs', 'professionBooks'])
  await f.getFactionReadBooks(['a', 'b'], 'en')
  assert.equal(f.reads.filter(value => value === 'hydrate').length, 2)
})

test('조회 실패를 빈 책장으로 캐시하지 않고 같은 입력으로 다시 조회한다', async () => {
  const f = fixture()
  f.setFail(true)
  await assert.rejects(f.getFactionReadBooks(['a'], 'ko'), /DB failed/)
  f.setFail(false)
  assert.deepEqual(await f.getFactionReadBooks(['a'], 'ko'), [{ contentId: 'book' }])
  assert.equal(f.reads.filter(value => value === 'hydrate').length, 2)
})
