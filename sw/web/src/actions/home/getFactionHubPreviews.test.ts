import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const rows = [
  { id: 'first', slug: 'ai-pioneers', name: 'AI pioneers', lv1_id: 'tech', is_featured: true },
  { id: 'missing-slug', slug: null, name: 'Unavailable', lv1_id: 'misc', is_featured: true },
  { id: 'second', slug: 'paypal-mafia', name: 'PayPal mafia', lv1_id: 'business', is_featured: true },
].map((row) => ({ name_en: null, description: null, description_en: null, color: '#fff', team_images: null, ...row }))

const compiled = ts.transpileModule(readFileSync(new URL('./getFactionHubPreviews.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

test('hub previews carry linkable slugs and exclude featured rows without one', async () => {
  const query: Record<string, unknown> = { then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }) }
  for (const method of ['select', 'eq', 'order']) query[method] = () => query
  const dependencies: Record<string, unknown> = {
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: { FACTIONS: 'factions', CELEBS: 'celebs' } },
    '@feelandnote/shared/lib/faction-team-image': { toTeamImages: () => [] },
    '@/lib/cache': { STATIC_REVALIDATE: 3600 },
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/faction-members': { selectVisibleFactionMembers: async () => rows.map((row) => ({ lv2_id: row.id })) },
  }
  const module = { exports: {} as { getFactionHubPreviews: () => Promise<{ id: string; slug: string }[]> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => dependencies[id], module, module.exports)

  assert.deepEqual((await module.exports.getFactionHubPreviews()).map(({ id, slug }) => [id, slug]), [
    ['first', 'ai-pioneers'],
    ['second', 'paypal-mafia'],
  ])
})
