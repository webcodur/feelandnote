import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const person = (id: string, nationality: string) => ({ id, slug: id, nickname: id, avatar_url: 'avatar', nationality, total_score: 45, content_count: 5 })
const rows = [person('kr1', 'KR'), person('kr2', 'KR'), person('kr3', 'KR'), person('jp1', 'JP'), person('us1', 'US'), person('us2', 'US'), { ...person('kr-empty', 'KR'), content_count: 0 }]

test('discovery prioritizes local people while retaining the shared content and influence qualifications', async () => {
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
        return { range: async () => ({ data: [...rows.filter(row => row.content_count >= Number(args.p_min_content_count)), { ...person('unrated', 'US'), total_score: 0 }], error: null }) }
      } }) }
    } }) },
  }
  const source = ts.transpileModule(readFileSync(new URL('./getHomePeople.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loaded = { exports: {} as { getHomePeople: (country: string | null, purpose: string, day: string) => Promise<typeof rows> } }
  new Function('require', 'module', 'exports', source)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const get = loaded.exports.getHomePeople
  const korean = await get('kr', 'discovery', '2026-11-02')
  assert.deepEqual(korean.slice(0, 3).map(row => row.nationality), ['KR', 'KR', 'KR'])
  assert.equal(korean.some(row => row.id === 'kr-empty'), false, 'The portrait-only discovery card still requires owned content')
  assert.deepEqual(await get('KR', 'discovery', '2026-11-02'), korean)
  assert.equal(korean.some(row => row.id === 'unrated'), false)
  assert.deepEqual((await get('JP', 'books', '2026-11-02')).slice(0, 3).map(row => row.nationality), ['JP', 'US', 'US'])
  const showcase = await get('KR', 'appreciations', '2026-11-03')
  assert.deepEqual(showcase.slice(0, 3).map(row => row.nationality), ['KR', 'US', 'KR'])
  assert.equal(showcase.some(row => row.id === 'kr-empty'), false)
  assert.deepEqual((await get('JP', 'discovery', '2026-11-03')).slice(0, 3).map(row => row.nationality), ['JP', 'US', 'US'], 'Other countries only fill missing local slots')
  assert.deepEqual((await get('US', 'discovery', '2026-11-03')).slice(0, 2).map(row => row.nationality), ['US', 'US'])
  await get('XX', 'discovery', '2026-11-04')
  assert.equal(queries.length, 1, 'Discovery and showcases share the same qualified candidates across countries and days')
  assert.ok(queries.every(query => query.p_content_type === undefined), 'Categories do not select a different person directory')
  assert.ok(queries.every(query => query.p_limit === null && query.p_sort_by === 'influence'))
  assert.ok(queries.every(query => query.p_include_inactive === false))
  assert.ok(queries.every(query => query.p_min_content_count === 5))
  assert.ok(queries.every(query => JSON.stringify(query.p_celeb_realities) === '["REAL","BOTH"]'))
})
