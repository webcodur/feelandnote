import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('./getUserContents.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

test('initial celeb records do not wait for sales recommendations or peer readership', async () => {
  const calls: string[] = []
  const query = {
    select: () => query,
    eq: () => query,
    order: (column: string) => { calls.push(`order:${column}`); return query },
    range: async (from: number, to: number) => {
      calls.push(`range:${from}:${to}`)
      return { data: [], count: 0, error: null }
    },
  }
  const unexpected = () => { throw new Error('sales recommendation blocks initial records') }
  const mocks = new Map<string, object>([
    ['@feelandnote/shared/constants/cache-tags', { CACHE_TAGS: { CELEBS: 'celebs', CONTENTS: 'contents' } }],
    ['@/lib/db/server', { createClient: unexpected }],
    ['@/lib/db/static', { createStaticClient: () => ({ from: () => query }) }],
    ['@/lib/cache', {
      cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read(),
      cachedList: unexpected,
      throwOnQueryError: (_label: string, error: unknown) => { if (error) throw error },
    }],
    ['next-intl/server', { getLocale: unexpected }],
    ['@/lib/utils/content-locale', { CL_SELECT_LIST: '*', CL_SELECT_LIST_WITH_AFFILIATE: '*', flattenLocales: unexpected }],
    ['@/lib/utils/search-sanitize', {}],
    ['@/actions/home/getAffiliateBooks', { getAffiliateBooksForCeleb: unexpected }],
  ])
  const loaded = { exports: {} as { getPublicUserContents: (params: object, locale: string) => Promise<{ total: number }> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(mocks.has(key), `unexpected import ${key}`)
    return mocks.get(key)
  }, loaded, loaded.exports)
  const result = await loaded.exports.getPublicUserContents({ userId: 'pearl-buck', type: 'BOOK', page: 1, limit: 4, sortBy: 'recent' }, 'ko')
  assert.equal(result.total, 0)
  assert.deepEqual(calls, ['order:created_at', 'range:0:3'])
})
