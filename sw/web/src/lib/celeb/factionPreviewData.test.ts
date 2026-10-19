import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as selection from './factionPreview'

const require = createRequire(import.meta.url)
type Preview = { id: string; cover: string | null; preview: { kind: string; items: { name: string; nameEn: string | null }[]; remaining: number } | null }

function fixture(grouped = false, failProfiles = false) {
  const profileIds: string[] = []
  let rosterReads = 0
  const members = Array.from({ length: 600 }, (_, index) => ({ lv2_id: 'faction', celeb_id: `p${index}`,
    lv3_id: grouped ? `g${index}` : 'g', group_name: grouped ? `Group ${index}` : 'Group',
    group_name_en: grouped ? `EN Group ${index}` : 'EN Group', group_position: grouped ? index : 0, sort_order: index }))
  const groups = [...new Map(members.map(row => [row.lv3_id, { id: row.lv3_id, name: row.group_name,
    name_en: row.group_name_en, sort_order: row.group_position }])).values()]
  const db = { from(table: string) {
    let ids: string[] = []
    const query = { select: () => query, order: () => query, eq: () => query, or: () => query,
      in: (_key: string, wanted: string[]) => { ids = wanted; if (table === 'celebs') profileIds.push(...wanted); return query },
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({
        data: table === 'faction_lv2' ? ids.map(id => ({ id, team_images: [{ url: 'cover', kind: 'cover' }], groups }))
          : ids.map(id => ({ id, nickname: `Name ${id}`, nickname_en: `EN ${id}` })),
        error: table === 'celebs' && failProfiles ? { message: 'profile query failed' } : null,
      }).then(resolve),
    }
    return query
  } }
  const pass = (fn: unknown) => fn
  const memo = (read: (...args: unknown[]) => Promise<unknown>) => {
    const values = new Map<string, Promise<unknown>>()
    return (...args: unknown[]) => {
      const key = JSON.stringify(args)
      if (!values.has(key)) values.set(key, read(...args).catch(error => { values.delete(key); throw error }))
      return values.get(key)
    }
  }
  const mocks: Record<string, unknown> = {
    react: { cache: pass }, 'next/cache': { unstable_cache: memo },
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: {} },
    '@feelandnote/shared/lib/paginate': require('@feelandnote/shared/lib/paginate'),
    '@feelandnote/shared/lib/faction-team-image': { toTeamImages: (images: unknown) => images },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/faction-members': { PUBLIC_FACTION_FILTER: 'public', selectVisibleFactionMembers: async (_db: unknown, _columns: string, ids: string[]) => {
      rosterReads++
      return members.filter(row => ids.includes(row.lv2_id))
    } },
    '@/lib/cache': { LIST_REVALIDATE: 3600 }, '@/lib/coalescePublicRead': { coalescePublicRead: pass },
    './factionPreview': selection,
  }
  const compiled = ts.transpileModule(readFileSync(new URL('./factionPreviewData.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} as { getFactionPreviewData: (ids: string[], personId: string) => Promise<Preview[]> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(key in mocks, `unexpected import ${key}`)
    return mocks[key]
  }, loaded, loaded.exports)
  return { read: loaded.exports.getFactionPreviewData, profileIds, rosterReads: () => rosterReads }
}

test('a 600-person faction reads only the two displayed names and preserves the full remaining count', async () => {
  const { read, profileIds } = fixture()
  const rows = await read(['faction'], 'p0')
  assert.deepEqual(profileIds, ['p1', 'p2'], 'hidden preview candidates must not trigger profile reads')
  assert.deepEqual(rows[0].preview, { kind: 'people', items: [
    { name: 'Name p1', nameEn: 'EN p1' }, { name: 'Name p2', nameEn: 'EN p2' },
  ], remaining: 597 })
})

test('group previews need no person-name query', async () => {
  const { read, profileIds } = fixture(true)
  const rows = await read(['faction'], 'p0')
  assert.deepEqual(profileIds, [])
  assert.equal(rows[0].preview?.kind, 'groups')
  assert.equal(rows[0].preview?.remaining, 598)
})

test('empty memberships do not read any rosters or profiles', async () => {
  const { read, profileIds, rosterReads } = fixture()
  assert.deepEqual(await read([], 'p0'), [])
  assert.deepEqual(profileIds, [])
  assert.equal(rosterReads(), 0)
})

test('name query errors reject instead of caching an empty preview', async () => {
  const { read } = fixture(false, true)
  await assert.rejects(read(['faction'], 'p0'), /profile query failed/)
})

test('different page owners share roster work but select their own peers', async () => {
  const { read, profileIds, rosterReads } = fixture()
  await read(['faction', 'faction'], 'p0')
  const other = await read(['faction'], 'p1')
  assert.equal(rosterReads(), 1, 'roster cache keys must not depend on the page owner')
  assert.deepEqual(profileIds, ['p1', 'p2', 'p0', 'p2'])
  assert.deepEqual(other[0].preview?.items.map(row => row.name), ['Name p0', 'Name p2'])
})
