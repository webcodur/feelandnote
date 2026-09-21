import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { resizeSectionSurface } from './resizeSectionSurface'

function surface(t: TestContext, bottom: number) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let height = 256
  const scrolls: ScrollToOptions[] = []
  const win = {
    scrollY: 5400,
    scrollTo(options: ScrollToOptions) { scrolls.push(options); this.scrollY = options.top! },
  }
  const box = {
    get offsetHeight() { return height },
    getBoundingClientRect: () => ({ bottom }),
    style: {
      get height() { return `${height}px` },
      set height(value: string) { height = Number.parseFloat(value) },
    },
  } as unknown as HTMLElement
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win })
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  })
  return { box, win, scrolls }
}

test('offscreen loading commits height and equal scroll compensation in one call', (t) => {
  const { box, win, scrolls } = surface(t, -100)
  resizeSectionSurface(box, 1892, 64)
  assert.equal(box.style.height, '1892px')
  assert.equal(win.scrollY, 7036)
  assert.deepEqual(scrolls, [{ top: 7036, behavior: 'instant' }])
  resizeSectionSurface(box, 1892, 64)
  assert.equal(scrolls.length, 1, 'unchanged heights must not keep moving the viewport')
})

test('offscreen shrink subtracts only the height change, keeping user scroll distance', (t) => {
  const { box, win } = surface(t, 20)
  win.scrollY += 360
  resizeSectionSurface(box, 200, 64)
  assert.equal(win.scrollY, 5704)
})

test('browser scroll clamping during shrink does not get subtracted a second time', (t) => {
  const { box, win } = surface(t, -100)
  Object.defineProperty(box.style, 'height', { set() { win.scrollY = 5200 } })
  resizeSectionSurface(box, 100, 64)
  assert.equal(win.scrollY, 5244)
})

for (const bottom of [65, 400, 2000]) {
  test(`visible or upcoming content (bottom ${bottom}) grows without moving the reader`, (t) => {
    const { box, win, scrolls } = surface(t, bottom)
    resizeSectionSurface(box, 1892, 64)
    assert.equal(box.style.height, '1892px')
    assert.equal(win.scrollY, 5400)
    assert.equal(scrolls.length, 0)
  })
}
