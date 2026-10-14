import assert from 'node:assert/strict'
import test from 'node:test'
import { addMissingAmazonLink, connectAmazonBookOnRegistration, fillMissingAmazonBookConnection } from './amazon-book-registration'
import type { DatabaseClient } from '../../db/src/index'

const product = { platform: 'amazon' as const, productId: '1605206431', productUrl: 'https://www.amazon.com/dp/1605206431', affiliateUrl: 'https://www.amazon.com/dp/1605206431', qualityEvidence: ['ISBN checked'] }
const target = { contentId: 'book', locale: 'en', isbn: '9781605206431', title: 'Analects', creator: 'Confucius' }

test('existing sellers survive, existing Amazon connections and malformed JSON are preserved', () => {
  const seller = { platform: 'google_books', url: 'https://books.google.com/example' }
  assert.deepEqual(addMissingAmazonLink([seller], product), [seller, { platform: 'amazon', url: product.productUrl }])
  assert.equal(addMissingAmazonLink([{ platform: 'amazon', url: 'https://www.amazon.com/dp/other' }], product), null)
  assert.equal(addMissingAmazonLink({ legacy: 'unknown' }, product), null)
})

function fakeDb(responses: unknown[]) {
  let reads = 0, writes = 0
  const client = { from() {
    const query = { select() { return query }, eq() { return query }, is() { return query }, filter() { return query },
      update() { writes++; return query }, maybeSingle: async () => ({ data: responses[reads++], error: null }), single: async () => ({ data: responses[reads++], error: null }) }
    return query
  } } as unknown as DatabaseClient
  return { client, writes: () => writes }
}
test('Postgres JSONB object key order does not cause a false readback failure', async () => {
  const client = fakeDb([{ ...target, content_id: target.contentId, affiliate_url: null }, { affiliate_url: [{ url: product.productUrl, platform: 'amazon' }] }, { affiliate_url: [{ url: product.productUrl, platform: 'amazon' }] }])
  assert.equal(await fillMissingAmazonBookConnection(client.client, target, product), true)
})
test('an ISBN changed by another session is never overwritten', async () => {
  const client = fakeDb([{ ...target, isbn: '9780141439518', affiliate_url: null }])
  assert.equal(await fillMissingAmazonBookConnection(client.client, target, product), false)
  assert.equal(client.writes(), 0)
})
test('a concurrent purchase-link write causes the conditional update to skip', async () => {
  const client = fakeDb([{ ...target, affiliate_url: null }, null])
  assert.equal(await fillMissingAmazonBookConnection(client.client, target, product), false)
})
test('unconfirmed product lookup does not mutate registration', async () => {
  const client = fakeDb([{ affiliate_url: null }])
  await connectAmazonBookOnRegistration(client.client, target, async () => ({ status: 'unconfirmed', reason: 'amazon_challenge' }))
  assert.equal(client.writes(), 0)
})
test('an existing Amazon connection avoids a redundant external lookup', async () => {
  const client = fakeDb([{ affiliate_url: [{ platform: 'amazon', url: product.productUrl }] }])
  let lookups = 0
  await connectAmazonBookOnRegistration(client.client, target, async () => { lookups++; return { status: 'unconfirmed', reason: 'unused' } })
  assert.equal(lookups, 0)
  assert.equal(client.writes(), 0)
})

test('a concurrent edition product insert never replaces the other session product', async () => {
  let inserts = 0
  const db = { from(table: string) {
    const query = { select() { return query }, eq() { return query },
      maybeSingle: async () => ({ data: { ...target, content_id: target.contentId }, error: null }),
      then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(resolve) },
      insert(value: { edition_id: number }) {
        assert.equal(table, 'figure_book_products')
        assert.equal(value.edition_id, 42)
        inserts++
        return Promise.resolve({ error: { code: '23505', message: 'concurrent active product' } })
      },
    }
    return query
  } } as unknown as DatabaseClient
  assert.equal(await fillMissingAmazonBookConnection(db, { ...target, editionId: 42 }, product), false)
  assert.equal(inserts, 1)
})
