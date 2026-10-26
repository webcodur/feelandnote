import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

test('atlas roster needs both an active profile and a visible assignment', async () => {
  const profiles = [
    { id: 'approved', nickname: 'Approved', publication_status: 'active' },
    { id: 'draft', nickname: 'Draft', publication_status: 'inactive' },
    { id: 'hidden', nickname: 'Hidden', publication_status: 'active' },
  ]
  const assignments = [
    { lv2_id: 'faction', celeb_id: 'approved', hidden: false },
    { lv2_id: 'faction', celeb_id: 'draft', hidden: false },
    { lv2_id: 'faction', celeb_id: 'hidden', hidden: true },
  ]
  const db = {
    from(table: string) {
      assert.equal(table, 'celebs')
      let rows = profiles
      const builder = {
        select: () => builder,
        in: (field: string, values: string[]) => {
          assert.equal(field, 'id')
          rows = rows.filter((row) => values.includes(row.id))
          return builder
        },
        eq: (field: string, value: string) => {
          assert.equal(field, 'publication_status')
          rows = rows.filter((row) => row.publication_status === value)
          return builder
        },
        overrideTypes: async () => ({ data: rows, error: null }),
      }
      return builder
    },
  }
  const mocks: Record<string, unknown> = {
    '@/lib/auth/scenePreview': { canPreviewScenes: async () => false },
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    'react': { cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/faction-members': { selectVisibleFactionMembers: async () => assignments.filter((row) => !row.hidden) },
    '@feelandnote/shared/lib/paginate': {
      selectInChunks: async (ids: string[], query: (ids: string[]) => Promise<{ data: unknown[] }>) => (await query(ids)).data,
    },
    './getCelebs': { getInfluenceRanking: async () => ({ scoreMap: {} }) },
    '@/lib/cache': { LIST_REVALIDATE: 3600 },
    '@/lib/cacheQuery': { coalesceCacheQuery: (_key: string, fn: () => unknown) => fn() },
    '@/lib/faction-music': { toFactionMusic: () => null },
  }
  const source = readFileSync(new URL('./getFeaturedFactions.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} as { fetchFactionMembers: (ids: string[]) => Promise<Record<string, { id: string }[]>> } }
  new Function('require', 'module', 'exports', compiled + '\nmodule.exports.fetchFactionMembers = fetchFactionMembers;')(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports,
  )
  const rosters = await loaded.exports.fetchFactionMembers(['faction'])
  assert.deepEqual(rosters.faction.map((person) => person.id), ['approved'])
})
