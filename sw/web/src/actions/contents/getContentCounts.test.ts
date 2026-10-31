import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { CACHE_TAGS, detailCacheTags } from '../../../../../packages/shared/src/constants/cache-tags'
import * as memberContentCache from '../../lib/memberContentCache'

const require = createRequire(import.meta.url)

function fixture() {
  let bookCount = 2
  let reads = 0
  const entries = new Map<string, { value: unknown; tags: readonly string[] }>()
  const unstable_cache = (read: (...args: unknown[]) => Promise<unknown>, keys: string[], options: { tags: string[] }) =>
    async (...args: unknown[]) => {
      const key = JSON.stringify([keys, args])
      const cached = entries.get(key)
      if (cached) return cached.value
      const value = await read(...args)
      entries.set(key, { value, tags: options.tags })
      return value
    }
  const db = {
    from(table: string) {
      let type = ''
      let status: string | undefined
      const query = {
        select() { return query },
        eq(column: string, value: string) {
          if (column === 'content.type') type = value
          if (column === 'status') status = value
          return query
        },
        then(resolve: (result: unknown) => unknown) {
          reads++
          return Promise.resolve({ count: type === 'BOOK'
            ? status === 'FINISHED' ? bookCount : status === 'WANT' ? 3 : bookCount + 3
            : 0, error: null }).then(resolve)
        },
      }
      assert.ok(['celeb_contents', 'member_contents'].includes(table))
      return query
    },
  }
  const mocks: Record<string, unknown> = {
    'next/cache': { unstable_cache },
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS, detailCacheTags },
    './compressedJsonCache': {},
    './cacheQuery': { coalesceCacheQuery: (_key: string, read: () => unknown) => read() },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/db/server': {},
    '@/lib/memberContentCache': memberContentCache,
  }
  const load = (path: string) => {
    const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const mod = { exports: {} as Record<string, (...args: string[]) => Promise<unknown>> }
    new Function('require', 'module', 'exports', compiled)(
      (id: string) => mocks[id] ?? require(id), mod, mod.exports,
    )
    return mod.exports
  }
  mocks['@/lib/cache'] = load('../../lib/cache.ts')
  const actions = load('./getContentCounts.ts')
  return {
    counts: (id: string) => actions.getCelebContentCounts(id),
    memberCounts: (status?: string) => actions.getUserContentCounts('member', status as string),
    addBooks: () => { bookCount = 7 },
    invalidate(tag: string) {
      for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key)
    },
    reads: () => reads,
  }
}

test('인물 갱신 뒤 상단 도서 수도 이전 2권에서 실제 목록의 7권으로 갱신한다', async () => {
  const f = fixture()
  assert.deepEqual(await f.counts('park'), { BOOK: 2, VIDEO: 0, GAME: 0, MUSIC: 0 })
  f.addBooks()
  f.invalidate(`${CACHE_TAGS.CELEBS}:park`)
  assert.deepEqual(await f.counts('park'), { BOOK: 7, VIDEO: 0, GAME: 0, MUSIC: 0 })
})

test('같은 인물의 집계는 캐시하고 다른 인물 갱신에는 보존한다', async () => {
  const f = fixture()
  await f.counts('park')
  const reads = f.reads()
  await f.counts('park')
  f.invalidate(`${CACHE_TAGS.CELEBS}:other`)
  await f.counts('park')
  assert.equal(f.reads(), reads)
})

test('감상 안함은 셀럽 감상 수에 들어가지 않으며 회원 필터는 같은 상태별로 센다', async () => {
  const f = fixture()
  assert.deepEqual(await f.counts('park'), { BOOK: 2, VIDEO: 0, GAME: 0, MUSIC: 0 })
  assert.deepEqual(await f.memberCounts(), { BOOK: 5, VIDEO: 0, GAME: 0, MUSIC: 0 })
  assert.deepEqual(await f.memberCounts('WANT'), { BOOK: 3, VIDEO: 0, GAME: 0, MUSIC: 0 })
  assert.deepEqual(await f.memberCounts('FINISHED'), { BOOK: 2, VIDEO: 0, GAME: 0, MUSIC: 0 })
})

test('회원의 상태 변경 뒤 공개 집계도 같은 회원 태그로 갱신한다', async () => {
  const f = fixture()
  await f.memberCounts('FINISHED')
  f.addBooks()
  f.invalidate(memberContentCache.memberContentCacheTag('member'))
  assert.deepEqual(await f.memberCounts('FINISHED'), { BOOK: 7, VIDEO: 0, GAME: 0, MUSIC: 0 })
})
