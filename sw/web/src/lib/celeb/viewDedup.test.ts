import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { recordPageView } from './viewDedup'

function installStorage(t: TestContext, storage: Partial<Storage>) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })
}

test('only acknowledged visits start the 30-minute window, separated by target and kind', async t => {
  const values = new Map<string, string>()
  installStorage(t, {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  })
  let now = 1_000_000
  t.mock.method(Date, 'now', () => now)
  const calls: boolean[] = []
  const record = async (_id: string, count: boolean) => { calls.push(count); return 7 }
  assert.equal(await recordPageView('faction', 'first', record), 7)
  const recordedAt = values.get('faction-view:first')
  now += 10 * 60 * 1000
  await recordPageView('faction', 'first', record)
  assert.equal(values.get('faction-view:first'), recordedAt, 'Repeated reads must not extend the suppression window')
  now += 20 * 60 * 1000
  await recordPageView('faction', 'first', record)
  assert.deepEqual(calls, [true, false, true], 'A new visit at the 30-minute boundary is counted')
  await recordPageView('faction', 'second', record)
  await recordPageView('celeb', 'first', record)
  assert.deepEqual(calls.slice(-2), [true, true])
})

test('null responses and rejected requests leave the visit eligible for retry', async t => {
  const values = new Map<string, string>()
  installStorage(t, {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  })
  const calls: boolean[] = []
  await recordPageView('faction', 'retry', async (_id, count) => { calls.push(count); return null })
  await assert.rejects(recordPageView('faction', 'retry', async (_id, count) => { calls.push(count); throw new Error('network failed') }), /network failed/)
  assert.equal(values.size, 0)
  await recordPageView('faction', 'retry', async (_id, count) => { calls.push(count); return 1 })
  assert.deepEqual(calls, [true, true, true])
  assert.equal(values.size, 1)
})

test('unavailable storage reads the count without incrementing', async t => {
  installStorage(t, {
    getItem: () => { throw new Error('storage blocked') },
  })
  assert.equal(await recordPageView('celeb', 'private', async (_id, count) => {
    assert.equal(count, false)
    return 4
  }), 4)
})
