import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as artwork from '@feelandnote/shared/lib/faction-team-image'

const require = createRequire(import.meta.url)
const scene = { url: 'https://assets.test/private-scene.webp', kind: 'scene' as const, preparing: true,
  label: '준비중', caption: '비공개 해설', labelEn: 'Draft', captionEn: 'Private caption', ending: { title: '끝', text: '비공개 결말' } }
const cover = { url: 'https://assets.test/cover.webp', kind: 'cover' as const }

function load<T>(file: string, mocks: Record<string, unknown>): T {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loaded = { exports: {} }
  new Function('require', 'exports', code)((name: string) => mocks[name] ?? require(name), loaded.exports)
  return loaded.exports as T
}

test('shared myth index and detail caches cannot leak owner scenes to subsequent visitors, in either locale', async () => {
  let canPreview = true
  for (const locale of ['ko', 'en']) {
    const raw = { regions: [], people: [], works: [], myths: [{ id: 'myth', slug: 'myth', isPublished: true, scenesComplete: true,
      images: [{ url: cover.url, label: null }, ...artwork.toSceneImages([scene], locale)] }] }
    const mocks: Record<string, unknown> = {
      react: { cache: (fn: unknown) => fn },
      '@/lib/auth/scenePreview': { canPreviewScenes: async () => canPreview },
      '@/lib/cache': {}, '@/lib/db/static': {}, '@/lib/faction-members': {},
      '@/lib/compressedJsonCache': { compressedJsonCache: () => async () => raw },
      '@feelandnote/shared/lib/faction-team-image': artwork,
    }
    const index = load<typeof import('./getMythIndex')>('./getMythIndex.ts', mocks)
    const detail = load<typeof import('./getMythData')>('./getMythData.ts', { ...mocks,
      './getMythIndex': index, '@/lib/utils/content-locale': {}, '@/actions/figure-books/figureBookAssignments': {},
      '@/actions/figure-books/figureBookCatalog': {}, '@/lib/books/bookShelf': {}, '@/lib/faction-music': {},
      '@/components/features/user/explore/myth/mythHref': { MYTH_OPENING_SLUG: 'myth' },
    })
    for (const access of [true, false, true, false]) {
      canPreview = access
      for (const data of [await index.getMythIndex(locale), await detail.getMythData(locale, 'myth')]) {
        assert.equal(data.myths[0].images.length, access ? 2 : 1)
        assert.equal(data.myths[0].scenesComplete, access)
        if (!access) assert.ok(!JSON.stringify(data).includes('private-scene'))
      }
      assert.equal(raw.myths[0].images.length, 2, 'public filtering must not mutate shared cache data')
    }
  }
})

test('faction list, membership action, and route target all strip preparing artwork from public responses', async () => {
  let canPreview = true
  const row = { id: 'faction', slug: 'faction', is_featured: true, isGroup: false, parentSlug: null,
    team_images: [{ ...cover, scenesPreparing: true }, { ...scene, preparing: undefined }], scenes_complete: true }
  const source = load<typeof import('./getFeaturedFactions')>('./getFeaturedFactions.ts', {
    react: { cache: (fn: unknown) => fn },
    'next/cache': { unstable_cache: (_fn: unknown, keys: string[]) => async () => keys[0].startsWith('featured-faction-rows') ? [row] : { faction: [{ id: 'person' }] } },
    '@/lib/auth/scenePreview': { canPreviewScenes: async () => canPreview },
    '@/lib/cacheQuery': {}, '@/lib/faction-members': {}, '@/lib/cache': {}, '@/lib/db/static': {},
    './getCelebs': {}, '@/lib/faction-music': { toFactionMusic: () => null },
    '@feelandnote/shared/lib/faction-team-image': artwork,
  })
  for (const access of [true, false, true, false]) {
    canPreview = access
    for (const rows of [await source.getFeaturedFactions(), await source.getFactionsByIds(['faction'])]) {
      assert.equal(rows[0].team_images.length, access ? 2 : 1)
      assert.equal(rows[0].scenes_complete, access)
      if (!access) assert.ok(!JSON.stringify(rows).includes('비공개'))
    }
    assert.ok(!JSON.stringify(await source.getFactionRouteTarget('faction')).includes('private-scene'))
    assert.equal(row.team_images.length, 2)
  }
})
