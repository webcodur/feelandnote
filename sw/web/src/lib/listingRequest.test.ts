import assert from 'node:assert/strict'
import test from 'node:test'
import { createListingRequest } from './listingRequest'

const result = (total: number, error: string | null = null) => ({ celebs: [], total, totalPages: 1, page: 1, error })

test('returning to a recent filter reuses the result without a server request', async () => {
  let calls = 0
  const run = createListingRequest(async () => result(++calls))
  assert.equal((await run({ search: 'A', gender: 'female' }))?.total, 1)
  await run({ search: 'B' })
  assert.equal((await run({ gender: 'female', search: 'A' }))?.total, 1)
  assert.equal(calls, 2)
})

test('cache rejects errors, expires results, and never retains an invalidated in-flight result', async (t) => {
  let now = 0
  t.mock.method(Date, 'now', () => now)
  let calls = 0
  let finish: ((value: ReturnType<typeof result>) => void) | undefined
  const run = createListingRequest(async () => {
    calls++
    if (calls === 1) return result(0, 'listing_unavailable')
    if (calls === 4) return new Promise(resolve => { finish = resolve })
    return result(calls)
  })
  await run({ search: 'A' })
  assert.equal((await run({ search: 'A' }))?.total, 2)
  now += 30_001
  assert.equal((await run({ search: 'A' }))?.total, 3)
  const pending = run({ search: 'B' })
  await new Promise(resolve => setImmediate(resolve))
  run.invalidate()
  finish!(result(4))
  await pending
  assert.equal((await run({ search: 'B' }))?.total, 5)
  assert.equal((await run({ search: 'A' }))?.total, 6)
})

test('a cached filter returns immediately and discards a superseded queued filter', async () => {
  const calls: string[] = []
  let finish!: (value: ReturnType<typeof result>) => void
  const run = createListingRequest(async params => {
    calls.push(params.search!)
    if (params.search === 'slow') return new Promise(resolve => { finish = resolve })
    return result(calls.length)
  })
  await run({ search: 'cached' })
  const slow = run({ search: 'slow' })
  const dropped = run({ search: 'obsolete' })
  assert.equal((await run({ search: 'cached' }))?.total, 1)
  assert.equal(await dropped, undefined)
  finish(result(2))
  await slow
  assert.deepEqual(calls, ['cached', 'slow'])
})
