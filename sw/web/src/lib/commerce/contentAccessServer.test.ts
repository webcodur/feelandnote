import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import * as contentAccess from './contentAccess'
import type { AccessStreamEvent } from './contentAccess'
import { selectSteamReference } from '../games/steamPurchase'

type StreamAccess = (id: string, sources: string[], emit: (e: AccessStreamEvent) => void, signal: AbortSignal) => Promise<void>
function loadServer(mocks: { [id: string]: unknown }): StreamAccess {
  const code = ts.transpileModule(readFileSync(new URL('./contentAccessServer.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} as { streamContentAccess: StreamAccess } }
  const require = createRequire(import.meta.url)
  const shared = { './contentAccess': contentAccess, '@/lib/games/steamPurchase': { selectSteamReference } }
  new Function('require', 'module', 'exports', code)((id: string) => mocks[id] ?? shared[id as keyof typeof shared] ?? require(id), loaded, loaded.exports)
  return loaded.exports.streamContentAccess
}

test('one identity lookup starts stores together and emits the fast result before the slow store', async () => {
  const events: AccessStreamEvent[] = []
  const calls: string[] = []
  let dbReads = 0
  let finishXbox!: () => void
  const xbox = new Promise<void>(resolve => { finishXbox = resolve })
  const query = { select: () => query, eq: () => query, maybeSingle: async () => {
    dbReads++
    return { data: { type: 'GAME', external_id: 'igdb-1', content_locales: [{ title: 'Game' }] } }
  } }
  const mocks: { [id: string]: unknown } = {
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/rawFetch': { rawFetch: () => { throw new Error('No external network in test') } },
    '@/lib/games/gameAccess': {
      getCachedGameReference: async () => ({ id: 1, name: 'Game' }),
      getConsoleAccess: async (_game: unknown, _names: unknown, store: string) => {
        calls.push(store)
        if (store === 'xbox') await xbox
        if (store === 'nintendo') throw new Error('Temporary failure')
        return { links: [] }
      },
    },
    '@/lib/games/steamAccess': { getSteamAccess: async () => {
      calls.push('steam')
      return { url: 'https://store.steampowered.com/app/1/', status: 'store' }
    } },
    '@/lib/commerce/mediaAccess': {},
    './contentAccess': contentAccess,
  }
  const running = loadServer(mocks)('id', ['steam', 'playstation', 'xbox', 'nintendo'], e => events.push(e), new AbortController().signal)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(dbReads, 1)
  assert.deepEqual(new Set(calls), new Set(['steam', 'playstation', 'xbox', 'nintendo']))
  assert.ok(events.some(e => e.source === 'steam' && e.kind === 'result'))
  assert.ok(events.some(e => e.source === 'nintendo' && e.kind === 'error'))
  assert.equal(events.some(e => e.source === 'xbox' && e.kind === 'result'), false)
  finishXbox()
  await running
  assert.ok(events.some(e => e.source === 'xbox' && e.kind === 'result'))
  assert.equal(events.filter(e => e.source === 'steam' && e.kind === 'result').length, 1)
})

test('Steam chart identity reuses console lookup without passing a synthetic UUID to the DB', async () => {
  let resolvedApp: number | null = null
  let storeCalls = 0
  let referenceApp = 570
  const events: AccessStreamEvent[] = []
  const stream = loadServer({
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => { throw new Error('Chart must not query a fake content UUID') } },
    '@/lib/rawFetch': {}, '@/lib/commerce/mediaAccess': {}, '@/lib/games/steamAccess': {},
    '@/lib/games/gameAccess': {
      getCachedSteamGameId: async (app: number) => { resolvedApp = app; return 123 },
      getCachedGameReference: async () => ({ id: 123, name: 'Game', websites: [{ url: `https://store.steampowered.com/app/${referenceApp}/` }] }),
      getConsoleAccess: async (_game: unknown, names: string[]) => {
        assert.deepEqual(names, ['Game']); storeCalls++
        return { links: [{ service: 'xbox', url: 'https://www.xbox.com/ko-kr/games/store/-/TEST12345678', title: 'Game', platforms: ['Xbox'] }] }
      },
    },
  })
  await stream('steam-570', ['xbox'], event => events.push(event), new AbortController().signal)
  assert.equal(resolvedApp, 570)
  assert.equal(storeCalls, 1)
  assert.ok(events.some(event => event.kind === 'result' && event.data.links.length === 1))
  // 역조회 ID가 같아도 작품의 공식 Steam 주소가 다르면 다른 판매처를 붙이지 않는다.
  referenceApp = 730
  events.length = 0
  await stream('steam-570', ['xbox'], event => events.push(event), new AbortController().signal)
  assert.equal(storeCalls, 1)
  assert.ok(events.some(event => event.kind === 'result' && event.data.links.length === 0))
})
