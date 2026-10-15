import assert from 'node:assert/strict'
import test from 'node:test'
import { createListingQueryBudget, listingQuerySignal } from './listingQueryBudget'
import { rawFetch } from './rawFetch'
import { normalizeListingParams, CELEB_LISTING_LIMITS, canPromoteDailyListing } from '@/constants/celebListingPolicy'

test('listing limits apply before query keys, including forged Server Action arguments', () => {
  for (const params of [{ limit: 100000 }, { search: 'x'.repeat(81) }, { realities: ['INVALID'] }, { sortBy: 'unknown' }, { birthYearMin: 2000, birthYearMax: 1900 }]) {
    assert.throws(() => normalizeListingParams(params as Parameters<typeof normalizeListingParams>[0]))
  }
  const normalized = normalizeListingParams({ page: 1000000, limit: 48, realities: ['BOTH'], gender: 'female' })
  assert.ok((normalized.page! - 1) * normalized.limit! <= CELEB_LISTING_LIMITS.maxOffset)
  assert.equal(normalizeListingParams({ profession: 'all' }).profession, undefined)
  assert.equal(normalizeListingParams({ limit: 200 }).limit, 200, 'game roster retains its existing batch size')
  for (const filters of [{ realities: ['BOTH'] as const }, { gender: 'female' }, { search: 'name' }, { birthYearMin: 1900 }, { contentType: 'BOOK' }]) {
    assert.equal(canPromoteDailyListing(filters), false)
  }
  assert.equal(canPromoteDailyListing({ page: 2 }), true, 'daily promotion exclusions must remain consistent across pages')
})

test('budget aborts actual HTTP work and releases its concurrency slot', async (t) => {
  const run = createListingQueryBudget(1, 25)
  let aborted = false
  t.mock.method(globalThis, 'fetch', async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => { aborted = true; reject(init!.signal!.reason) }, { once: true })
  }))
  const first = run(async () => { await rawFetch('https://db.example.test/rest/v1/celebs') })
  await assert.rejects(run(async () => 'blocked'), /busy/)
  await assert.rejects(first, /timed out/)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(aborted, true)
  assert.equal(await run(async () => 'recovered'), 'recovered')
  assert.equal(listingQuerySignal(), undefined)
})

test('deadline does not reopen admission while uncancellable work is still running', async () => {
  const run = createListingQueryBudget(1, 10)
  let finish!: () => void
  await assert.rejects(run(() => new Promise<void>(resolve => { finish = resolve })), /timed out/)
  await assert.rejects(run(async () => 'blocked'), /busy/)
  finish()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(await run(async () => 'recovered'), 'recovered')
})
