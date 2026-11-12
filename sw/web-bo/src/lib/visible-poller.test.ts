import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { createVisiblePoller } from './visible-poller'

function pageFixture(t: TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const page = Object.assign(new EventTarget(), { hidden: false })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: page })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'document', original)
    else Reflect.deleteProperty(globalThis, 'document')
  })
  return (hidden: boolean) => {
    page.hidden = hidden
    page.dispatchEvent(new Event('visibilitychange'))
  }
}

async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

test('느린 요청은 겹치지 않고 화면을 떠나면 요청·타이머를 해제한다', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const setHidden = pageFixture(t)
  const calls: AbortSignal[] = []
  let finish: (again: boolean) => void = () => undefined
  const poller = createVisiblePoller(signal => {
    calls.push(signal)
    return new Promise(resolve => { finish = resolve })
  }, 1000)
  t.after(poller.dispose)
  assert.equal(calls.length, 1)
  t.mock.timers.tick(10000)
  assert.equal(calls.length, 1)
  finish(true)
  await settle()
  t.mock.timers.tick(1000)
  assert.equal(calls.length, 2)
  poller.dispose()
  assert.equal(calls[1].aborted, true)
  finish(true)
  await settle()
  t.mock.timers.tick(10000)
  setHidden(true)
  setHidden(false)
  assert.equal(calls.length, 2)
})

test('숨긴 탭은 조회하지 않고 복귀·수동 갱신 때 다시 읽으며 완료 후에는 멈춘다', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const setHidden = pageFixture(t)
  setHidden(true)
  let calls = 0
  let again = true
  const poller = createVisiblePoller(async () => { calls++; return again }, 1000)
  t.after(poller.dispose)
  assert.equal(calls, 0)
  setHidden(false)
  await settle()
  assert.equal(calls, 1)
  setHidden(true)
  t.mock.timers.tick(10000)
  assert.equal(calls, 1)
  again = false
  setHidden(false)
  await settle()
  t.mock.timers.tick(10000)
  assert.equal(calls, 2)
  poller.refresh()
  await settle()
  assert.equal(calls, 3)
})
