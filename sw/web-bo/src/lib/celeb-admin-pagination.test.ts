import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

type Actions = typeof import('../actions/admin/celebs')
type Row = Record<string, string | null>
type Result = { data: Row[] | null; error: { message: string } | null }

const requireLocal = createRequire(import.meta.url)
const actionCode = ts.transpileModule(
  readFileSync(new URL('../actions/admin/celebs.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

function fixture(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(5, '0')
    return {
      id: `celeb-${number}`, nickname: `Person ${number}`, nickname_en: `English ${number}`,
      slug: `person-${number}`, publication_status: index % 10 === 0 ? 'inactive' : 'active',
      headline: `Headline ${number}`, headline_en: null, avatar_url: null,
      profession: 'actor', title: null, title_en: null, consumption_philosophy: `Journey ${number}`,
      celeb_tier: 'full', celeb_reality: 'REAL',
    }
  })
}

// Run the actual server actions and shared pagination helper. Only framework/DB
// boundaries are replaced; the fake DB enforces the same 1,000-row response cap.
function loadActions(rows: Row[], failAt?: number, relatedTables: Record<string, Row[]> = {}) {
  const requests: Array<{ table: string; from: number; to: number }> = []
  const idChunks: Array<{ table: string; column: string; ids: string[] }> = []
  const tables: Record<string, Row[]> = { celebs: rows, ...relatedTables }
  const db = {
    from(table: string) {
      assert.ok(table in tables, `Unexpected table: ${table}`)
      let selected = ''
      let from = 0
      let to = 999
      const filters: Array<[string, string]> = []
      const inclusions: Array<[string, string[]]> = []
      const orders: Array<{ column: string; ascending: boolean }> = []
      const query = {
        select(columns: string) { selected = columns; return query },
        eq(column: string, value: string) { filters.push([column, value]); return query },
        in(column: string, ids: string[]) {
          assert.ok(ids.length <= 200, `${table}.${column} exceeds the URL-safe ID chunk size`)
          idChunks.push({ table, column, ids })
          inclusions.push([column, ids])
          return query
        },
        order(column: string, options: { ascending?: boolean } = {}) {
          orders.push({ column, ascending: options.ascending !== false })
          return query
        },
        range(start: number, end: number) { from = start; to = end; return query },
        then<TResult1 = Result, TResult2 = never>(
          fulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
          rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ): Promise<TResult1 | TResult2> {
          requests.push({ table, from, to })
          if (from === failAt) {
            return Promise.resolve<Result>({ data: null, error: { message: 'middle page unavailable' } }).then(fulfilled, rejected)
          }
          const filtered = tables[table].filter((row) =>
            filters.every(([column, value]) => row[column] === value) &&
            inclusions.every(([column, ids]) => ids.includes(row[column] || '')),
          )
          filtered.sort((a, b) => {
            for (const { column, ascending } of orders) {
              const comparison = (a[column] || '').localeCompare(b[column] || '')
              if (comparison) return ascending ? comparison : -comparison
            }
            return 0
          })
          const data = filtered.slice(from, Math.min(to + 1, from + 1000)).map((row) =>
            Object.fromEntries(selected.split(',').map((field) => {
              const [alias, source = alias] = field.trim().split(':')
              return [alias, row[source] ?? null]
            })),
          )
          return Promise.resolve<Result>({ data, error: null }).then(fulfilled, rejected)
        },
      }
      return query
    },
  }
  const exports = {}
  vm.runInNewContext(actionCode, {
    exports,
    require(module: string) {
      if (module === '@/lib/db/server') return { createClient: async () => db }
      if (module === '@/lib/db/admin') return { createAdminClient: () => db }
      if (module === '@/lib/celeb-list-filters') return requireLocal('./celeb-list-filters')
      if (module.startsWith('@feelandnote/shared/')) return requireLocal(module)
      if (module.startsWith('@/lib/') || module === 'next/cache') return {}
      throw new Error(`Unexpected dependency: ${module}`)
    },
  }, { filename: 'celebs.ts' })
  return { actions: exports as Actions, requests, idChunks }
}

test('headline editing receives all 4,507 people, including names beyond the fourth page', async () => {
  const rows = fixture(4507)
  const { actions } = loadActions(rows)
  const result = await actions.getCelebsForHeadlineEdit()
  assert.equal(result.length, rows.length)
  assert.equal(new Set(result.map((row) => row.id)).size, rows.length)
  assert.equal(result.find((row) => row.nickname?.includes('04507'))?.id, 'celeb-04507')
  assert.equal(result.find((row) => row.nickname_en?.includes('04506'))?.id, 'celeb-04506')
  assert.equal(result[0].status, 'inactive')
  assert.equal(result.at(-1)?.headline, 'Headline 04507')
})

test('title and profession editing receive every active person across all pages', async () => {
  const rows = fixture(4507)
  const { actions } = loadActions(rows)
  const result = await actions.getCelebsForTitleEdit()
  const expected = rows.filter((row) => row.publication_status === 'active')
  assert.equal(result.length, expected.length)
  assert.deepEqual(Array.from(result, (row) => row.id), expected.map((row) => row.id))
  assert.equal(result.at(-1)?.cultural_journey, 'Journey 04507')
})

test('an L1 section with 1,205 child factions and 4,507 people keeps late members, deduplicates and chunks IDs', async () => {
  const rows: Row[] = fixture(4507).map((row) => ({ ...row, publication_status: 'active' }))
  const childFactions = Array.from({ length: 1205 }, (_, index) => ({
    id: `faction-${String(index).padStart(5, '0')}`, lv1_id: 'theme',
  }))
  const memberships = rows.map((row, index) => ({
    member_id: `member-${String(index).padStart(5, '0')}`,
    celeb_id: row.id, lv2_id: index === rows.length - 1 ? childFactions.at(-1)!.id : 'theme',
  }))
  memberships.push(...memberships.slice(0, 100).map((row, index) => ({
    ...row, member_id: `duplicate-${index}`, lv2_id: childFactions[0].id,
  })))
  const { actions, idChunks } = loadActions(rows, undefined, {
    faction_lv2: childFactions, faction_member_rows: memberships, celeb_contents: [],
  })
  const result = await actions.getCelebs({
    factionId: 'theme', sort: 'nickname', sortOrder: 'asc', page: 91, limit: 50,
  })
  assert.equal(result.total, 4507)
  assert.deepEqual(Array.from(result.celebs, (row) => row.id), rows.slice(4500).map((row) => row.id))
  const personChunks = idChunks.filter((chunk) => chunk.table === 'celebs' && chunk.column === 'id')
  assert.equal(personChunks.length, Math.ceil(rows.length / 200))
  assert.equal(new Set(personChunks.flatMap((chunk) => Array.from(chunk.ids))).size, 4507)
})

for (const action of ['getCelebsForHeadlineEdit', 'getCelebsForTitleEdit'] as const) {
  test(`${action} completes an exact 4,000-row result without loss or duplication`, async () => {
    const rows: Row[] = fixture(4000).map((row) => ({ ...row, publication_status: 'active' }))
    const { actions, requests } = loadActions(rows)
    const result = await actions[action]()
    assert.deepEqual([...result].map((row) => row.id), rows.map((row) => row.id))
    assert.ok(requests.length <= 5, 'does not keep requesting empty pages')
  })

  test(`${action} rejects a middle-page failure instead of returning a partial list`, async () => {
    const rows = fixture(4507).map((row) => ({ ...row, publication_status: 'active' }))
    const { actions } = loadActions(rows, 2000)
    await assert.rejects(actions[action](), /middle page unavailable/)
  })

  test(`${action} returns an empty list when there are no matching people`, async () => {
    const { actions } = loadActions([])
    assert.equal((await actions[action]()).length, 0)
  })
}
