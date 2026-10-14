import assert from 'node:assert/strict'
import test from 'node:test'
import { createClassicsRequests, type ClassicsQuery } from './classicsRequests'
import type { LibraryResult } from '@/actions/library/types'

const initial: ClassicsQuery = { basis: 'all', era: 'ancient', profession: 'entrepreneur', category: 'ALL', page: 1 }
const result = (total: number): LibraryResult => ({ contents: [], total, totalPages: total, currentPage: 1 })
const tick = () => new Promise(resolve => setImmediate(resolve))

test('rapid clicks show loading immediately, skip queued choices, and keep the latest result', async () => {
  const calls: string[] = []
  const replies: Array<(data: LibraryResult) => void> = []
  const requests = createClassicsRequests(initial, result(1), query => {
    calls.push(query.profession)
    return new Promise(resolve => replies.push(resolve))
  })
  requests.load({ basis: 'profession', profession: 'actor' })
  assert.equal(requests.getSnapshot().pending, true)
  requests.load({ profession: 'scientist' })
  requests.load({ profession: 'author' })
  assert.deepEqual(calls, ['actor'])
  replies[0](result(2))
  await tick()
  assert.deepEqual(calls, ['actor', 'author'])
  assert.equal(requests.getSnapshot().data.total, 1, 'stale response must not change visible cards')
  replies[1](result(3))
  await tick()
  assert.equal(requests.getSnapshot().data.total, 3)
  assert.equal(requests.getSnapshot().pending, false)
})

test('returning to cached filters is immediate even while another request is running', async () => {
  let reply!: (data: LibraryResult) => void
  let calls = 0
  const requests = createClassicsRequests(initial, result(1), () => { calls++; return new Promise(resolve => { reply = resolve }) })
  requests.load({ basis: 'profession' })
  requests.load({ basis: 'all' })
  assert.equal(requests.getSnapshot().pending, false)
  reply(result(2))
  await tick()
  assert.equal(requests.getSnapshot().data.total, 1)
  requests.load({ basis: 'profession' })
  assert.equal(requests.getSnapshot().data.total, 2)
  assert.equal(calls, 1)
})

test('failures can be retried and pagination resets on filter change', async () => {
  let fail = true
  const calls: ClassicsQuery[] = []
  const requests = createClassicsRequests(initial, result(1), async query => { calls.push(query); if (fail) throw new Error('timeout'); return result(2) })
  requests.load({ basis: 'profession', page: 3 })
  await tick()
  assert.equal(requests.getSnapshot().failed, true)
  fail = false
  requests.load({ page: 3 }, true)
  await tick()
  assert.equal(requests.getSnapshot().failed, false)
  requests.load({ category: 'BOOK' })
  await tick()
  assert.equal(calls.at(-1)?.page, 1)
})

test('clicking the selected filter keeps the current page and makes no request', async () => {
  let calls = 0
  const query = { ...initial, page: 3 }
  const requests = createClassicsRequests(query, { ...result(10), currentPage: 3 }, async () => { calls++; return result(10) })
  requests.load({ category: 'ALL' })
  await tick()
  assert.equal(requests.getSnapshot().query.page, 3)
  assert.equal(calls, 0)
})

test('a failed old request cannot show an error over a newer selection', async () => {
  let reject!: (error: Error) => void
  const calls: string[] = []
  const requests = createClassicsRequests(initial, result(1), query => {
    calls.push(query.profession)
    return calls.length === 1 ? new Promise((_resolve, fail) => { reject = fail }) : Promise.resolve(result(2))
  })
  requests.load({ basis: 'profession', profession: 'actor' })
  requests.load({ profession: 'scientist' })
  reject(new Error('timeout'))
  await tick()
  assert.equal(requests.getSnapshot().failed, false)
  assert.equal(requests.getSnapshot().data.total, 2)
})

test('leaving the screen stops queued requests; reconnecting can finish the last selection', async () => {
  let reply!: (data: LibraryResult) => void
  const calls: string[] = []
  const requests = createClassicsRequests(initial, result(1), query => {
    calls.push(query.profession)
    return calls.length === 1 ? new Promise(resolve => { reply = resolve }) : Promise.resolve(result(3))
  })
  requests.load({ basis: 'profession', profession: 'actor' })
  requests.load({ profession: 'scientist' })
  requests.deactivate()
  reply(result(2))
  await tick()
  assert.deepEqual(calls, ['actor'])
  requests.activate()
  await tick()
  assert.deepEqual(calls, ['actor', 'scientist'])
  assert.equal(requests.getSnapshot().data.total, 3)
})

test('recently reused results survive cache eviction while old pages are fetched again', async () => {
  const calls: number[] = []
  const requests = createClassicsRequests(initial, result(1), async query => { calls.push(query.page); return result(query.page) })
  for (let page = 2; page <= 24; page++) { requests.load({ page }); await tick() }
  requests.load({ page: 1 })
  requests.load({ page: 25 })
  await tick()
  const count = calls.length
  requests.load({ page: 1 })
  assert.equal(calls.length, count)
  requests.load({ page: 2 })
  await tick()
  assert.equal(calls.at(-1), 2)
})
