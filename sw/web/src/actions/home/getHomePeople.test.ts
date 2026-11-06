import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const person = (id: string, nationality: string, birth_date = '1970-01-01') => ({ id, slug: id, nickname: id, avatar_url: 'avatar', nationality, total_score: nationality === 'US' ? 45 : 30, content_count: 5, birth_date, death_date: null as string | null })
const rows = [person('kr1', 'KR'), person('kr2', 'KR'), person('kr3', 'KR'), person('jp1', 'JP'), person('us1', 'US'), person('us2', 'US'), { ...person('kr-empty', 'KR'), content_count: 0 }, person('kr-ancient', 'KR', '1397-05-15')]

test('discovery prioritizes local people while showcases ignore nationality and lead with influential contemporaries', async () => {
  const queries: Record<string, unknown>[] = []
  const cache = new Map<string, unknown>()
  const mocks: Record<string, unknown> = {
    '@/lib/cache': {
      LIST_REVALIDATE: 3600,
      async cachedList(_tag: string, key: string[], load: () => unknown) {
        const id = JSON.stringify(key)
        if (!cache.has(id)) cache.set(id, await load())
        return cache.get(id)
      },
    },
    '@/lib/db/static': { createStaticClient: () => ({ rpc(_name: string, args: Record<string, unknown>) {
      queries.push(args)
      return { select: () => ({ order: (field: string) => {
        assert.equal(field, 'id')
        return { range: async () => ({ data: args.p_content_type
          ? (args.p_content_type === 'BOOK' ? rows : []).map(row => ({ id: row.id }))
          : [...rows.filter(row => row.content_count >= Number(args.p_min_content_count)), { ...person('unrated', 'US'), total_score: 0 }], error: null }) }
      } }) }
    } }) },
  }
  const source = ts.transpileModule(readFileSync(new URL('./getHomePeople.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loaded = { exports: {} as {
    getHomeShowcasePeople: (mode: string, day: string) => Promise<typeof rows>
    getHomeDiscoveryPeople: (country: string | null, day: string) => Promise<typeof rows>
  } }
  new Function('require', 'module', 'exports', source)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const { getHomeShowcasePeople: showcase, getHomeDiscoveryPeople: discovery } = loaded.exports
  const korean = await discovery('kr', '2026-11-02')
  assert.deepEqual(korean.slice(0, 3).map(row => row.nationality), ['KR', 'KR', 'KR'])
  assert.equal(korean.some(row => row.id === 'kr-empty'), false, 'The portrait-only discovery card still requires owned content')
  assert.deepEqual(await discovery('KR', '2026-11-02'), korean)
  assert.equal(korean.some(row => row.id === 'unrated'), false)
  assert.equal(korean.at(-1)?.id, 'kr-ancient', 'Historical people stay behind every contemporary candidate')
  assert.ok(korean.every(row => !('birth_date' in row)))
  assert.deepEqual((await discovery('JP', '2026-11-03')).slice(0, 3).map(row => row.nationality), ['JP', 'US', 'US'], 'Other countries only fill missing local slots')
  assert.deepEqual((await discovery('US', '2026-11-03')).slice(0, 2).map(row => row.nationality), ['US', 'US'])
  const books = await showcase('books', '2026-11-02')
  assert.deepEqual(books.slice(0, 2).map(row => row.id).sort(), ['us1', 'us2'], 'Only contemporary people clearing the influence bar lead, whatever their nationality')
  assert.ok(books.findIndex(row => row.id === 'kr-ancient') >= 2)
  assert.ok(books.findIndex(row => row.id === 'kr1') >= 2)
  assert.equal(books.some(row => row.id === 'kr-empty'), false)
  assert.equal(queries.length, 5, 'Discovery and showcases share the same qualified candidates across countries and days')
  assert.deepEqual(queries.map(query => query.p_content_type), [undefined, 'BOOK', 'MUSIC', 'VIDEO', 'GAME'], 'Categories only count coverage and do not select a different person directory')
  assert.ok(queries.every(query => query.p_limit === null && query.p_sort_by === 'influence'))
  assert.ok(queries.every(query => query.p_include_inactive === false))
  assert.equal(queries[0].p_min_content_count, 5)
  assert.ok(queries.every(query => JSON.stringify(query.p_celeb_realities) === '["REAL","BOTH"]'))
})
