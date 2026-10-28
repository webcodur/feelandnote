import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { computeCropFromLandmarks, computeCropFromSilhouette, computePreparationCrop } from './avatar-geometry'
import { computeReframeCrop, computeSilhouetteOffset, detectWithAvatarPadding, reframeAnchorsOf, silhouetteFromRgba, unpadAvatarLandmarks } from './avatar-reframe'

test('검출 여백 환산은 face-api의 얼굴 상자 이동량을 보존하고 좌표에서 여백만 뺀다', () => {
  const faceapi = createRequire(import.meta.url)('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')
  const original = new faceapi.FaceLandmarks68(
    Array.from({ length: 68 }, () => new faceapi.Point(0.5, 0.5)),
    { width: 400, height: 400 }, new faceapi.Point(300, 400),
  )
  const restored = unpadAvatarLandmarks(original, 200)
  assert.equal(restored.getLeftEye()[0].x, original.getLeftEye()[0].x - 200)
  assert.equal(restored.getLeftEye()[0].y, original.getLeftEye()[0].y - 200)
  assert.equal(unpadAvatarLandmarks(original, 0), original)
})

test('얼굴 미검출이면 검출 영상에만 여백을 붙여 한 번 재시도한다', async () => {
  const pads: number[] = []
  const result = await detectWithAvatarPadding(800, 600, async (pad) => {
    pads.push(pad)
    return pad ? [{ x: 500, y: 400 }] : []
  })
  assert.deepEqual(pads, [0, 200])
  assert.equal(result.padding, 200)
  assert.deepEqual(result.detections, [{ x: 500, y: 400 }])
})

test('얼굴이 검출되면 여백 재시도 없이 그대로 반환하고 여러 얼굴도 숨기지 않는다', async () => {
  for (const count of [1, 2]) {
    let calls = 0
    const result = await detectWithAvatarPadding(800, 800, async (pad) => {
      calls++
      assert.equal(pad, 0)
      return new Array(count).fill({ face: true })
    })
    assert.equal(calls, 1)
    assert.equal(result.padding, 0)
    assert.equal(result.detections.length, count)
  }
})

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

test('준비 수염 앵커 생략은 기존 좌표를 바꾸지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const crop = computePreparationCrop(anchors, 1000, 1000)
  assert.deepEqual({ left: crop.left, top: crop.top, size: crop.size }, { left: 106, top: 29, size: 789 })
  assert.deepEqual(crop, computePreparationCrop(anchors, 1000, 1000, { beardBottom: undefined }))
})

test('준비 크롭은 원본 수염 끝과 목 여유를 포함하며 기존 얼굴 위쪽·가로 중심을 보존한다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const base = computePreparationCrop(anchors, 1000, 1000)
  const crop = computePreparationCrop(anchors, 1000, 1000, { beardBottom: 900 })
  assert.ok(base.top + base.size <= 900)
  assert.equal(crop.top, base.top)
  assert.ok(crop.top + crop.size >= 949)
  assert.equal(crop.left + crop.size / 2, 500)
  assert.ok(crop.top + crop.size <= 1000 && crop.left >= 0 && crop.left + crop.size <= 1000)
})

test('준비 수염 하단은 원본 밖으로 복원하지 않고 부족한 목 여유를 알린다', () => {
  const crop = computePreparationCrop({ eyeX: 500, eyeY: 400, chinY: 600 }, 1000, 1000, { beardBottom: 999 })
  assert.equal(crop.top + crop.size, 1000)
  assert.ok(crop.warnings.some((warning) => warning.includes('수염 아래 목 여유')))
})

test('준비 크롭은 잘못된 수염 행과 얼굴을 자르는 원본 극단을 거절한다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  for (const beardBottom of [-1, NaN, Infinity, 599, 1000, 900.5]) {
    assert.throws(() => computePreparationCrop(anchors, 1000, 1000, { beardBottom }), /beardBottom/)
  }
  assert.throws(() => computePreparationCrop({ eyeX: 300, eyeY: 400, chinY: 600 }, 600, 1200, { beardBottom: 1000 }), /가로폭 부족/)
  assert.throws(() => computePreparationCrop({ eyeX: 100, eyeY: 400, chinY: 600 }, 1000, 1000, { beardBottom: 900 }), /가로 중심/)
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
  assert.equal(silhouette.rowMass![20], 100)
  assert.equal(silhouette.rowCenterX![20], 99.5)
  assert.equal(silhouetteFromRgba(new Uint8Array(data.length).fill(255), width, height), null)
  assert.equal(silhouetteFromRgba(new Uint8Array(data.length), width, height), null)
})

test('머리카락·장식의 면적이 한쪽에 있으면 크롭을 그쪽으로 조금 더 이동한다', () => {
  const anchors = { eyeX: 530, centerX: 500, faceCenterX: 490, eyeY: 400, chinY: 600 }
  const shape = { headTop: 140, touchesTop: false, rowLeft: new Array(1000).fill(100), rowRight: new Array(1000).fill(900) }
  const baseline = computeReframeCrop(anchors, shape, 1000, 1000)
  const shifted = computeReframeCrop(anchors, {
    ...shape, rowMass: new Array(1000).fill(300), rowCenterX: new Array(1000).fill(550),
  }, 1000, 1000)
  assert.ok(shifted.left > baseline.left)
  assert.equal(shifted.top, baseline.top)
  assert.equal(shifted.size, baseline.size)
  assert.ok(shifted.visualShift! > 0 && shifted.visualShift! <= shifted.size * 0.05)
  assert.ok((anchors.faceCenterX - shifted.left) / shifted.size < 0.45, '면적 균형으로 의도한 얼굴 위치 이동은 허용한다')
})

test('면적 보정은 좌우 대칭이며 먼 오브젝트가 있어도 이동 상한을 넘지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const shape = { headTop: 140, touchesTop: false, rowMass: new Array(1000).fill(300) }
  for (const center of [520, 550, 900]) {
    const right = computeSilhouetteOffset(anchors, { ...shape, rowCenterX: new Array(1000).fill(center) }, 500)
    const left = computeSilhouetteOffset(anchors, { ...shape, rowCenterX: new Array(1000).fill(1000 - center) }, 500)
    assert.equal(right, -left)
    assert.ok(Math.abs(right) <= 25)
  }
})

test('어깨·몸통의 면적과 극소한 실루엣 차이는 가로 구도를 바꾸지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const rowMass = new Array(1000).fill(300)
  const rowCenterX = new Array(1000).fill(500)
  for (let y = 600; y < 1000; y++) { rowMass[y] = 900; rowCenterX[y] = 850 }
  assert.equal(computeSilhouetteOffset(anchors, { headTop: 140, touchesTop: false, rowMass, rowCenterX }, 500), 0)
  assert.equal(computeSilhouetteOffset(anchors, {
    headTop: 140, touchesTop: false, rowMass, rowCenterX: new Array(1000).fill(504),
  }, 500), 0)
})

test('머리·장식과 균형이 맞은 완성본은 얼굴만 정중앙으로 되돌리지 않는다', () => {
  const anchors = { eyeX: 395, centerX: 365, faceCenterX: 355, noseX: 450, eyeY: 400, chinY: 720 }
  const crop = computeReframeCrop(anchors, {
    headTop: 32, touchesTop: false,
    rowMass: new Array(800).fill(300), rowCenterX: new Array(800).fill(500),
  }, 800, 800)
  assert.equal(crop.decidedBy, 'already-normalized')
  assert.equal(crop.left, 0)
  assert.equal(crop.size, 800)
  assert.ok(crop.visualShift! > 0)
  assert.ok(anchors.faceCenterX / crop.size < 0.45)
})

test('3/4 얼굴의 가로 기준은 턱선 중점과 양눈 중점 사이에 두며 한쪽 눈으로 튀지 않는다', () => {
  const anchors = reframeAnchorsOf({
    getLeftEye: () => [{ x: 350, y: 400 }],
    getRightEye: () => [{ x: 500, y: 400 }],
    getNose: () => Array.from({ length: 4 }, () => ({ x: 580, y: 450 })),
    getJawOutline: () => [{ x: 200, y: 400 }, { x: 500, y: 600 }, { x: 700, y: 400 }],
  })!
  assert.ok(anchors.centerX >= 425 && anchors.centerX <= 450)
  assert.notEqual(anchors.centerX, anchors.eyeX)
  const silhouette = { headTop: 140, touchesTop: false, rowLeft: new Array(1000).fill(100), rowRight: new Array(1000).fill(800) }
  const crop = computeReframeCrop(anchors, silhouette, 1000, 1000)
  assert.ok(Math.abs((anchors.centerX - crop.left) / crop.size - 0.5) <= 1 / crop.size)
  for (const { x, y } of anchors.facePoints!) {
    assert.ok(Math.hypot((x - crop.left) / crop.size - 0.5, (y - crop.top) / crop.size - 0.5) <= 0.5)
  }
})

// 하지원 등록본에서 검출한 값. 한쪽 눈 보정과 원본 경계 제한이 겹쳐
// 얼굴은 58%에 남는데 경고 없이 성공하던 실제 입력을 재현한다.
const haJiWonLandmarks = {
  getLeftEye: () => [{ x: 403.9736417, y: 391.0250169 }],
  getRightEye: () => [{ x: 586.6237523, y: 379.0122687 }],
  getNose: () => Array.from({ length: 4 }, () => ({ x: 524.671876, y: 489.237466 })),
  getJawOutline: () => [
    { x: 250.844721, y: 422.810063 },
    { x: 527.44764, y: 717.434474 },
    { x: 679.468503, y: 400.908636 },
  ],
}

test('하지원처럼 오른쪽 원본이 부족해 얼굴을 중앙에 못 두면 무경고 성공 대신 실패한다', () => {
  const anchors = reframeAnchorsOf(haJiWonLandmarks)!
  const silhouette = {
    headTop: 32, touchesTop: false,
    rowLeft: new Array(800).fill(200), rowRight: new Array(800).fill(799),
  }
  assert.throws(() => computeReframeCrop(anchors, silhouette, 800, 800), /얼굴 중심축|가로 중심/)
})

test('같은 얼굴도 원본 가로 여유가 있으면 턱선과 양눈을 모두 중앙 근처에 맞춘다', () => {
  const anchors = reframeAnchorsOf(haJiWonLandmarks)!
  const silhouette = {
    headTop: 32, touchesTop: false,
    rowLeft: new Array(800).fill(200), rowRight: new Array(800).fill(798),
  }
  const crop = computeReframeCrop(anchors, silhouette, 800, 800)
  const jawMid = (250.844721 + 679.468503) / 2
  for (const x of [jawMid, anchors.eyeX]) {
    assert.ok(Math.abs((x - crop.left) / crop.size - 0.5) <= 0.05)
  }
})

test('부각량 경계를 넘겨도 가로 중심이 불연속으로 한쪽 눈에 붙지 않는다', () => {
  const withNose = (noseX: number) => reframeAnchorsOf({
    ...haJiWonLandmarks,
    getNose: () => Array.from({ length: 4 }, () => ({ x: noseX, y: 489 })),
  })!
  const baseline = withNose(465)
  for (const noseX of [400, 430, 490, 525, 560]) {
    assert.ok(Math.abs(withNose(noseX).centerX! - baseline.centerX!) < 1)
  }
})

// 대표이미지에서 실제 검출한 양눈·코끝·턱선 양끝·턱끝 좌표.
// 정면, 좌우 3/4, 고개 기울임, 안경, 측면을 같은 계산 경로로 검사한다.
const portraitCases = [
  { name: 'ha-ji-won', left: [346.75, 380.36], right: [458.92, 373.54], nose: [423.31, 437.35], jaw: [[256.51, 404.81], [424.67, 576.45], [510.18, 389.46]], headTop: 166 },
  { name: 'bill-gates', left: [337.86, 378.48], right: [459.51, 374.02], nose: [396.84, 467.22], jaw: [[261.8, 376.36], [408.95, 579.53], [546.34, 365.39]], headTop: 146 },
  { name: 'jennifer-lawrence', left: [343.39, 375.04], right: [456.21, 377.18], nose: [413.66, 451.42], jaw: [[238.11, 360.22], [389.67, 576.86], [502.67, 380.17]], headTop: 123 },
  { name: 'emma-watson', left: [342.02, 366.03], right: [463.73, 395.86], nose: [404.84, 473.25], jaw: [[215.38, 300.88], [341.39, 580.91], [504.12, 399.7]], headTop: 12 },
  { name: 'albert-einstein', left: [348.23, 381.54], right: [449.87, 371.43], nose: [381.7, 448.97], jaw: [[308.75, 394.72], [422.26, 564.14], [555.75, 362.98]], headTop: 120 },
  { name: 'iu', left: [351.43, 379.74], right: [453.17, 374.62], nose: [437.73, 454.35], jaw: [[231.84, 391.11], [403.4, 572.85], [482.07, 386.24]], headTop: 128 },
  { name: 'son-ye-jin', left: [351.44, 378.78], right: [453.15, 376.88], nose: [380.29, 453.22], jaw: [[311.5, 386.93], [421.66, 583.27], [568.21, 367.1]], headTop: 127 },
  { name: 'cleopatra', left: [347.85, 384.28], right: [449.46, 371.77], nose: [367.55, 431.63], jaw: [[321.8, 401.66], [413.21, 563.98], [548.62, 374.71]], headTop: 77 },
  { name: 'napoleon-bonaparte', left: [341.59, 382.37], right: [459.13, 379.27], nose: [379.91, 461.61], jaw: [[294.03, 388.28], [410.72, 598.45], [568.86, 368.34]], headTop: 8 },
  { name: 'marcus-aurelius', left: [363.36, 351.69], right: [417.52, 379.81], nose: [426.85, 429.42], jaw: [[227.34, 327.67], [350.44, 572.16], [440.47, 381.17]], headTop: 43 },
]

for (const sample of portraitCases) {
  test(`${sample.name}: 실측 얼굴의 좌우반전·배율·이동에도 중심과 측면 판정을 유지한다`, () => {
    for (const scale of [0.5, 1, 2]) for (const mirrored of [false, true]) for (const shift of [0, 100]) {
      const point = ([x, y]: number[]) => ({ x: ((mirrored ? 800 - x : x) + shift) * scale, y: y * scale })
      const jaw = sample.jaw.map(point)
      if (mirrored) jaw.reverse()
      const left = point(mirrored ? sample.right : sample.left)
      const right = point(mirrored ? sample.left : sample.right)
      const nose = point(sample.nose)
      const anchors = reframeAnchorsOf({
        getLeftEye: () => [left], getRightEye: () => [right],
        getNose: () => Array.from({ length: 4 }, () => nose), getJawOutline: () => jaw,
      })!
      const silhouette = { headTop: sample.headTop * scale, touchesTop: false }
      const crop = computeReframeCrop(anchors, silhouette, (800 + shift * 2) * scale, 800 * scale)
      const faceCenter = ((jaw[0].x + jaw.at(-1)!.x) / 2 - crop.left) / crop.size
      assert.ok(faceCenter >= 0.45 && faceCenter <= 0.55)
      assert.ok(Math.abs((anchors.centerX! - crop.left) / crop.size - 0.5) <= 1 / crop.size)
      assert.ok(crop.top >= 0 && crop.top + crop.size <= 800 * scale)
    }
  })
}

test('측면 코끝은 크롭 안에 여유를 두고 남기며 얼굴 중심을 맞춘 척 잘라내지 않는다', () => {
  const silhouette = { headTop: 140, touchesTop: false }
  const anchors = { eyeX: 500, centerX: 500, faceCenterX: 500, eyeY: 400, chinY: 600, emphasis: 2.7 }
  const crop = computeReframeCrop({ ...anchors, noseX: 650 }, silhouette, 1000, 1000)
  assert.ok((650 - crop.left) / crop.size < 0.94)
  assert.throws(() => computeReframeCrop({ ...anchors, noseX: 780 }, silhouette, 1000, 1000), /코끝/)
  assert.throws(() => computeReframeCrop({ ...anchors, noseX: 220 }, silhouette, 1000, 1000), /코끝/)
})

test('유효하지 않은 좌표는 기하 판정의 NaN 비교를 통과하지 못한다', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => computeReframeCrop(
      { eyeX: 500, eyeY: 400, chinY: 600, centerX: invalid },
      { headTop: 140, touchesTop: false }, 1000, 1000,
    ), /유효하지 않은/)
  }
})

test('완성본 재검출 오차가 있어도 정상인 정사각을 반복 확대하지 않는다', () => {
  for (const anchors of [
    { eyeX: 400, centerX: 397, faceCenterX: 405, eyeY: 406.4, chinY: 693.6 },
    { eyeX: 400, centerX: 402.4, faceCenterX: 399, eyeY: 365.6, chinY: 680 },
  ]) {
    const crop = computeReframeCrop(anchors, { headTop: 25, touchesTop: false }, 800, 800)
    assert.deepEqual({ left: crop.left, top: crop.top, size: crop.size, decidedBy: crop.decidedBy },
      { left: 0, top: 0, size: 800, decidedBy: 'already-normalized' })
  }
})

test('정사각이어도 얼굴이 작거나 목·정수리 여백이 많으면 정상 구도로 간주하지 않는다', () => {
  for (const [anchors, headTop] of [
    [{ eyeX: 400, eyeY: 350, chinY: 550 }, 100],
    [{ eyeX: 400, eyeY: 300, chinY: 600 }, 30],
    [{ eyeX: 400, eyeY: 350, chinY: 670 }, 90],
  ] as const) {
    const crop = computeReframeCrop(anchors, { headTop, touchesTop: false }, 800, 800)
    assert.notEqual(crop.decidedBy, 'already-normalized')
  }
})

test('정상 구도 유지보다 직접 검수한 수염 하단이 우선한다', () => {
  const crop = computeReframeCrop({ eyeX: 400, eyeY: 400, chinY: 720 },
    { headTop: 30, touchesTop: false }, 800, 800, { beardBottom: 790 })
  assert.notEqual(crop.decidedBy, 'already-normalized')
  assert.equal(crop.top + crop.size, 791)
})

test('잘린 어깨가 닿는 좁은 원본에는 투명 띠를 붙여 성공 처리하지 않는다', () => {
  const anchors = { eyeX: 80, eyeY: 200, chinY: 400 }
  const silhouette = { headTop: 0, touchesTop: true, rowLeft: new Array(600).fill(0), rowRight: new Array(600).fill(159) }
  assert.throws(() => computeReframeCrop(anchors, silhouette, 160, 600), /원본 가로폭 부족/)
})

test('수염 앵커를 생략하면 기존 정수리·눈·목 좌표를 그대로 유지한다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const silhouette = { headTop: 140, touchesTop: false }
  const crop = computeReframeCrop(anchors, silhouette, 1000, 1000)
  assert.deepEqual(
    { left: crop.left, top: crop.top, size: crop.size, decidedBy: crop.decidedBy, warnings: crop.warnings },
    { left: 247, top: 142, size: 506, decidedBy: 'eye-line', warnings: [] },
  )
  assert.deepEqual(crop, computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom: undefined }))
})

test('직접 검수한 긴 수염 마지막 행을 포함하고 얼굴 가로 중심·기존 눈 범위를 보존한다', () => {
  const anchors = { eyeX: 480, centerX: 500, eyeY: 400, chinY: 600 }
  const silhouette = { headTop: 140, touchesTop: false }
  const before = computeReframeCrop(anchors, silhouette, 1000, 1000)
  const crop = computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom: 750 })
  assert.ok(before.top + before.size <= 750)
  assert.equal(crop.top + crop.size, 751)
  assert.equal(crop.left + crop.size / 2, 500)
  assert.ok(crop.eyeLine >= 0.2 && crop.eyeLine <= 0.51)
  assert.ok(crop.top >= 0 && crop.top + crop.size <= 1000)
  assert.deepEqual(crop, computeCropFromSilhouette(anchors, silhouette, 1000, 1000, { beardBottom: 750 }))
})

test('명시한 수염 하단은 반올림 뒤에도 원본 하단을 넘거나 마지막 행을 잃지 않는다', () => {
  const crop = computeReframeCrop(
    { eyeX: 500, eyeY: 600.1, chinY: 800.35 }, { headTop: 150, touchesTop: false },
    1000, 1000, { beardBottom: 999 },
  )
  assert.equal(crop.top + crop.size, 1000)
  assert.ok(Number.isInteger(crop.top) && Number.isInteger(crop.size) && crop.top >= 0)
})

test('잘못된 원본 수염 좌표·투명 행을 명시하면 실패하고 자동 추정으로 대체하지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const silhouette = { headTop: 140, touchesTop: false }
  for (const beardBottom of [-1, NaN, Infinity, 599, 1000, 750.5]) {
    assert.throws(() => computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom }), /beardBottom/)
  }
  assert.throws(() => computeReframeCrop(anchors, {
    ...silhouette, rowLeft: new Array(1000).fill(-1), rowRight: new Array(1000).fill(-1),
  }, 1000, 1000, { beardBottom: 750 }), /불투명 실루엣/)
})

test('긴 수염 하단을 위해 양눈 위 얼굴을 극단적으로 자르거나 잘린 어깨를 패딩하지 않는다', () => {
  assert.throws(() => computeReframeCrop(
    { eyeX: 500, eyeY: 100, chinY: 300 }, { headTop: 0, touchesTop: true },
    1000, 1000, { beardBottom: 950 },
  ), /양눈 위 얼굴/)
  assert.throws(() => computeReframeCrop(
    { eyeX: 80, eyeY: 200, chinY: 400 },
    { headTop: 0, touchesTop: true, rowLeft: new Array(600).fill(0), rowRight: new Array(600).fill(159) },
    160, 600, { beardBottom: 500 },
  ), /원본 가로폭 부족/)
})

test('명시 수염과 눈 상부가 충돌하면 min-span 확대만 제한하고 목표 미달을 알린다', () => {
  const crop = computeReframeCrop(
    { eyeX: 399.0618752539158, centerX: 393.3496356830001, eyeY: 342.5094296038151, chinY: 526.8872148394585 },
    { headTop: 75, touchesTop: false }, 800, 800, { beardBottom: 754 },
  )
  assert.equal(crop.size, 516)
  assert.equal(crop.top + crop.size, 755)
  assert.ok(crop.eyeLine >= 0.2)
  assert.ok(crop.spanRatio < 0.36)
  assert.ok(crop.warnings.some((warning) => warning.includes('최소 목표보다 작다')))
  assert.ok(crop.top >= 0 && crop.top + crop.size <= 800)
})

test('명시 수염의 기존 정상 크롭은 충돌 보완 뒤에도 그대로다', () => {
  const crop = computeReframeCrop(
    { eyeX: 401.55878219256795, centerX: 400.6809297290456, eyeY: 352.30419251322746, chinY: 544.0835280418396 },
    { headTop: 0, touchesTop: true }, 800, 800, { beardBottom: 754 },
  )
  assert.deepEqual({ left: crop.left, top: crop.top, size: crop.size }, { left: 134, top: 222, size: 533 })
  assert.ok(!crop.warnings.some((warning) => warning.includes('최소 목표보다 작다')))
})

test('긴 수염과 직접 검수한 이마 상단은 얼굴 크기 목표보다 먼저 함께 보존한다', () => {
  const anchors = { eyeX: 579, centerX: 578.5, eyeY: 339.6, chinY: 450.2 }
  const silhouette = { headTop: 113, touchesTop: false }
  const before = computeReframeCrop(anchors, silhouette, 1080, 1350, { beardBottom: 590 })
  assert.deepEqual({ top: before.top, size: before.size }, { top: 276, size: 315 })
  const crop = computeReframeCrop(anchors, silhouette, 1080, 1350, { beardBottom: 590, faceTop: 250 })
  assert.ok(crop.top <= 250, '직접 검수한 이마 상단을 프레임 안에 남긴다')
  assert.equal(crop.top + crop.size, 591)
  assert.ok(crop.spanRatio < 0.36)
  assert.ok(crop.eyeLine >= 0.2 && crop.eyeLine <= 0.65)
  assert.ok(crop.warnings.some(warning => warning.includes('이마 상단')))
})

test('이마 상단 옵션 생략은 일반 경로와 기존 긴 수염 경로를 바꾸지 않는다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const silhouette = { headTop: 140, touchesTop: false }
  for (const beardBottom of [undefined, 750]) {
    const before = computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom })
    assert.deepEqual(before, computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom, faceTop: undefined }))
  }
})

test('이마 보호가 필요 없는 기존 수염 크롭은 좌표와 경고가 그대로다', () => {
  const anchors = { eyeX: 500, eyeY: 400, chinY: 600 }
  const silhouette = { headTop: 140, touchesTop: false }
  const before = computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom: 750 })
  assert.ok(before.top < 300)
  assert.deepEqual(before, computeReframeCrop(anchors, silhouette, 1000, 1000, { beardBottom: 750, faceTop: 300 }))
})

test('이마 상단은 검수한 원본 정수 좌표와 긴 수염 입력에서만 허용한다', () => {
  const anchors = { eyeX: 579, eyeY: 339.6, chinY: 450.2 }
  const silhouette = { headTop: 113, touchesTop: false }
  for (const faceTop of [-1, NaN, Infinity, 250.5, 112, 340, 1350]) {
    assert.throws(() => computeReframeCrop(anchors, silhouette, 1080, 1350, { beardBottom: 590, faceTop }), /faceTop/)
  }
  assert.throws(() => computeReframeCrop(anchors, silhouette, 1080, 1350, { faceTop: 250 }), /beardBottom/)
  assert.throws(() => computeReframeCrop(anchors, {
    ...silhouette, rowLeft: Array.from({ length: 1350 }, (_, row) => row === 250 ? -1 : 100),
  }, 1080, 1350, { beardBottom: 590, faceTop: 250 }), /faceTop 기준 행/)
})

test('이마 보호로 얼굴이 지나치게 낮거나 작아지는 경우 기존 눈·턱 극단 범위는 완화하지 않는다', () => {
  const silhouette = { headTop: 0, touchesTop: true }
  assert.throws(() => computeReframeCrop(
    { eyeX: 500, eyeY: 900, chinY: 1000 }, silhouette, 1500, 1500,
    { beardBottom: 1100, faceTop: 0 },
  ), /기존 눈·턱 허용 범위/)
  assert.throws(() => computeReframeCrop(
    { eyeX: 500, eyeY: 300, chinY: 400 }, silhouette, 1500, 1500,
    { beardBottom: 1100, faceTop: 0 },
  ), /기존 눈·턱 허용 범위/)
})

test('CLI는 잘못된 이마 옵션을 모델 로딩·파일 처리 전에 거절한다', () => {
  const script = fileURLToPath(new URL('../../scripts/avatar/reframe.ts', import.meta.url))
  for (const args of [
    ['--face-top=250'],
    ['--beard-bottom=590', '--face-top=-1'],
    ['--beard-bottom=590', '--face-top=250.5'],
    ['--beard-bottom=590', '--face-top=NaN'],
    ['--beard-bottom=590', '--face-top='],
    ['--beard-bottom=590', '--face-top=250', '--group-size=2'],
  ]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', script, 'missing-input', 'unused-output', ...args], {
      encoding: 'utf8', timeout: 10000,
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /--face-top|그룹 입력/)
    assert.doesNotMatch(result.stdout, /재배치 대상|nobg/)
  }
})

test('CLI는 이전 결과가 남은 출력 폴더를 덮어써 실패 인물의 옛 파일을 남기지 않는다', () => {
  const root = mkdtempSync(join(tmpdir(), 'avatar-reframe-output-test-'))
  try {
    const input = join(root, 'input'), output = join(root, 'output')
    mkdirSync(input); mkdirSync(output)
    writeFileSync(join(input, 'person.png'), 'unused-before-model-loading')
    writeFileSync(join(output, 'person.webp'), 'previous-result')
    const script = fileURLToPath(new URL('../../scripts/avatar/reframe.ts', import.meta.url))
    const result = spawnSync(process.execPath, ['--import', 'tsx', script, input, output], { encoding: 'utf8', timeout: 10000 })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /출력 폴더는 비어 있어야/)
    assert.doesNotMatch(result.stdout, /재배치 대상/)
  } finally {
    if (root.startsWith(join(tmpdir(), 'avatar-reframe-output-test-'))) rmSync(root, { recursive: true })
  }
})
