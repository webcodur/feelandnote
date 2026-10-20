import assert from 'node:assert/strict'
import test from 'node:test'
import { computeCropFromLandmarks, computeCropFromSilhouette, computePreparationCrop } from './avatar-geometry'
import { computeReframeCrop, reframeAnchorsOf, silhouetteFromRgba } from './avatar-reframe'

test('nobg 전 크롭은 기존 얼굴 크롭보다 정수리와 목 여백을 더 남긴다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const before = computeCropFromLandmarks(anchors, 1000, 1000)
  const prepared = computePreparationCrop(anchors, 1000, 1000)
  assert.ok(prepared.size > before.size)
  assert.ok(prepared.top < before.top)
  assert.ok(prepared.top + prepared.size > before.top + before.size)
  assert.ok(prepared.left >= 0 && prepared.top >= 0)
  assert.ok(prepared.left + prepared.size <= 1000)
  assert.ok(prepared.top + prepared.size <= 1000)
})

test('nobg 전 크롭은 위쪽 원본이 없어도 얼굴 기준 좌표를 아래로 밀지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 100, chinY: 300 }
  const topCrop = computePreparationCrop(anchors, 1000, 1000)
  const translated = computePreparationCrop({ ...anchors, eyeY: 400, chinY: 600 }, 1000, 1000)
  assert.ok(topCrop.top < 0)
  assert.equal(topCrop.size, translated.size)
  assert.equal(topCrop.top + 300, translated.top)
  assert.ok(topCrop.warnings.some((warning) => warning.includes('투명 여백')))
  assert.ok(!topCrop.warnings.some((warning) => warning.includes('세로 위치가')))
})

test('위쪽 투명 여백을 쓸 수 있으면 원본 높이 때문에 크롭을 축소하지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 100, chinY: 300 }
  const crop = computePreparationCrop(anchors, 1000, 600)
  const taller = computePreparationCrop(anchors, 1000, 1000)
  assert.equal(crop.size, taller.size)
  assert.equal(crop.top, taller.top)
  assert.ok(crop.top + crop.size <= 600)
  // 다른 CLI의 1차 크롭은 원본 안으로 제한하는 기존 동작을 유지한다.
  assert.equal(computeCropFromLandmarks(anchors, 1000, 600).top, 0)
})

test('RGBA 실루엣은 투명·일반 사진을 구분하고 흩어진 한 픽셀을 정수리로 삼지 않는다', () => {
  const width = 200, height = 200
  const data = new Uint8ClampedArray(width * height * 4)
  data[(3 * width + 100) * 4 + 3] = 255
  for (let y = 20; y < height; y++) {
    for (let x = 50; x < 150; x++) data[(y * width + x) * 4 + 3] = 255
  }
  const silhouette = silhouetteFromRgba(data, width, height)!
  assert.equal(silhouette.headTop, 20)
  assert.equal(silhouette.touchesTop, false)
  assert.equal(silhouette.rowLeft![20], 50)
  assert.equal(silhouette.rowRight![20], 149)
  assert.equal(silhouetteFromRgba(new Uint8Array(data.length).fill(255), width, height), null)
  assert.equal(silhouetteFromRgba(new Uint8Array(data.length), width, height), null)
})

test('3/4 얼굴은 눈 중점 대신 기존 reframe의 부각 중심을 쓰고 같은 좌표를 얻는다', () => {
  const anchors = reframeAnchorsOf({
    getLeftEye: () => [{ x: 350, y: 400 }],
    getRightEye: () => [{ x: 500, y: 400 }],
    getNose: () => Array.from({ length: 4 }, () => ({ x: 580, y: 450 })),
    getJawOutline: () => [{ x: 200, y: 400 }, { x: 500, y: 600 }, { x: 700, y: 400 }],
  })!
  assert.equal(anchors.centerX, 350)
  assert.notEqual(anchors.centerX, anchors.eyeX)
  const silhouette = { headTop: 140, touchesTop: false, rowLeft: new Array(1000).fill(100), rowRight: new Array(1000).fill(800) }
  assert.deepEqual(computeReframeCrop(anchors, silhouette, 1000, 1000), computeCropFromSilhouette(anchors, silhouette, 1000, 1000))
})

test('잘린 어깨가 닿는 좁은 원본에는 투명 띠를 붙여 성공 처리하지 않는다', () => {
  const anchors = { eyeX: 80, eyeY: 200, chinY: 400 }
  const silhouette = { headTop: 0, touchesTop: true, rowLeft: new Array(600).fill(0), rowRight: new Array(600).fill(159) }
  assert.throws(() => computeReframeCrop(anchors, silhouette, 160, 600), /원본 가로폭 부족/)
})
