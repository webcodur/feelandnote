import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getTagSharedLibrary.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

// Shapes follow the live tables: content_locales.affiliate_url is a JSON array of { url, platform }.
const tables: Record<string, unknown[]> = {
  faction_atlas_members: [{ celeb_id: 'a' }, { celeb_id: 'b' }],
  celebs: [
    { id: 'a', slug: 'a', nickname: 'A', nickname_en: 'A', avatar_url: null },
    { id: 'b', slug: 'b', nickname: 'B', nickname_en: 'B', avatar_url: null },
  ],
  celeb_contents: ['a', 'b'].map((celeb_id) => ({
    celeb_id,
    content_id: 'book',
    contents: {
      id: 'book',
      type: 'BOOK',
      content_locales: [{ locale: 'ko', title: '책', creator: null, thumbnail_url: null, affiliate_url: [{ url: 'https://link.coupang.com/a/test', platform: 'coupang' }] }],
    },
  })),
  figure_book_purchase_options: [],
}

function load() {
  const db = {
    from(table: string) {
      const builder: Record<string, unknown> = { then: (resolve: (value: unknown) => void) => resolve({ data: tables[table], error: null }) }
      for (const method of ['select', 'eq', 'in', 'order', 'range', 'overrideTypes']) builder[method] = () => builder
      return builder
    },
  }
  const mocks: Record<string, unknown> = {
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => db },
  }
  const loaded = { exports: {} as { getTagSharedLibrary: (tagId: string) => Promise<{ contentId: string; coupangUrl: string | null; celebCount: number }[]> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return loaded.exports.getTagSharedLibrary
}

test('shared shelf reads coupang links stored as the live JSON array instead of failing the whole tag', async () => {
  const library = await load()('tag')
  assert.equal(library.length, 1)
  assert.equal(library[0].contentId, 'book')
  assert.equal(library[0].celebCount, 2)
  assert.equal(library[0].coupangUrl, 'https://link.coupang.com/a/test')
})
