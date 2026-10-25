import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
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
