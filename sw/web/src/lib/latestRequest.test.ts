import assert from 'node:assert/strict'
import test from 'node:test'
import { createLatestRequestRunner } from './latestRequest'

test('rapid filter changes only execute the first and latest request', async () => {
  const started: number[] = []
  const finish: Array<(value: number) => void> = []
  const run = createLatestRequestRunner((value: number) => {
    started.push(value)
    return new Promise<number>(resolve => finish.push(resolve))
  })
  const first = run(1)
  const dropped = run(2)
  const last = run(3)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(started, [1])
  assert.equal(await dropped, undefined)
  finish.shift()!(1)
  assert.equal(await first, 1)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(started, [1, 3])
  finish.shift()!(3)
  assert.equal(await last, 3)
})

test('a failed request does not block the final pending filter', async () => {
  const run = createLatestRequestRunner(async (value: number) => {
    if (value === 1) throw Error('failed')
    return value
  })
  const first = run(1)
  const last = run(2)
  await assert.rejects(first, /failed/)
  assert.equal(await last, 2)
})

test('leaving a page drops the pending filter without dispatching another action', async () => {
  let finish!: (value: number) => void
  const calls: number[] = []
  const run = createLatestRequestRunner((value: number) => {
    calls.push(value)
    return new Promise<number>(resolve => { finish = resolve })
  })
  const first = run(1)
  const pending = run(2)
  run.clearPending()
  assert.equal(await pending, undefined)
  await new Promise(resolve => setTimeout(resolve, 0))
  finish(1)
  await first
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(calls, [1])
})
