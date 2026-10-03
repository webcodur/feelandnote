import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coalesceCacheQuery } from './cacheQuery'

test('concurrent misses share a read, while later calls read again', async () => {
  let calls = 0
  let release: (() => void) | undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  const read = async () => { calls++; await gate; return ['public-data'] }
  const first = coalesceCacheQuery('same', read)
  const second = coalesceCacheQuery('same', read)
  assert.equal(first, second)
  release!()
  assert.deepEqual(await first, ['public-data'])
  assert.equal(calls, 1)
  await coalesceCacheQuery('same', read)
  assert.equal(calls, 2)
})

test('failed work is removed so another request can recover', async () => {
  await assert.rejects(coalesceCacheQuery('failed', async () => { throw new Error('DB unavailable') }))
  assert.equal(await coalesceCacheQuery('failed', async () => 'recovered'), 'recovered')
})

test('different locales and arguments do not share work', async () => {
  assert.deepEqual(await Promise.all([
    coalesceCacheQuery('person/ko', async () => 'ko'),
    coalesceCacheQuery('person/en', async () => 'en'),
  ]), ['ko', 'en'])
})
