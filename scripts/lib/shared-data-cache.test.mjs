import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { execFile, spawnSync } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { linkSharedDataCache } from './oracle-web-remote.mjs'

const handlerPath = path.resolve('sw/web/scripts/shared-data-cache.cjs')
const require = createRequire(handlerPath)
const Handler = require(handlerPath)
const { IncrementalCache } = require('next/dist/server/lib/incremental-cache')
const { tagsManifest, areTagsStale } = require('next/dist/server/lib/incremental-cache/tags-manifest.external')
const KEY = 'a'.repeat(64)
const execFileAsync = promisify(execFile)
const nextFs = { ...fs.promises, mkdir: directory => fs.promises.mkdir(directory, { recursive: true }) }

function fixture(t) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'fn-data-cache-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const shared = path.join(root, 'cache/data-v1')
  const context = slot => {
    const app = path.join(root, 'slots', slot, 'sw/web')
    fs.mkdirSync(path.join(app, 'scripts'), { recursive: true })
    fs.writeFileSync(path.join(app, 'scripts/shared-data-cache.cjs'), 'present')
    linkSharedDataCache(app, shared)
    return { serverDistDir: path.join(app, '.next-verify/server'), fs: nextFs, flushToDisk: true, revalidatedTags: [], maxMemoryCacheSize: 0, dev: false }
  }
  return { root, shared, context }
}

const value = body => ({ kind: 'FETCH', data: { body, headers: {}, url: 'https://example.test' }, revalidate: 3600 })
const getContext = tags => ({ kind: 'FETCH', tags, softTags: [] })
const setContext = tags => ({ fetchCache: true, tags })

test('FETCH survives slot replacement and a fresh process with the original age; code keys and HTML remain separate', async t => {
  const { root, shared, context } = fixture(t)
  const blue = new Handler(context('blue'))
  const green = new Handler(context('green'))
  await blue.set(KEY, value('unchanged'), setContext(['stable']))
  const age = new Date(Date.now() - 60_000)
  fs.utimesSync(path.join(shared, 'fetch-cache', KEY), age, age)
  const found = await green.get(KEY, getContext(['stable']))
  assert.equal(found.value.data.body, 'unchanged')
  assert.ok(Math.abs(found.lastModified - age.getTime()) < 2)
  assert.equal(await green.get('b'.repeat(64), getContext(['stable'])), null)
  const script = `const fs=require('node:fs'); const C=require(process.argv[1]); const c=new C({serverDistDir:process.argv[2],fs:fs.promises,flushToDisk:true,revalidatedTags:[],maxMemoryCacheSize:0}); c.get('${KEY}', {kind:'FETCH',tags:['stable']}).then(x=>process.stdout.write(x.value.data.body));`
  const child = spawnSync(process.execPath, ['-e', script, handlerPath, context('green').serverDistDir], { encoding: 'utf8' })
  assert.equal(child.status, 0, child.stderr)
  assert.equal(child.stdout, 'unchanged')
  await blue.set('sample/page', { kind: 'APP_ROUTE', body: Buffer.from('blue HTML'), headers: {} }, { fetchCache: false })
  assert.equal(await green.get('sample/page', { kind: 'APP_ROUTE' }), null)
  assert.equal(fs.existsSync(path.join(root, 'slots/blue/sw/web/.next-verify/server/app/sample/page.body')), true)
})

test('immediate tag invalidation is visible across slots and after a restart; unrelated data is retained', async t => {
  const { context } = fixture(t)
  const blue = new Handler(context('blue'))
  const green = new Handler(context('green'))
  const tag = 'restart-' + path.basename(context('blue').serverDistDir) + Date.now()
  await blue.set(KEY, value('old'), setContext([tag]))
  await blue.set('b'.repeat(64), value('other'), setContext(['unaffected']))
  await delay(10)
  await green.revalidateTag(tag, { expire: 0 })
  assert.equal(await blue.get(KEY, getContext([tag])), null)
  assert.equal((await blue.get('b'.repeat(64), getContext(['unaffected']))).value.data.body, 'other')
  const script = `const fs=require('node:fs'); const C=require(process.argv[1]); const c=new C({serverDistDir:process.argv[2],fs:fs.promises,flushToDisk:true,revalidatedTags:[],maxMemoryCacheSize:0}); c.get('${KEY}', {kind:'FETCH',tags:[process.argv[3]]}).then(x=>process.stdout.write(JSON.stringify(x)));`
  const child = spawnSync(process.execPath, ['-e', script, handlerPath, context('green').serverDistDir, tag], { encoding: 'utf8' })
  assert.equal(child.status, 0, child.stderr)
  assert.equal(child.stdout, 'null')
  await delay(10)
  await blue.set(KEY, value('new'), setContext([tag]))
  assert.equal((await green.get(KEY, getContext([tag]))).value.data.body, 'new')
})

test('Next uses persisted stale-while-revalidate and preserves TTL expiry', async t => {
  const { context } = fixture(t)
  const ctx = context('blue')
  const blue = new Handler(ctx)
  const tag = 'swr-' + Date.now()
  await blue.set(KEY, value('stale candidate'), setContext([tag]))
  await delay(10)
  const green = new Handler(context('green'))
  await green.revalidateTag(tag, { stale: 300, revalidate: 900, expire: 4294967294 })
  const found = await blue.get(KEY, getContext([tag]))
  assert.ok(found)
  assert.equal(areTagsStale([tag], found.lastModified), true)
  const cache = new IncrementalCache({ ...ctx, CurCacheHandler: Handler, requestHeaders: {}, getPrerenderManifest: () => ({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: {} }) })
  // IncrementalCache's actual cacheHandler constructor option is named CurCacheHandler.
  assert.ok(cache.cacheHandler instanceof Handler)
  const result = await cache.get(KEY, { ...getContext([tag]), revalidate: 3600 })
  assert.equal(result.isStale, true)
  assert.equal(result.value.data.body, 'stale candidate')
  const freshKey = 'c'.repeat(64)
  await blue.set(freshKey, { ...value('TTL'), revalidate: 1 }, setContext(['ttl']))
  const past = new Date(Date.now() - 3000)
  fs.utimesSync(blue.getFilePath(freshKey, 'FETCH'), past, past)
  const ttl = await cache.get(freshKey, { ...getContext(['ttl']), revalidate: 1 })
  assert.equal(ttl.isStale, true)
})

test('parallel slot invalidations append without losing tags, and a corrupt log fails closed', async t => {
  const { shared, context } = fixture(t)
  const blue = new Handler(context('blue'))
  const green = new Handler(context('green'))
  await Promise.all([blue.revalidateTag(['parallel-a', 'parallel-b'], { expire: 0 }), green.revalidateTag(['parallel-c'], { expire: 0 })])
  const lines = fs.readFileSync(path.join(shared, 'tags.ndjson'), 'utf8').trim().split('\n').map(JSON.parse)
  assert.deepEqual(lines.map(x => x.tag).sort(), ['parallel-a', 'parallel-b', 'parallel-c'])
  assert.ok(tagsManifest.has('parallel-c'))
  fs.appendFileSync(path.join(shared, 'tags.ndjson'), 'invalid\n')
  await assert.rejects(() => blue.get(KEY, getContext([])), /JSON|Unexpected/)
})

test('local build and development retain native cache behavior without a shared invalidation log', async t => {
  const { root } = fixture(t)
  const local = new Handler({ serverDistDir: path.join(root, '.next/server'), fs: nextFs, flushToDisk: true, revalidatedTags: [], maxMemoryCacheSize: 0, dev: false })
  assert.equal(local.sharedRoot, null)
  await local.set(KEY, value('local'), setContext(['local']))
  assert.equal((await local.get(KEY, getContext(['local']))).value.data.body, 'local')
  assert.equal(fs.existsSync(path.join(root, 'tags.ndjson')), false)
  const development = new Handler({ ...local, serverDistDir: path.join(root, '.next/server'), maxMemoryCacheSize: 0, dev: true })
  assert.equal(development.sharedRoot, null)
})

test('two independent processes preserve every concurrent tag invalidation', async t => {
  const { context, shared } = fixture(t)
  const script = `const fs=require('node:fs'); const C=require(process.argv[1]); const c=new C({serverDistDir:process.argv[2],fs:fs.promises,flushToDisk:true,revalidatedTags:[],maxMemoryCacheSize:0}); c.revalidateTag(Array.from({length:50},(_,i)=>process.argv[3]+i),{expire:0});`
  await Promise.all(['blue', 'green'].map(slot => execFileAsync(process.execPath, ['-e', script, handlerPath, context(slot).serverDistDir, slot + '-concurrent-'])))
  const records = fs.readFileSync(path.join(shared, 'tags.ndjson'), 'utf8').trim().split('\n').map(JSON.parse)
  assert.equal(records.length, 100)
  assert.equal(new Set(records.map(x => x.tag)).size, 100)
  await new Handler(context('green')).get(KEY, getContext([]))
  for (const record of records) assert.equal(tagsManifest.get(record.tag).expired, record.at)
})
