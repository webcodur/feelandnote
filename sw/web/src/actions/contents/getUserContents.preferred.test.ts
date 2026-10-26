import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { flattenLocales } from '../../lib/utils/content-locale'

const compiled = ts.transpileModule(readFileSync(new URL('./getUserContents.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

test('홈 대표 작품은 공개 감상만 앞에 놓고, 전체 건수와 다음 쪽을 보존한다', async () => {
  const rows = ['new', 'middle', 'picked', 'private'].map(id => ({ id, content_id: id,
    visibility: id === 'private' ? 'private' : 'public', review: `review-${id}`,
    content: { id, type: 'BOOK', metadata: {}, content_locales: [] } }))
  const from = () => {
    let filtered = [...rows]
    const response = (data: typeof rows) => ({ data, count: filtered.length, error: null })
    const query = {
      select: () => query, order: () => query,
      eq: (key: string, value: string) => {
        if (key === 'visibility') filtered = filtered.filter(row => row.visibility === value)
        return query
      },
      in: (_key: string, ids: string[]) => { filtered = filtered.filter(row => ids.includes(row.content_id)); return query },
      not: (_key: string, _operator: string, value: string) => {
        const ids = value.slice(1, -1).split(',')
        filtered = filtered.filter(row => !ids.includes(row.content_id)); return query
      },
      limit: async (limit: number) => response(filtered.slice(0, limit)),
      range: async (start: number, end: number) => response(filtered.slice(start, end + 1)),
    }
    return query
  }
  const mocks: Record<string, object> = {
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: { CELEBS: 'celebs', CONTENTS: 'contents' } },
    '@/lib/db/server': {}, '@/lib/db/static': { createStaticClient: () => ({ from }) },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read() },
    'next-intl/server': {}, '@/lib/utils/content-locale': { CL_SELECT_LIST: '*', CL_SELECT_LIST_WITH_AFFILIATE: '*', flattenLocales },
    '@/lib/utils/search-sanitize': {}, '@/actions/home/getAffiliateBooks': {},
  }
  type Result = { total: number; items: { content_id: string; public_record: { content_preview: string } }[] }
  const loaded = { exports: {} as { getPublicUserContents: (params: object, locale: string) => Promise<Result> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(mocks[key], `unexpected import ${key}`)
    return mocks[key]
  }, loaded, loaded.exports)
  const read = (page: number, preferredContentIds: string[]) => loaded.exports.getPublicUserContents({
    userId: 'celeb', type: 'BOOK', page, limit: 2, preferredContentIds,
  }, 'ko')
  const first = await read(1, ['picked', 'private', 'missing'])
  const next = await read(2, ['picked', 'private', 'missing'])
  assert.equal(first.total, 3)
  assert.equal(next.total, 3)
  assert.deepEqual(first.items.map(row => row.content_id), ['picked', 'new'])
  assert.equal(first.items[0].public_record.content_preview, 'review-picked')
  assert.deepEqual(next.items.map(row => row.content_id), ['middle'])
  assert.deepEqual((await read(1, ['missing'])).items.map(row => row.content_id), ['new', 'middle'])
})
