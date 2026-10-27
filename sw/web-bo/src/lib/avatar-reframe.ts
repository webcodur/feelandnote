import {
  AVATAR_SILHOUETTE_SPEC,
  AVATAR_SPEC,
  computeCropFromSilhouette,
  horizontalAnchor,
  judgeGeometry,
  type SilhouetteAnchors,
  type SilhouetteCropOptions,
  type SilhouetteCropResult,
  type SilhouetteInfo,
} from './avatar-geometry'

type Point = { x: number; y: number }

/** 검출이 0건일 때만 여백을 붙여 한 번 재시도한다. 여러 얼굴을 숨기는 재시도는 하지 않는다. */
export async function detectWithAvatarPadding<T>(width: number, height: number, detect: (padding: number) => Promise<T[]>) {
  const direct = await detect(0)
  if (direct.length) return { detections: direct, padding: 0 }
  const padding = Math.round(Math.max(width, height) * AVATAR_SILHOUETTE_SPEC.detection.padding)
  return { detections: await detect(padding), padding }
}

/** face-api의 shiftBy는 이동량을 더하지 않고 상자 기준점을 교체한다. 기존 상자 이동을 보존한다. */
export function unpadAvatarLandmarks<T extends { shift: Point; shiftBy(x: number, y: number): unknown }>(landmarks: T, padding: number): T {
  return padding ? landmarks.shiftBy(landmarks.shift.x - padding, landmarks.shift.y - padding) as T : landmarks
}

/** 브라우저와 CLI가 같은 랜드마크에서 같은 기준점을 뽑는다. */
export function reframeAnchorsOf(landmarks: {
  getLeftEye(): Point[]
  getRightEye(): Point[]
  getNose(): Point[]
  getJawOutline(): Point[]
}): (SilhouetteAnchors & ReturnType<typeof horizontalAnchor>) | null {
  const left = landmarks.getLeftEye()
  const right = landmarks.getRightEye()
  const nose = landmarks.getNose()[3]
  const jaw = landmarks.getJawOutline()
  if (!left.length || !right.length || !nose || !jaw.length) return null
  const center = (points: Point[]) => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  })
  const L = center(left)
  const R = center(right)
  const eyeY = (L.y + R.y) / 2
  const chinY = jaw[Math.floor(jaw.length / 2)].y
  if (!(chinY > eyeY)) return null
  const horizontal = horizontalAnchor({
    leftEyeX: L.x, rightEyeX: R.x, noseX: nose.x,
    jawLeftX: jaw[0].x, jawRightX: jaw[jaw.length - 1].x,
  })
  return { eyeX: (L.x + R.x) / 2, eyeY, chinY, noseX: nose.x, ...horizontal }
}

/** RGBA 알파에서 정규화용 실루엣을 읽는다. 투명 배경이 아니면 null. */
export function silhouetteFromRgba(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): SilhouetteInfo | null {
  const minRun = Math.max(1, Math.round(width * AVATAR_SILHOUETTE_SPEC.minOpaqueRun))
  let transparent = 0
  let headTop = -1
  const rowLeft: number[] = new Array(height).fill(-1)
  const rowRight: number[] = new Array(height).fill(-1)
  const rowMass: number[] = new Array(height).fill(0)
  const rowCenterX: number[] = new Array(height).fill(-1)
  for (let y = 0; y < height; y++) {
    let run = 0
    let moment = 0
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > AVATAR_SILHOUETTE_SPEC.alphaThreshold) {
        run++
        moment += x
        if (rowLeft[y] < 0) rowLeft[y] = x
        rowRight[y] = x
      } else transparent++
    }
    rowMass[y] = run
    if (run) rowCenterX[y] = moment / run
    if (headTop < 0 && run >= minRun) headTop = y
  }
  if (transparent < width * height * 0.05 || headTop < 0) return null
  return { headTop, touchesTop: headTop <= 1, rowLeft, rowRight, rowMass, rowCenterX }
}

/** 얼굴 높이 구간의 불투명 면적 치우침만 얼굴 기준에 작게 더한다. */
export function computeSilhouetteOffset(anchors: SilhouetteAnchors, silhouette: SilhouetteInfo, size: number): number {
  if (!silhouette.rowMass || !silhouette.rowCenterX) return 0
  const S = AVATAR_SILHOUETTE_SPEC.horizontal
  const span = anchors.chinY - anchors.eyeY
  const y0 = Math.max(silhouette.headTop, Math.round(anchors.eyeY - span * S.bandAboveEye))
  const y1 = Math.min(silhouette.rowMass.length, Math.round(anchors.chinY - span * S.bandBelowChin))
  let mass = 0
  let moment = 0
  for (let y = y0; y < y1; y++) {
    const count = silhouette.rowMass[y]
    const center = silhouette.rowCenterX[y]
    if (count > 0 && Number.isFinite(center) && center >= 0) {
      mass += count
      moment += count * center
    }
  }
  if (!mass) return 0
  const delta = moment / mass - (anchors.centerX ?? anchors.eyeX)
  const beyondDeadZone = Math.max(0, Math.abs(delta) - size * S.silhouetteDeadZone)
  return Math.sign(delta) * Math.min(beyondDeadZone * S.silhouetteWeight, size * S.maxSilhouetteShift)
}

/** 중심 보정과 원본 경계 제한 뒤 최종 얼굴 위치를 검증한다. */
export function computeReframeCrop(
  anchors: SilhouetteAnchors,
  silhouette: SilhouetteInfo,
  width: number,
  height: number,
  options: SilhouetteCropOptions = {},
): SilhouetteCropResult {
  if (![anchors.eyeX, anchors.eyeY, anchors.chinY, anchors.centerX ?? anchors.eyeX,
    anchors.faceCenterX ?? anchors.eyeX, anchors.noseX ?? anchors.eyeX, anchors.emphasis ?? 0,
    silhouette.headTop, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error('유효하지 않은 얼굴 기준점 또는 이미지 크기')
  }
  const S = AVATAR_SILHOUETTE_SPEC
  const span = anchors.chinY - anchors.eyeY
  const spanRatio = span / height
  const eyeLine = anchors.eyeY / height
  const neck = (height - anchors.chinY) / span
  const frameShift = computeSilhouetteOffset(anchors, silhouette, width)
  const current = judgeGeometry({ ...anchors, centerX: (anchors.faceCenterX ?? anchors.centerX ?? anchors.eyeX) + frameShift }, { left: 0, top: 0, size: width })
  const normalized = width === height && options.beardBottom === undefined && options.faceTop === undefined &&
    current.pass && Math.abs(((anchors.centerX ?? anchors.eyeX) + frameShift) / width - AVATAR_SPEC.centerX) <= S.stability.centerTolerance &&
    spanRatio >= S.eyeChinSpanRange[0] - S.stability.ratioTolerance &&
    spanRatio <= S.eyeChinSpanRange[1] + S.stability.ratioTolerance &&
    eyeLine <= S.eyeLineMax + S.stability.ratioTolerance &&
    silhouette.headTop >= 0 && silhouette.headTop / height <= S.headroom + S.stability.ratioTolerance &&
    Math.abs(neck - S.neckBelowChin) <= S.stability.neckTolerance
  const initial = normalized
    ? { left: 0, top: 0, size: width, wantedSize: width, warnings: [] as string[], basis: 'landmarks' as const,
      spanRatio, eyeLine, decidedBy: 'already-normalized' as const }
    : computeCropFromSilhouette(anchors, silhouette, width, height, options)
  const visualShift = normalized ? frameShift : computeSilhouetteOffset(anchors, silhouette, initial.size)
  const crop = normalized || !visualShift ? initial : computeCropFromSilhouette(
    { ...anchors, centerX: (anchors.centerX ?? anchors.eyeX) + visualShift }, silhouette, width, height, options,
  )
  const left = silhouette.rowLeft?.slice(crop.top, crop.top + crop.size) ?? []
  const right = silhouette.rowRight?.slice(crop.top, crop.top + crop.size) ?? []
  if ((crop.left < 0 && left.some((x) => x === 0)) ||
      (crop.left + crop.size > width && right.some((x) => x >= width - 1))) {
    throw new Error('원본 가로폭 부족: 잘린 실루엣 옆 투명 패딩 금지. 더 넓은 원본으로 재구성 필요')
  }
  // 이동량 경고만 보면 잘못 잡은 중심 기준이 실패를 숨길 수 있다.
  // 면적 균형에 따른 의도된 이동만 허용하고, 원본 가장자리에 막혀 추가로 밀린 결과는 거절한다.
  const verdict = judgeGeometry({ ...anchors, centerX: (anchors.faceCenterX ?? anchors.centerX ?? anchors.eyeX) + visualShift }, crop)
  if (!verdict.pass) {
    throw new Error(`최종 얼굴 구도 이탈: ${verdict.faults.join(' / ')}. 얼굴 주변 여유가 있는 더 넓은 원본으로 다시 시도하세요.`)
  }
  if (anchors.noseX !== undefined) {
    const noseLine = (anchors.noseX - crop.left) / crop.size
    if (noseLine < S.featureInset || noseLine > 1 - S.featureInset) {
      throw new Error('코끝이 크롭 가장자리에 붙거나 잘립니다. 얼굴 앞쪽 여유가 있는 더 넓은 원본으로 다시 시도하세요.')
    }
  }
  return visualShift ? { ...crop, visualShift } : crop
}
