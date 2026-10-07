import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

let motion: typeof import('framer-motion')
let media: typeof import('./mediaMotion')
const keys = ['requestAnimationFrame', 'cancelAnimationFrame', 'HTMLElement'] as const
const originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key))

before(async () => {
  // DOM 없이 숫자 MotionValue의 실제 애니메이션과 완료 이벤트를 검사한다.
  Object.defineProperty(globalThis, 'HTMLElement', { value: class {}, configurable: true })
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 8), configurable: true,
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { value: clearTimeout, configurable: true })
  motion = await import('framer-motion')
  media = await import('./mediaMotion')
})

after(() => keys.forEach((key, index) => {
  if (originals[index]) Object.defineProperty(globalThis, key, originals[index]!)
  else Reflect.deleteProperty(globalThis, key)
}))

test('호버·복귀는 짧은 전환 끝에 정확한 정면·기본값과 완료 이벤트를 만든다', async () => {
  const progress = motion.motionValue(0)
  const completed: number[] = []
  const unsubscribe = progress.on('animationComplete', () => completed.push(progress.get()))
  try {
    for (const active of [true, false]) {
      const started = performance.now()
      const animation = media.animateMediaHover(progress, active)
      try {
        await animation.finished
        assert.ok(animation.duration <= .2)
        assert.ok(performance.now() - started < 500, '정면 도착이 긴 감쇠 시간을 기다리면 안 된다')
        assert.equal(progress.get(), active ? 1 : 0)
      } finally { animation.stop() }
    }
    assert.deepEqual(completed, [1, 0])
  } finally { unsubscribe(); progress.destroy() }
})

test('도착 전에 호버를 벗어나면 취소된 전환이 뒤늦게 정면을 고정하지 않는다', async () => {
  const progress = motion.motionValue(0)
  const completed: number[] = []
  const unsubscribe = progress.on('animationComplete', () => completed.push(progress.get()))
  const enter = media.animateMediaHover(progress, true)
  try {
    await new Promise(resolve => setTimeout(resolve, 40))
    enter.stop()
    const leave = media.animateMediaHover(progress, false)
    try { await leave.finished } finally { leave.stop() }
    assert.equal(progress.get(), 0)
    assert.deepEqual(completed, [0])
  } finally { enter.stop(); unsubscribe(); progress.destroy() }
})
