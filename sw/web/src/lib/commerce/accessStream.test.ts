import assert from 'node:assert/strict'
import test from 'node:test'
import { applyAccessEvent, readAccessStream } from './accessStream'
import { purchaseAffiliation } from '../books/bookPurchaseRedirect'
import type { AccessStreamEvent } from './contentAccess'

test('split UTF-8 and NDJSON frames preserve Korean progress and individual results', async () => {
  const events: AccessStreamEvent[] = [
    { kind: 'progress', source: 'nintendo', phase: 'edition', detail: '한국어 완전판' },
    { kind: 'result', source: 'steam', data: { links: [] } },
    { kind: 'error', source: 'xbox' },
  ]
  const bytes = new TextEncoder().encode(events.map(event => JSON.stringify(event)).join('\n'))
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]))
    controller.close()
  } })
  const received: AccessStreamEvent[] = []
  await readAccessStream(body, event => received.push(event))
  assert.deepEqual(received, events)
})

test('a completed store is delivered before the stream closes and survives later failure', async () => {
  let output!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({ start(controller) { output = controller } })
  const received: AccessStreamEvent[] = []
  const reading = readAccessStream(body, event => received.push(event))
  const event: AccessStreamEvent = { kind: 'result', source: 'steam', data: { links: [{ service: 'steam', url: 'https://store.steampowered.com/app/1145360/', title: '', platforms: ['PC'] }] } }
  output.enqueue(new TextEncoder().encode(JSON.stringify(event) + '\n'))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(received.length, 1)
  const ready = applyAccessEvent({ status: 'loading', phase: 'store' }, received[0])
  assert.equal(applyAccessEvent(ready, { kind: 'error', source: 'steam' }), ready)
  assert.equal(applyAccessEvent(ready, { kind: 'progress', source: 'steam', phase: 'reference' }), ready)
  output.close()
  await reading
})

test('a broken later frame does not discard results already delivered', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"kind":"result","source":"steam","data":{"links":[]}}\n{"kind":'))
    controller.close()
  } })
  const received: AccessStreamEvent[] = []
  await assert.rejects(readAccessStream(body, event => received.push(event)))
  assert.equal(received[0].kind, 'result')
})

test('unresolved redirects and short links are not claimed to be non-affiliate', () => {
  assert.equal(purchaseAffiliation({ platform: 'yes24', url: '/api/books/purchase/abc?seller=yes24' }), 'unknown')
  assert.equal(purchaseAffiliation({ platform: 'amazon', url: 'https://amzn.to/example' }), 'unknown')
  assert.equal(purchaseAffiliation({ platform: 'amazon', url: 'https://www.amazon.com/dp/example?tag=another-20' }), 'unknown')
})
