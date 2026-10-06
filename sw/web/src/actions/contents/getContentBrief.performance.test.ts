import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as localeText from '../../lib/utils/content-locale-text'
import { coalesceCacheQuery } from '../../lib/cacheQuery'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getContentBrief.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const id = '47b7b3d9-ebe8-4d39-a04c-c3f5c0b0d026'

function fixture(description: string | null, metadata: Record<string, unknown> = { itunesUrl: 'https://music.apple.com/album/test?i=123' }) {
  let externalCalls = 0
  let databaseReads = 0
  const row = { id, type: 'MUSIC', external_id: '123', external_source: 'itunes',
    metadata,
    content_locales: [{ locale: 'ko', title: '말하는 대로', creator: '처진 달팽이', description }] }
  const query = { select: () => query, eq: () => query, maybeSingle: async () => {
    databaseReads++
    return { data: row, error: null }
  } }
  const mocks: { [key: string]: unknown } = {
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/cacheQuery': { coalesceCacheQuery },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read(),
      throwOnQueryError: () => {}, withQueryFallback: (_label: string, read: () => unknown) => read() },
    './fetchContentMetadata': { fetchContentMetadata: async () => { externalCalls++; return { metadata: null } } },
    './fetchBookMetadata': { getBookIntroduction: async () => { externalCalls++; return null } },
    './fetchMusicIntros': { fetchMusicIntros: async () => { externalCalls++; return [] } },
    '@/lib/developer-mode': { isDeveloperMode: () => false },
    '@/lib/utils/book-description': { mediaIntroductionAttribution: () => undefined },
    '@/lib/utils/content-locale': { CL_SELECT: '*' },
    '@/lib/utils/content-locale-text': localeText,
  }
  const loaded = { exports: {} as { getContentBrief: (id: string, locale: string) => Promise<{ description: string | null }>;
    getInitialContentBrief: (id: string, locale: string) => Promise<{ enrichmentPending?: boolean }> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => mocks[key] ?? require(key), loaded, loaded.exports)
  return { ...loaded.exports, calls: () => externalCalls, databaseReads: () => databaseReads }
}

test('stored music introduction does not wait for external search', async () => {
  const f = fixture('말하는 대로는 처진 달팽이가 발표한 노래이다.')
  assert.equal((await f.getContentBrief(id, 'ko')).description, '말하는 대로는 처진 달팽이가 발표한 노래이다.')
  assert.equal(f.calls(), 0)
  assert.equal(f.databaseReads(), 1)
})

test('initial page data returns without searching even when introduction is missing', async () => {
  const f = fixture(null)
  assert.equal((await f.getInitialContentBrief(id, 'ko')).enrichmentPending, true)
  assert.equal(f.calls(), 0)
})

test('stored introduction does not suppress missing metadata enrichment', async () => {
  const f = fixture('말하는 대로는 처진 달팽이가 발표한 노래이다.', {})
  assert.equal((await f.getInitialContentBrief(id, 'ko')).enrichmentPending, true)
  assert.equal(f.calls(), 0)
  await f.getContentBrief(id, 'ko')
  assert.equal(f.calls(), 1)
})
