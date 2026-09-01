import assert from 'node:assert/strict'
import test from 'node:test'
import { activeFactionMediaLayers, narrativeMediaLayerStarts } from '../src/compositions/Faction/timing'

/**
 * 장면 카드 배경 레이어 — 첫 컷 화면이 장면 시작과 함께 뜨면 대표 화면(scene.image)을 거치지 않는다.
 * 예전엔 컷 전환(크로스페이드) 구간에 대표 화면 위로 첫 컷 화면이 0.5초 더 페이드돼 전환이 두 번 겹쳤다.
 */

const FADE = 30
const CUE = 1000

test('첫 컷 화면이 장면 시작과 같은 프레임이면 시작부터 그 화면만 보인다', () => {
  const starts = narrativeMediaLayerStarts([{ at: CUE }, { at: CUE + 300 }], CUE)
  assert.equal(starts[0], Number.NEGATIVE_INFINITY)
  assert.equal(starts[1], CUE + 300)

  // 컷 전환 구간(장면 시작 전)에도 대표 화면 없이 첫 컷 화면이 깔린다.
  const before = activeFactionMediaLayers(starts, CUE - FADE * 3, FADE)
  assert.equal(before.showBase, false)
  assert.deepEqual(before.indexes, [0])

  // 뒤 컷 화면은 제 시각 0.5초 전부터 페이드로 겹친다 — 그 규칙은 그대로다.
  const overlapping = activeFactionMediaLayers(starts, CUE + 300 - FADE + 1, FADE)
  assert.deepEqual(overlapping.indexes, [0, 1])
})

test('첫 컷 화면이 장면 시작보다 늦으면 대표 화면이 먼저 보이고 페이드로 갈아탄다', () => {
  const starts = narrativeMediaLayerStarts([{ at: CUE + 60 }], CUE)
  assert.deepEqual(starts, [CUE + 60])

  const early = activeFactionMediaLayers(starts, CUE, FADE)
  assert.equal(early.showBase, true)
  assert.deepEqual(early.indexes, [])

  const fading = activeFactionMediaLayers(starts, CUE + 60 - FADE + 1, FADE)
  assert.equal(fading.showBase, true)
  assert.deepEqual(fading.indexes, [0])
})

test('컷 화면이 하나도 없으면 대표 화면만 쓴다', () => {
  assert.deepEqual(narrativeMediaLayerStarts([], CUE), [])
  assert.deepEqual(activeFactionMediaLayers([], CUE + 10, FADE), { showBase: true, indexes: [] })
})
