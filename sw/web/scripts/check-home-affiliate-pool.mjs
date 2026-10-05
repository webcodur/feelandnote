import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire } from 'node:module'

Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const entries = new Map()
const incrementalCache = {
  generateCacheKey: async key => key,
  get: async key => entries.get(key) ?? null,
  set: async (key, value, options) => entries.set(key, { value, isStale: false, tags: options.tags ?? [] }),
}
const nativeFetch = globalThis.fetch
const nativeWarn = console.warn
console.warn = (...args) => {
  if (!String(args[0]).startsWith('{"tag":"feelandnote-query"')) nativeWarn(...args)
}
let requests = 0
let inFlight = 0
let peak = 0
const tables = {}
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  const table = url.pathname.startsWith('/rest/v1/') ? url.pathname.split('/').at(-1) : null
  if (table) {
    requests++
    tables[table] = (tables[table] ?? 0) + 1
    peak = Math.max(peak, ++inFlight)
  }
  try { return await nativeFetch(input, init) }
  finally { if (table) inFlight-- }
}
const imported = await import('../src/actions/home/getAffiliateBooks.ts')
const { getAffiliateBooks } = imported.default ?? imported
const locales = process.argv.includes('--all') ? ['ko', 'en'] : ['ko']
const progress = setInterval(() => console.log(JSON.stringify({ running: true, requests, peak, tables })), 30_000)
try { for (const locale of locales) {
  const run = async () => {
    const store = { route: `/${locale}`, incrementalCache, pendingRevalidates: {} }
    const unit = { type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity }
    const result = await workAsyncStorage.run(store, () => workUnitAsyncStorage.run(unit, () => getAffiliateBooks(locale, 6)))
    await Promise.all(Object.values(store.pendingRevalidates))
    return result
  }
  const started = performance.now()
  const cold = await run()
  console.log(JSON.stringify({ locale, coldMs: Math.round(performance.now() - started), books: cold.length, requests, peak, tables }))
  assert.equal(cold.length, 6, 'A cold homepage must load six book recommendations')
  const before = requests
  assert.deepEqual(await run(), cold, 'A warm cache must preserve the same recommendations')
  assert.equal(requests, before, 'A warm cache must not query the database')
  assert(peak <= 18, `Cold recommendations opened ${peak} simultaneous requests`)
} } catch (error) {
  console.error(JSON.stringify({ error: error.message, requests, peak, tables }))
  process.exitCode = 1
} finally {
  clearInterval(progress)
  globalThis.fetch = nativeFetch
  console.warn = nativeWarn
}
