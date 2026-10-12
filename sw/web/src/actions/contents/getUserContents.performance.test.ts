import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { flattenLocales } from '../../lib/utils/content-locale'

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

test('책장 선정 원행을 전달해도 일반 공개 감상 목록의 행·건수·감상문은 유지한다', async () => {
  const bookLocale = { locale: 'ko', title: '그림책', creator: '작가', isbn: null, publisher: '출판사',
    sources: { primary: 'kakao_book', edition_selection_evidence: [{ reason: 'children_picture' }] } }
  const metadata = { figureBook: { workTitle: '그림책', workCreator: '작가', workSelectionEvidence: [{
    method: 'independent_work_selection_review', content_id: 'picture', work_title: '그림책', work_creator: '작가',
    reason: 'children_picture', source_url: 'https://publisher.example/picture',
    explanation: '출판사 소개와 실제 본문을 대조하여 유아 전용 그림책이라는 사실을 확인한다.',
  }] } }
  const rows = [{ id: 'reading', content_id: 'picture', visibility: 'public', review: '원행 감상문',
    content: { id: 'picture', type: 'BOOK', metadata, content_locales: [bookLocale] } }]
  const before = structuredClone(rows)
  const query = { select: () => query, eq: () => query, order: () => query,
    range: async () => ({ data: rows, count: 1, error: null }) }
  const db = { from: () => query, auth: { getUser: async () => ({ data: { user: { id: 'member' } } }) } }
  const mocks: Record<string, object> = {
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: { CELEBS: 'celebs', CONTENTS: 'contents' } },
    '@/lib/db/server': { createClient: async () => db }, '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read() },
    'next-intl/server': { getLocale: async () => 'ko' }, '@/lib/utils/content-locale': { CL_SELECT_LIST: '*', CL_SELECT_LIST_WITH_AFFILIATE: '*', flattenLocales },
    '@/lib/utils/search-sanitize': {}, '@/actions/home/getAffiliateBooks': {},
  }
  type Response = {
    items: { content: { metadata: unknown; bookLocale: unknown }; public_record: { content_preview: string } }[]; total: number
  }
  const loaded = { exports: {} as { getPublicUserContents: (params: object, locale: string) => Promise<Response>;
    getUserContents: (params: object) => Promise<Response> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(mocks[key], `unexpected import ${key}`)
    return mocks[key]
  }, loaded, loaded.exports)
  for (const result of [await loaded.exports.getPublicUserContents({ userId: 'celeb', type: 'BOOK' }, 'ko'),
    await loaded.exports.getUserContents({ userId: 'member', type: 'BOOK' })]) {
    assert.equal(result.total, 1)
    assert.equal(result.items.length, 1)
    assert.deepEqual(result.items[0]?.content.bookLocale, bookLocale)
    assert.deepEqual(result.items[0]?.content.metadata, metadata)
    assert.equal(result.items[0]?.public_record.content_preview, '원행 감상문')
  }
  assert.deepEqual(rows, before)
})
