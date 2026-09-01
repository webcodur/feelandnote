import assert from 'node:assert/strict'
import test from 'node:test'
import { GAIN_DB_MAX, GAIN_DB_MIN, dbToLinear, normalizeGainDb } from './gain'

test('기본 음량은 값을 남기지 않는다', () => {
  assert.equal(normalizeGainDb(0), undefined)
  assert.equal(normalizeGainDb(undefined), undefined)
  assert.equal(normalizeGainDb(null), undefined)
  assert.equal(normalizeGainDb(Number.NaN), undefined)
})

test('슬라이더 범위를 벗어난 값은 잘라 넣는다', () => {
  assert.equal(normalizeGainDb(-99), GAIN_DB_MIN)
  assert.equal(normalizeGainDb(99), GAIN_DB_MAX)
})

test('0.5dB 단위로 반올림한다', () => {
  assert.equal(normalizeGainDb(3.2), 3)
  assert.equal(normalizeGainDb(3.3), 3.5)
  assert.equal(normalizeGainDb(-4.4), -4.5)
})

test('증량과 감쇠가 dB 규약대로 곱해진다', () => {
  assert.equal(dbToLinear(0), 1)
  assert.ok(Math.abs(dbToLinear(6) - 2) < 0.01)
  assert.ok(Math.abs(dbToLinear(-6) - 0.5) < 0.01)
})
