import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { decodeCacheJson, encodeCacheJson } from './cacheJsonCodec'

test('a growing recommendation pool fits the Next data cache without losing books', async () => {
  const pool = Array.from({ length: 5752 }, (_, i) => ({
    book: {
      contentId: randomUUID(), editionId: i,
      title: `The collected stories and adventures — volume ${i}`,
      creator: 'A writer and a translator',
      thumbnail: `https://covers.example.com/${randomUUID()}/large.jpg`,
      url: `https://www.amazon.com/s?k=The+collected+stories+and+adventures+volume+${i}+A+writer+and+a+translator`,
    },
    userCount: i % 29, modernCount: i % 11,
  }))
  assert.ok(Buffer.byteLength(JSON.stringify(pool)) > 2 * 1024 * 1024)
  const stored = await encodeCacheJson(pool)
  assert.ok(Buffer.byteLength(JSON.stringify(stored)) < 2 * 1024 * 1024)
  assert.deepEqual(await decodeCacheJson(stored), pool)
})

test('JSON cache round trips multilingual fields and ordinary small results', async () => {
  for (const value of [null, [], { title: '오디세이아', description: 'Ἀχιλλεύς — Odyssey', count: 0, available: false }]) {
    assert.deepEqual(await decodeCacheJson(await encodeCacheJson(value)), value)
  }
})
