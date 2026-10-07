import assert from 'node:assert/strict'
import test from 'node:test'
import { getMediaGeometry, DEFAULT_COVER_RATIOS } from './mediaGeometry'
import type { MediaKind } from './MediaObject'

const panel = { width: 220, height: 330 }
const kinds: MediaKind[] = ['book', 'music', 'game', 'video']
const value = (result: ReturnType<typeof getMediaGeometry>, key: string) =>
  (result.style as Record<string, string | number>)[key]
const number = (result: ReturnType<typeof getMediaGeometry>, key: string) => parseFloat(String(value(result, key)))
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < .00001, `${actual} ≠ ${expected}`)

test('책 몸체는 세로형·정사각형·가로형 표지 비율을 보존한다', () => {
  for (const ratio of [2 / 3, 500 / 531, 1, 1.6]) {
    const result = getMediaGeometry('book', ratio, panel, false)
    near(number(result, '--mo-cover-ratio'), ratio)
    assert.equal(result.cropped, false)
    const rendered = number(result, '--object-size')
    const baseScale = number(result, '--mo-base-scale')
    const rest = rendered * baseScale
    const focused = rendered * (baseScale + number(result, '--mo-hover-grow'))
    assert.ok(rest <= panel.width * .9 + .00001 && rest / ratio <= panel.height * .885 + .00001)
    assert.ok(focused <= panel.width * .94 + .00001 && focused / ratio <= panel.height * .94 + .00001)
  }
})

test('책은 최종 크기로 그려 축소하고 정면에서는 확대 없이 1배로 표시한다', () => {
  for (const ratio of [237 / 400, 2 / 3, 1, 1.6]) {
    const result = getMediaGeometry('book', ratio, panel, false)
    const baseScale = number(result, '--mo-base-scale')
    assert.ok(baseScale > 0 && baseScale < 1)
    near(baseScale + number(result, '--mo-hover-grow'), 1)
    near(number(result, '--object-size'), Math.min(.94 * panel.width, .94 * panel.height * ratio))
  }
})

test('잘못된 비율은 매체 기본값, 극단적인 비율은 제한된 형태와 크롭을 사용한다', () => {
  for (const kind of kinds) {
    for (const invalid of [undefined, 0, -1, NaN, Infinity]) {
      const result = getMediaGeometry(kind, invalid, panel, false)
      near(number(result, '--mo-cover-ratio'), DEFAULT_COVER_RATIOS[kind])
      assert.ok(Number.isFinite(number(result, '--object-size')))
    }
    for (const ratio of [.1, 10]) {
      const result = getMediaGeometry(kind, ratio, panel, false)
      assert.equal(result.cropped, true)
      assert.equal(value(result, '--mo-image-fit'), 'cover')
      assert.ok(number(result, '--mo-cover-ratio') >= .45 && number(result, '--mo-cover-ratio') <= 2)
    }
  }
})

test('모바일은 예시 책처럼 충분히 큰 원본은 보존하고 긴 배너는 잘라 채운다', () => {
  for (const kind of kinds) {
    const original = getMediaGeometry(kind, 500 / 531, panel, true)
    assert.equal(original.cropped, false)
    assert.equal(value(original, '--mo-image-fit'), 'contain')
    assert.ok(number(original, '--mo-compact-width') <= 100)
    assert.ok(number(original, '--mo-compact-height') <= 100)
    for (const ratio of [.1, 16 / 9, 10]) {
      const cropped = getMediaGeometry(kind, ratio, panel, true)
      assert.equal(cropped.cropped, true)
      assert.equal(value(cropped, '--mo-image-fit'), 'cover')
      assert.equal(value(cropped, '--mo-compact-width'), '100%')
      assert.equal(value(cropped, '--mo-compact-height'), '100%')
    }
  }
})

test('게임·필름 확대는 표지의 실제 영역을 카드 안에 최대한 채운다', () => {
  for (const size of [panel, { width: 300, height: 400 }, { width: 160, height: 240 }]) {
    for (const ratio of [.5, 2 / 3, .94, 1, 1.6, 2]) {
      for (const kind of ['game', 'video'] as const) {
        const result = getMediaGeometry(kind, ratio, size, false)
        assert.equal(result.cropped, false)
        const focused = number(result, '--object-size') * (1 + number(result, '--mo-hover-grow'))
        const caseRatio = number(result, '--mo-case-ratio')
        const imageWidth = kind === 'game' ? Math.min(.9, .77 / caseRatio * ratio) : .83
        const focusedWidth = focused * imageWidth
        const focusedHeight = focusedWidth / ratio
        assert.ok(focusedWidth <= size.width * .98 + .00001)
        assert.ok(focusedHeight <= size.height * .98 + .00001)
        near(Math.max(focusedWidth / size.width, focusedHeight / size.height), .98)
      }
    }
  }
})

test('LP 재킷은 정사각형을 유지하며 가까운 비율만 전체 표시한다', () => {
  assert.equal(value(getMediaGeometry('music', .95, panel, false), '--mo-image-fit'), 'contain')
  assert.equal(value(getMediaGeometry('music', 1.8, panel, false), '--mo-image-fit'), 'cover')
})
