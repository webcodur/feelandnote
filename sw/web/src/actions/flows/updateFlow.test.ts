import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { createClient } from '@feelandnote/db'
import * as references from '../../lib/content-reference-validation'

const compiled = ts.transpileModule(readFileSync(new URL('./updateFlow.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
type Params = { flowId: string; tiers?: unknown; hasTiers?: boolean; expectedUpdatedAt?: string | null; expectedTiers?: unknown; expectedHasTiers?: boolean | null; name?: string }
type Result = { success: boolean; error?: string; message?: string }

function fixture() {
  const flow = { id: 'flow', user_id: 'owner', updated_at: '2026-10-02T10:00:00.123456+00:00' as string | null,
    tiers: { S: ['a'], Legacy: ['c'] } as Record<string, string[]> | null, has_tiers: true as boolean | null, name: 'before' }
  const state = { contents: new Set(['a', 'b', 'c']), lookupError: false, flowError: false, nullLookup: false,
    beforePatch: undefined as (() => void) | undefined, patchError: false, patches: [] as Record<string, unknown>[], lookups: [] as string[][], revalidated: [] as string[] }
  const db = createClient('https://db.test', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      const table = url.pathname.split('/').at(-1)
      const method = init?.method ?? 'GET'
      if (table === 'contents') {
        const ids = url.searchParams.get('id')!.slice(4, -1).split(',')
        state.lookups.push(ids)
        if (state.lookupError) return Response.json({ code: 'XX000', message: 'lookup failed', details: '', hint: '' }, { status: 503 })
        if (state.nullLookup) return Response.json(null)
        return Response.json(ids.filter(id => state.contents.has(id)).map(id => ({ id })))
      }
      assert.equal(table, 'flows')
      if (state.flowError) return Response.json({ code: 'XX000', message: 'flow lookup failed', details: '', hint: '' }, { status: 503 })
      if (method === 'PATCH') {
        state.beforePatch?.()
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        state.patches.push(body)
        if (state.patchError) return Response.json({ code: 'XX000', message: 'write failed', details: '', hint: '' }, { status: 503 })
        for (const key of ['id', 'user_id', 'updated_at', 'tiers', 'has_tiers'] as const) {
          const filter = url.searchParams.get(key)
          if (!filter) continue
          if (filter === 'is.null') { if (flow[key] !== null) return Response.json([]); continue }
          const expected = filter.slice(3)
          const actual = typeof flow[key] === 'object' ? JSON.stringify(flow[key]) : String(flow[key])
          if (expected !== actual) return Response.json([])
        }
        Object.assign(flow, body)
        return Response.json([{ id: flow.id }])
      }
      return Response.json(flow.id ? [structuredClone(flow)] : [])
    } },
  })
  db.auth.getUser = async () => ({ data: { user: { id: 'owner', aud: 'authenticated', created_at: '', app_metadata: {}, user_metadata: {} } }, error: null })
  const mocks: Record<string, unknown> = {
    '@/lib/db/server': { createClient: async () => db },
    '@/lib/content-reference-validation': references,
    'next/cache': { revalidatePath: (path: string) => state.revalidated.push(path) },
    '@/lib/errors': {
      failure: (error: string, message = error) => ({ success: false, error, message }),
      success: (data: unknown) => ({ success: true, data }),
      handleDatabaseError: () => ({ success: false, error: 'DB_ERROR' }),
    },
  }
  const loaded = { exports: {} as { updateFlow: (params: Params) => Promise<Result> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    assert.ok(id in mocks, 'unexpected import ' + id)
    return mocks[id]
  }, loaded, loaded.exports)
  const params = (): Params => ({ flowId: 'flow', hasTiers: true, tiers: { S: ['b', 'a', 'b'], Legacy: ['c'] },
    expectedUpdatedAt: flow.updated_at, expectedTiers: structuredClone(flow.tiers), expectedHasTiers: flow.has_tiers })
  return { flow, state, params, save: loaded.exports.updateFlow, db }
}

test('saves all tier keys, duplicates and order unchanged after checking current contents IDs', async () => {
  const f = fixture(), input = f.params()
  assert.equal((await f.save(input)).success, true)
  assert.deepEqual(f.flow.tiers, input.tiers)
  assert.deepEqual(f.state.lookups, [['b', 'a', 'c']])
  assert.equal(f.state.revalidated.length, 2)
  assert.notEqual(f.flow.updated_at, input.expectedUpdatedAt)
})

test('deleted content is rejected without writing or silently removing the user item', async () => {
  const f = fixture(), input = f.params()
  f.state.contents.delete('b')
  assert.equal((await f.save(input)).error, 'VALIDATION_ERROR')
  assert.deepEqual(input.tiers, { S: ['b', 'a', 'b'], Legacy: ['c'] })
  assert.equal(f.state.patches.length, 0)
  assert.equal(f.state.revalidated.length, 0)
})

test('lookup failure and malformed lookup response are distinguished from zero found rows', async () => {
  for (const mode of ['lookupError', 'nullLookup'] as const) {
    const f = fixture(); f.state[mode] = true
    assert.equal((await f.save(f.params())).error, 'DB_ERROR')
    assert.equal(f.state.patches.length, 0)
  }
  const f = fixture(); f.state.contents.clear()
  assert.equal((await f.save(f.params())).error, 'VALIDATION_ERROR')
})

test('stale editor revision and a writer without its original tier snapshot cannot overwrite the row', async () => {
  const f = fixture(), input = f.params()
  f.flow.updated_at = '2026-10-02T11:00:00.000000+00:00'
  assert.equal((await f.save(input)).error, 'CONFLICT')
  const oldClient = fixture()
  assert.equal((await oldClient.save({ flowId: 'flow', tiers: { S: ['a'] } })).error, 'CONFLICT')
  assert.equal(f.state.patches.length + oldClient.state.patches.length, 0)
})

test('atomic update rejects a merge changing tiers even when updated_at was not touched', async () => {
  const f = fixture(), input = f.params()
  f.state.beforePatch = () => { f.flow.tiers = { S: ['c'], Legacy: ['a'] } }
  assert.equal((await f.save(input)).error, 'CONFLICT')
  assert.deepEqual(f.flow.tiers, { S: ['c'], Legacy: ['a'] })
  assert.equal(f.state.revalidated.length, 0)
})

test('atomic update rejects a concurrent revision, owner change and tier visibility change', async () => {
  for (const mutate of [(f: ReturnType<typeof fixture>) => { f.flow.updated_at = 'later' },
    (f: ReturnType<typeof fixture>) => { f.flow.user_id = 'another-owner' },
    (f: ReturnType<typeof fixture>) => { f.flow.has_tiers = false }]) {
    const f = fixture(), input = f.params()
    f.state.beforePatch = () => mutate(f)
    assert.equal((await f.save(input)).error, 'CONFLICT')
    assert.equal(f.state.revalidated.length, 0)
  }
})

test('nullable original revision and tiers use IS NULL rather than an equality to null', async () => {
  const f = fixture(); f.flow.updated_at = null; f.flow.tiers = null; f.flow.has_tiers = null
  assert.equal((await f.save(f.params())).success, true)
})

test('flow lookup failure, missing flow and failed update produce different results', async () => {
  const failed = fixture(); failed.state.flowError = true
  assert.equal((await failed.save(failed.params())).error, 'DB_ERROR')
  const missing = fixture(); missing.flow.id = ''
  assert.equal((await missing.save(missing.params())).error, 'NOT_FOUND')
  const write = fixture(); write.state.patchError = true
  assert.equal((await write.save(write.params())).error, 'DB_ERROR')
  assert.equal(write.state.revalidated.length, 0)
})

test('malformed tier JSON is rejected and every ID beyond the first lookup batch is checked', async () => {
  for (const tiers of [{ S: 'a' }, [['a']], { S: [42] }, { S: [''] }]) {
    const f = fixture()
    assert.equal((await f.save({ ...f.params(), tiers })).error, 'VALIDATION_ERROR')
    assert.equal(f.state.patches.length, 0)
  }
  const f = fixture(), ids = Array.from({ length: 205 }, (_, n) => 'content-' + n)
  f.state.contents = new Set(ids); f.state.contents.delete(ids.at(-1)!)
  assert.equal((await f.save({ ...f.params(), tiers: { S: ids } })).error, 'VALIDATION_ERROR')
  assert.deepEqual(f.state.lookups.map(ids => ids.length), [100, 100, 5])
  assert.equal(f.state.patches.length, 0)
})
