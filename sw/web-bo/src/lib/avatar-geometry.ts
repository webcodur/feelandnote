/**
 * 아바타 크롭 좌표와 기하 판정의 단일 구현.
 *
 * 수치는 `AVATAR_SPEC`, 사람이 읽는 구도·예외·검수 의미는
 * docs/project/celeb/celeb-08-01-avatar.md가 쥔다. 얼굴 상자는 검출기마다 범위가 흔들리므로
 * 기본 계산은 눈과 턱 랜드마크를 사용한다. 노드와 관리자 화면이 이 순수 계산을 함께 쓴다.
 */

/** 정사각 프레임을 1.0으로 볼 때의 목표 위치와 허용 범위. */
export const AVATAR_SPEC = {
  /** 양 눈동자 연결선이 놓이는 높이 */
  eyeLine: 0.46,
  /** 턱끝이 놓이는 높이 */
  chinLine: 0.81,
  /** 얼굴 세로 중심축의 가로 위치 */
  centerX: 0.5,
  /** 눈에서 턱까지의 거리 = chinLine - eyeLine. 얼굴 크기를 정하는 값이다 */
  eyeChinSpan: 0.35,

  /** 관리자에서 nobg 전에 자를 때의 여유 배율. 정수리·목을 남겨 최종 reframe이 다시 맞춘다. */
  preparationScale: 1.38,

  /**
   * 좌우 치우침을 판정하고 세로 극단만 막는 범위다.
   * 이 눈·턱 기준만으로 얼굴 잘림을 판정하지 않는다. reframe은 전체 주요점의 원형 잘림도 검사하며,
   * 얼굴 크기·상반신 유입과 검출 오차는 사람이 검수한다.
   * 머리 위 여백은 판정하지 않는다.
   */
  tolerance: {
    /** 극단 방어용. 얼굴 크기를 판정하는 값이 아니다 */
    eyeLine: [0.2, 0.65],
    /** 극단 방어용. 얼굴 크기를 판정하는 값이 아니다 */
    chinLine: [0.5, 0.98],
    /** 실질 판정 항목 — 얼굴이 좌우로 밀렸는지 */
    centerX: [0.45, 0.55],
  },

  /** 랜드마크를 얻지 못했을 때만 쓰는 부정확한 얼굴 상자 폴백. 호출부는 경고를 남긴다. */
  fallback: {
    boxRatio: 0.557,
    boxAnchorY: 0.532,
  },
} as const

/** 랜드마크에서 뽑아낸, 크롭에 필요한 최소 정보. 좌표는 원본 이미지 픽셀 기준이다. */
export interface FaceAnchors {
  /** 양 눈동자의 평균 가로 위치 */
  eyeX: number
  /** 양 눈동자의 평균 높이 */
  eyeY: number
  /** 턱끝 높이 */
  chinY: number
}

/** 얼굴 검출 상자. 좌표는 원본 이미지 픽셀 기준이다. */
export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CropResult {
  left: number
  top: number
  size: number
  /**
   * 규격대로 자르려면 필요했던 정사각 한 변. size가 이보다 작으면 원본이 모자란 것이다.
   */
  wantedSize: number
  /**
   * 원본이 모자라거나 얼굴이 가장자리에 붙어 좌표를 밀어야 했을 때 채워진다.
   * 비어 있지 않으면 결과가 규격을 벗어난다 — 호출부는 이것을 조용히 넘기지 말고 기록하거나 실패로 처리한다.
   */
  warnings: string[]
  /** 어느 경로로 계산했는가 */
  basis: 'landmarks' | 'box'
}

function clampCrop(
  wantedLeft: number,
  wantedTop: number,
  wantedSize: number,
  imgW: number,
  imgH: number,
  basis: CropResult['basis'],
  allowTopPadding = false,
): CropResult {
  const warnings: string[] = []

  const size = Math.min(wantedSize, imgW, allowTopPadding ? Infinity : imgH)
  if (size < wantedSize - 0.5) {
    const pct = Math.round((1 - size / wantedSize) * 100)
    warnings.push(
      `원본이 규격보다 ${pct}% 작다. 얼굴이 규격보다 크게 담긴다(원본 ${imgW}x${imgH}, 필요 ${Math.round(wantedSize)})`
    )
  }

  // nobg 전 얼굴 크롭은 위쪽 원본이 없어도 얼굴 기준 위치를 유지한다.
  // 다른 크롭은 기존처럼 원본 안으로 제한한다.
  const rawLeft = wantedLeft + (wantedSize - size) * AVATAR_SPEC.centerX
  const rawTop = wantedTop + (wantedSize - size) * AVATAR_SPEC.eyeLine
  const left = Math.max(0, Math.min(imgW - size, rawLeft))
  const limitedTop = Math.min(imgH - size, rawTop)
  const top = allowTopPadding ? limitedTop : Math.max(0, limitedTop)
  if (allowTopPadding && top < 0) {
    warnings.push('원본 위쪽이 부족해 얼굴 위치를 유지하고 빈 부분을 투명 여백으로 채웁니다.')
  }

  // 밀린 양이 프레임의 2%를 넘으면 얼굴이 규격 위치를 벗어난다.
  const driftX = Math.abs(left - rawLeft) / size
  const driftY = Math.abs(top - rawTop) / size
  if (driftX > 0.02) {
    warnings.push(`얼굴이 원본 좌우 가장자리에 붙어 가로 위치가 ${Math.round(driftX * 100)}단위 밀렸다`)
  }
  if (driftY > 0.02) {
    warnings.push(`얼굴이 원본 위아래 가장자리에 붙어 세로 위치가 ${Math.round(driftY * 100)}단위 밀렸다`)
  }

  return {
    left: Math.round(left),
    top: Math.round(top),
    size: Math.round(size),
    wantedSize: Math.round(wantedSize),
    warnings,
    basis,
  }
}

/**
 * 눈·턱 위치로 자를 정사각 영역을 구한다. 이것이 기본 경로다.
 */
export function computeCropFromLandmarks(
  a: FaceAnchors,
  imgW: number,
  imgH: number
): CropResult {
  const eyeChin = a.chinY - a.eyeY
  if (!(eyeChin > 0)) {
    throw new Error('턱이 눈보다 위에 있다 — 랜드마크가 잘못됐다')
  }
  const wantedSize = eyeChin / AVATAR_SPEC.eyeChinSpan
  const wantedLeft = a.eyeX - wantedSize * AVATAR_SPEC.centerX
  const wantedTop = a.eyeY - wantedSize * AVATAR_SPEC.eyeLine
  return clampCrop(wantedLeft, wantedTop, wantedSize, imgW, imgH, 'landmarks')
}

/**
 * 랜드마크를 못 얻었을 때 쓰는 폴백. 얼굴 크기가 ±14% 흔들리므로 결과를 신뢰도 낮음으로 취급한다.
 */
export function computeCropFromBox(
  box: FaceBox,
  imgW: number,
  imgH: number
): CropResult {
  const base = Math.max(box.width, box.height)
  const wantedSize = base / AVATAR_SPEC.fallback.boxRatio
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const wantedLeft = cx - wantedSize * AVATAR_SPEC.centerX
  const wantedTop = cy - wantedSize * AVATAR_SPEC.fallback.boxAnchorY
  const r = clampCrop(wantedLeft, wantedTop, wantedSize, imgW, imgH, 'box')
  r.warnings.unshift('랜드마크를 못 얻어 상자 기준으로 잘랐다 — 얼굴 크기가 규격에서 ±14% 흔들릴 수 있다')
  return r
}

export interface PreparationCropOptions {
  /** 직접 검수한 원본 수염의 마지막 행(inclusive). 알파 전체 하단으로 추정하지 않는다. */
  beardBottom?: number
}

/** 배경 제거 입력을 줄이고 정수리·목 여백을 남긴다. 위쪽 원본이 부족해도 위치를 밀지 않는다. */
export function computePreparationCrop(a: FaceAnchors, imgW: number, imgH: number, options: PreparationCropOptions = {}): CropResult {
  const baseSize = (a.chinY - a.eyeY) / AVATAR_SPEC.eyeChinSpan
  if (!(baseSize > 0)) throw new Error('턱이 눈보다 위에 있다 — 랜드마크가 잘못됐다')
  const size = baseSize * AVATAR_SPEC.preparationScale
  const base = clampCrop(
    a.eyeX - size * AVATAR_SPEC.centerX,
    a.eyeY - baseSize * AVATAR_SPEC.eyeLine - (size - baseSize) / 2,
    size, imgW, imgH, 'landmarks', true,
  )
  const { beardBottom } = options
  if (beardBottom === undefined) return base
  if (!Number.isInteger(beardBottom) || beardBottom < a.chinY || beardBottom >= imgH) {
    throw new Error('beardBottom은 턱끝 이상·원본 높이 미만인 수염 마지막 행의 정수 좌표여야 한다')
  }
  // 얼굴 위쪽은 기존 준비 크롭 그대로 두고 수염과 기존 목 여유만 더 확보한다.
  const wantedBottom = beardBottom + 1 + (a.chinY - a.eyeY) * AVATAR_SILHOUETTE_SPEC.neckBelowChin
  const bottom = Math.min(imgH, Math.max(base.top + base.size, wantedBottom))
  const expandedSize = Math.ceil(bottom - base.top)
  if (expandedSize > imgW) {
    throw new Error('수염과 얼굴 위쪽을 함께 담을 원본 가로폭 부족: 더 넓은 원본을 확인하라')
  }
  const crop = clampCrop(a.eyeX - expandedSize * AVATAR_SPEC.centerX, base.top, expandedSize, imgW, imgH, 'landmarks', true)
  if ((a.eyeY - crop.top) / crop.size < AVATAR_SPEC.tolerance.eyeLine[0] ||
      Math.abs((a.eyeX - crop.left) / crop.size - AVATAR_SPEC.centerX) > AVATAR_SPEC.tolerance.centerX[1] - AVATAR_SPEC.centerX) {
    throw new Error('수염과 양눈 위 얼굴·가로 중심을 함께 담을 원본 구도가 필요하다')
  }
  if (crop.top + crop.size <= beardBottom || crop.top + crop.size > imgH) {
    throw new Error('원본 범위 안에서 수염 마지막 행을 보존하지 못했다')
  }
  if (wantedBottom > imgH) crop.warnings.push('원본 하단이 수염 아래 목 여유보다 짧다. 잘리지 않은 원본인지 직접 확인하라')
  return crop
}

/** 잘린 결과가 규격 안에 드는지 판정한다. 값은 프레임을 1.0으로 본 비율이다. */
export interface GeometryVerdict {
  eyeLine: number
  chinLine: number
  centerX: number
  pass: boolean
  faults: string[]
}

export function judgeGeometry(
  a: FaceAnchors & { centerX?: number },
  crop: { left: number; top: number; size: number }
): GeometryVerdict {
  const eyeLine = (a.eyeY - crop.top) / crop.size
  const chinLine = (a.chinY - crop.top) / crop.size
  // 중심축은 얼굴 좌우 끝의 중점이다. 넘기지 않으면 눈 중점으로 본다.
  const centerX = ((a.centerX ?? a.eyeX) - crop.left) / crop.size
  const faults: string[] = []
  const t = AVATAR_SPEC.tolerance
  const check = (v: number, [lo, hi]: readonly [number, number], name: string) => {
    // 소수 곱셈 오차가 그대로 찍히지 않게 반올림해서 보여준다(0.55*100 = 55.00000000000001).
    if (v < lo) faults.push(`${name} ${(v * 100).toFixed(1)} — 하한 ${Math.round(lo * 100)} 미달`)
    else if (v > hi) faults.push(`${name} ${(v * 100).toFixed(1)} — 상한 ${Math.round(hi * 100)} 초과`)
  }
  check(eyeLine, t.eyeLine, '눈높이')
  check(chinLine, t.chinLine, '턱끝')
  check(centerX, t.centerX, '얼굴 중심축')
  return { eyeLine, chinLine, centerX, pass: faults.length === 0, faults }
}

// ─── 실루엣 기준 재배치 ─────────────────────────────────────────
/**
 * 배경이 지워진 아바타를 정수리·쇄골 기준으로 다시 자를 때의 규격.
 * 눈·턱만 보는 AVATAR_SPEC은 정수리 여백과 상반신 유입을 재지 않아 같은 합격이라도 보기에 제각각이다.
 * 기준 인물(김봉진·빌 게이츠) 실측과 오디세이아 55명 검수에서 뽑았다.
 * 값의 의미는 docs/project/celeb/celeb-08-01-avatar.md 「정규화」.
 */
export const AVATAR_SILHOUETTE_SPEC = {
  /** 정수리 위 여백. 프레임 한 변 대비 */
  headroom: 0.04,
  /** 턱끝에서 프레임 하단까지의 거리. 눈~턱 거리의 배수. 넥타이를 맸다면 매듭이 보이기 직전 */
  neckBelowChin: 0.24,
  /** 눈높이 상한. 머리숱이 커서 얼굴이 이보다 낮게 앉으면 하단을 고정하고 확대해 올린다 */
  eyeLineMax: 0.51,
  /** 눈~턱 거리 / 프레임 한 변의 허용 범위. 김봉진(0.378)~빌 게이츠(0.414)를 감싼다 */
  eyeChinSpanRange: [0.36, 0.44],
  /** 턱선 중점을 주축으로 두고 양눈 중점을 섞는다. 한쪽 눈 보정은 3/4 얼굴을 반대로 밀었다. */
  horizontal: {
    eyeMidWeight: 0.25,
    /** 얼굴 높이 구간의 알파 면적 중심을 일부 반영한다. 어깨·가슴은 측정하지 않는다. */
    silhouetteWeight: 0.6,
    silhouetteDeadZone: 0.01,
    maxSilhouetteShift: 0.05,
    bandAboveEye: 0.8,
    bandBelowChin: 0.15,
  },
  /** 완성본 재검출 오차로 크롭을 반복 축소하지 않는다. 이미 정상인 정사각에만 적용한다. */
  stability: { ratioTolerance: 0.015, centerTolerance: 0.025, neckTolerance: 0.16 },
  /** 측면에서도 코끝이 프레임 변에 붙거나 잘리지 않도록 확보할 최소 여유. 프레임 폭 대비. */
  featureInset: 0.06,
  /** 실제 원형 표시에서 눈·코·입·턱선·눈썹을 남기는 프레임 대비 안쪽 여유. */
  faceSafety: { circleInset: 0.02 },
  /** 얼굴이 화면을 꽉 채워 미검출되면 검출 영상에만 붙일 회색 여백. 긴 변 대비. */
  detection: { padding: 0.25, minConfidence: 0.4, maxResults: 10 },
  /** ln(코끝→왼쪽 턱선 / 코끝→오른쪽 턱선). 얼굴 방향 진단용이며 측면을 배제하지 않는다. */
  emphasis: { deadZone: 0.1 },
  /** 알파 채널에서 정수리로 인정할 최소 불투명 픽셀 수. 폭 대비. 흩날리는 머리카락 한두 올을 무시한다 */
  minOpaqueRun: 0.01,
  /** 알파 불투명 판정 임계 (0~255) */
  alphaThreshold: 128,
} as const

export interface SilhouetteInfo {
  /** 실루엣 최상단 행 (원본 픽셀) */
  headTop: number
  /** 실루엣이 원본 상단에 닿아 정수리가 이미 잘린 상태인가 */
  touchesTop: boolean
  /**
   * 행별 실루엣의 가장 왼쪽·오른쪽 불투명 x (없는 행은 -1).
   * 가로로 원본 밖으로 나가도 되는지(그 변에 실루엣이 닿아 있지 않은지) 판단하는 데 쓴다.
   */
  rowLeft?: number[]
  rowRight?: number[]
  /** 행별 불투명 픽셀 수와 그 픽셀들의 가로 평균. 머리카락·장식의 면적 균형을 잰다. */
  rowMass?: number[]
  rowCenterX?: number[]
}

/** 재배치용 앵커. 가로 기준을 눈 중점이 아닌 값으로 줄 수 있다 */
export interface SilhouetteAnchors extends FaceAnchors {
  /** 검출된 얼굴 윤곽과 주요점. 원형 안의 잘림을 검사하며 머리카락·어깨는 포함하지 않는다. */
  facePoints?: readonly { x: number; y: number }[]
  /** 양눈 연결선의 기울기. 진단용이며 각도만으로 얼굴을 거절하지 않는다. */
  rollDegrees?: number
  /** 프레임 가로 중앙에 둘 원본 x. 없으면 eyeX. horizontalAnchor()로 구한다. */
  centerX?: number
  /** 보정 전 턱선 중점. 최종 검증에서 중심 보정 자체가 치우침을 숨기지 못하게 한다. */
  faceCenterX?: number
  /** 코끝의 가로 위치. 측면 얼굴의 앞부분이 크롭에 잘리지 않는지 확인한다. */
  noseX?: number
  /** 코끝과 턱선의 비대칭. 얼굴 방향 진단용이다. */
  emphasis?: number
}

export interface SilhouetteCropOptions {
  /** 직접 검수한 수염의 마지막 행(입력 원본 픽셀, inclusive). 생략하면 기존 목 기준이다. */
  beardBottom?: number
  /** 긴 수염과 함께 보존할 이마 상단의 입력 행. 머리카락·관모 상단이 아니며 beardBottom과만 쓴다. */
  faceTop?: number
}

/**
 * 턱선 양끝의 중점과 양눈 중점 사이에 가로 기준을 둔다.
 * 코·턱선의 비대칭으로 한쪽 눈까지 옮기면 머리카락에 가려진 턱과 고개 회전을 혼동한다.
 * 반환 emphasis는 양수면 왼쪽 부각, 음수면 오른쪽 부각이며 얼굴 방향 진단에 쓴다.
 */
export function horizontalAnchor(p: {
  leftEyeX: number
  rightEyeX: number
  noseX: number
  jawLeftX: number
  jawRightX: number
}): { centerX: number; faceCenterX: number; emphasis: number } {
  const faceMid = (p.jawLeftX + p.jawRightX) / 2
  const eyeMid = (p.leftEyeX + p.rightEyeX) / 2
  const centerX = faceMid + AVATAR_SILHOUETTE_SPEC.horizontal.eyeMidWeight * (eyeMid - faceMid)
  const leftWidth = p.noseX - p.jawLeftX
  const rightWidth = p.jawRightX - p.noseX
  if (!(leftWidth > 0) || !(rightWidth > 0)) return { centerX, faceCenterX: faceMid, emphasis: 0 }
  const emphasis = Math.log(leftWidth / rightWidth)
  return { centerX, faceCenterX: faceMid, emphasis }
}

export interface SilhouetteCropResult extends CropResult {
  /** 머리카락·장식의 면적 균형으로 얼굴 기준에서 추가 이동한 원본 픽셀. */
  visualShift?: number
  /** 결과 프레임에서 눈~턱 거리 비율 */
  spanRatio: number
  /** 결과 프레임에서 눈높이 */
  eyeLine: number
  /** 어떤 제약이 프레임 크기를 결정했는가 */
  decidedBy: 'silhouette' | 'eye-line' | 'min-span' | 'max-span' | 'source-top' | 'face-top' | 'face-safety' | 'already-normalized'
}

/**
 * 정수리(알파)와 눈·턱(랜드마크)으로 정사각을 구한다.
 * 하단은 턱 아래 neckBelowChin×(눈~턱)으로 먼저 고정하고, 상단은 정수리 위 headroom이 기본이다.
 * 눈높이 상한과 얼굴 크기 범위는 하단을 고정한 채 프레임 크기를 바꿔 맞춘다(정수리가 잘릴 수 있다).
 * 위아래로는 원본 밖으로 나가지 않는다 — 잘린 몸통 아래나 잘린 머리 위에 투명 여백을 붙이면 절단면이 드러난다.
 * 좌우는 그 변에 실루엣이 닿아 있지 않을 때만 원본 밖으로 나간다(투명 여백이 배경과 구분되지 않는다).
 * 음수 left 또는 imgW를 넘는 right는 호출부가 투명으로 채운다.
 */
export function computeCropFromSilhouette(
  a: SilhouetteAnchors,
  s: SilhouetteInfo,
  imgW: number,
  imgH: number,
  options: SilhouetteCropOptions = {},
): SilhouetteCropResult {
  const S = AVATAR_SILHOUETTE_SPEC
  const span = a.chinY - a.eyeY
  if (!(span > 0)) throw new Error('턱이 눈보다 위에 있다 — 랜드마크가 잘못됐다')
  const warnings: string[] = []
  let decidedBy: SilhouetteCropResult['decidedBy'] = 'silhouette'

  const { beardBottom, faceTop } = options
  if (beardBottom !== undefined &&
      (!Number.isInteger(beardBottom) || beardBottom < a.chinY || beardBottom >= imgH)) {
    throw new Error('beardBottom은 턱끝 이상·원본 높이 미만인 수염 마지막 행의 정수 좌표여야 한다')
  }
  if (beardBottom !== undefined && s.rowLeft?.[beardBottom] === -1) {
    throw new Error('beardBottom 기준 행에 불투명 실루엣이 없다: 실제 수염 끝을 다시 확인하라')
  }
  if (faceTop !== undefined) {
    if (beardBottom === undefined) throw new Error('faceTop은 직접 검수한 beardBottom과 함께 사용해야 한다')
    if (!Number.isInteger(faceTop) || faceTop < 0 || faceTop < s.headTop || faceTop >= a.eyeY || faceTop >= imgH) {
      throw new Error('faceTop은 원본 실루엣 안에서 양눈보다 위에 있는 이마 상단의 정수 좌표여야 한다')
    }
    if (s.rowLeft?.[faceTop] === -1) throw new Error('faceTop 기준 행에 불투명 실루엣이 없다: 실제 이마 상단을 다시 확인하라')
  }
  // 긴 수염의 하단이 목 길이보다 우선한다. 마지막 행을 포함하도록 다음 픽셀 경계를 쓴다.
  const wantedBottom = beardBottom === undefined ? a.chinY + span * S.neckBelowChin : beardBottom + 1
  const bottom = Math.min(wantedBottom, imgH)
  // 원본이 턱 바로 아래에서 끝나는 경우만 경고한다. 몇 픽셀 차이는 보이지 않는다
  if ((wantedBottom - imgH) / span > 0.1) warnings.push('원본 하단이 목 길이보다 짧아 턱 아래가 규격보다 적게 담긴다')

  // 1) 정수리 기준. 정수리가 이미 잘린 원본은 여백을 둘 수 없다
  let size = s.touchesTop ? bottom : (bottom - s.headTop) / (1 - S.headroom)

  // 2) 눈높이 상한 — 하단 고정 확대
  const sizeForEye = (bottom - a.eyeY) / (1 - S.eyeLineMax)
  if (size > sizeForEye) {
    size = sizeForEye
    decidedBy = 'eye-line'
  }

  // 3) 얼굴 크기 범위 — 하단 고정
  const [minSpan, maxSpan] = S.eyeChinSpanRange
  if (span / size < minSpan) {
    size = span / minSpan
    decidedBy = 'min-span'
  } else if (span / size > maxSpan) {
    size = span / maxSpan
    decidedBy = 'max-span'
  }

  // 명시한 긴 수염 때문에 min-span 확대가 양눈 위 얼굴을 자르면 확대만 제한한다.
  // 수염 하단과 기존 눈 하한을 함께 보존하고 얼굴 크기 목표 미달은 직접 검수로 드러낸다.
  if (beardBottom !== undefined) {
    const minimumForUpperFace = Math.ceil((bottom - a.eyeY) / (1 - AVATAR_SPEC.tolerance.eyeLine[0]))
    if (size < minimumForUpperFace) {
      size = minimumForUpperFace
      warnings.push('수염 하단과 양눈 위 얼굴을 보존해 눈~턱 비율이 최소 목표보다 작다. 얼굴 크기를 직접 검수하라')
    }
  }

  // 긴 수염과 검수한 이마를 동시에 보존한다. 일반 얼굴 크기 목표를 위해
  // 이마를 자르지 않으며, 관모·머리 전체를 담는 옵션으로 쓰지 않는다.
  if (faceTop !== undefined && size < bottom - faceTop) {
    size = bottom - faceTop
    decidedBy = 'face-top'
    warnings.push('수염 하단과 검수한 이마 상단을 보존해 얼굴 크기 목표보다 잘림 방지를 우선했다. 얼굴 크기를 직접 검수하라')
  }

  // 4) 원본 상단 밖으로 나가면 위에 붙인다
  let top = bottom - size
  if (top < 0) {
    top = 0
    size = bottom
    decidedBy = 'source-top'
  }

  if (beardBottom !== undefined && (a.eyeY - top) / size < AVATAR_SPEC.tolerance.eyeLine[0]) {
    throw new Error('수염 하단과 양눈 위 얼굴을 함께 담을 원본 구도가 필요하다: beardBottom 좌표와 원본을 확인하라')
  }
  if (faceTop !== undefined) {
    const eyeLine = (a.eyeY - top) / size
    const chinLine = (a.chinY - top) / size
    if (top > faceTop || eyeLine > AVATAR_SPEC.tolerance.eyeLine[1] ||
        chinLine < AVATAR_SPEC.tolerance.chinLine[0] || chinLine > AVATAR_SPEC.tolerance.chinLine[1]) {
      throw new Error('이마 상단과 수염 하단을 기존 눈·턱 허용 범위 안에 함께 담을 원본 구도가 필요하다')
    }
  }

  const headroom = (s.headTop - top) / size
  if (headroom < -0.005) warnings.push(`정수리를 ${Math.round(-headroom * 100)}% 잘랐다 (${decidedBy})`)

  const cx = a.centerX ?? a.eyeX
  const rawLeft = cx - size * AVATAR_SPEC.centerX
  // 프레임 세로 범위 안에서 실루엣이 좌우 변에 닿는가
  let touchesLeft = true
  let touchesRight = true
  if (s.rowLeft && s.rowRight) {
    touchesLeft = false
    touchesRight = false
    const y0 = Math.max(0, Math.floor(top))
    const y1 = Math.min(imgH, Math.ceil(top + size))
    for (let y = y0; y < y1; y++) {
      if (s.rowLeft[y] === 0) touchesLeft = true
      if (s.rowRight[y] >= imgW - 1) touchesRight = true
    }
  }
  let left = rawLeft
  if (left < 0 && touchesLeft) left = 0
  if (left + size > imgW && touchesRight) left = imgW - size
  const driftX = Math.abs(left - rawLeft) / size
  if (driftX > 0.02) warnings.push(`실루엣이 원본 좌우 가장자리에 닿아 가로 위치가 ${Math.round(driftX * 100)}단위 밀렸다`)

  return {
    left: Math.round(left),
    // 명시한 마지막 수염 행과 원본 하단을 반올림으로 넘기거나 잃지 않는다.
    top: beardBottom === undefined ? Math.round(top) : bottom - Math.round(size),
    size: Math.round(size),
    wantedSize: Math.round(size),
    warnings,
    basis: 'landmarks',
    spanRatio: span / size,
    eyeLine: (a.eyeY - top) / size,
    decidedBy,
  }
}

// ─── 빛 방향 통일 ───────────────────────────────────────────────
/**
 * 아바타의 키라이트 방향을 한쪽으로 맞추는 규격. 반대쪽에서 빛을 받는 이미지는 좌우를 뒤집는다.
 * 판정은 코끝 기준 좌·우 뺨의 평균 밝기 비(ln)다. 값의 의미는 docs/project/celeb/celeb-08-01-avatar.md 「정규화」.
 */
export const AVATAR_LIGHT_SPEC = {
  /** 통일할 방향. 뷰어 기준 */
  targetSide: 'left' as 'left' | 'right',
  /** |ln(좌밝기/우밝기)| 가 이 값 이하이면 정면광으로 보고 손대지 않는다 */
  frontalThreshold: 0.12,
  /** 뺨 표본 영역. 눈~턱 구간의 위아래 15%를 제외하고, 코끝~턱선 사이에서 안쪽 15%·바깥쪽 25%를 제외한다 */
  sample: { vertical: 0.15, inner: 0.15, outer: 0.25 },
  /** 표본에 넣을 최소 알파 (0~255). 반투명 가장자리를 뺀다 */
  minAlpha: 200,
} as const

export type LightSide = 'left' | 'right' | 'frontal'

export function judgeLight(leftLum: number, rightLum: number): { side: LightSide; ratio: number; flip: boolean } {
  const ratio = Math.log(leftLum / rightLum)
  const t = AVATAR_LIGHT_SPEC.frontalThreshold
  const side: LightSide = ratio > t ? 'left' : ratio < -t ? 'right' : 'frontal'
  return { side, ratio, flip: side !== 'frontal' && side !== AVATAR_LIGHT_SPEC.targetSide }
}
