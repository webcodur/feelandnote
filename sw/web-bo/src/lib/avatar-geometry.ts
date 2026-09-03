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

  /**
   * 좌우 치우침을 판정하고 세로 극단만 막는 범위다.
   * 얼굴 크기·얼굴 잘림·상반신 유입은 랜드마크 수치로 구분할 수 없어 사람이 검수한다.
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
  basis: CropResult['basis']
): CropResult {
  const warnings: string[] = []

  const size = Math.min(wantedSize, imgW, imgH)
  if (size < wantedSize - 0.5) {
    const pct = Math.round((1 - size / wantedSize) * 100)
    warnings.push(
      `원본이 규격보다 ${pct}% 작다. 얼굴이 규격보다 크게 담긴다(원본 ${imgW}x${imgH}, 필요 ${Math.round(wantedSize)})`
    )
  }

  // 얼굴 기준점이 프레임 안에서 규격 위치를 지키도록 하되, 이미지 밖으로는 못 나간다.
  const rawLeft = wantedLeft + (wantedSize - size) * AVATAR_SPEC.centerX
  const rawTop = wantedTop + (wantedSize - size) * AVATAR_SPEC.eyeLine
  const left = Math.max(0, Math.min(imgW - size, rawLeft))
  const top = Math.max(0, Math.min(imgH - size, rawTop))

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

/** 잘린 결과가 규격 안에 드는지 판정한다. 값은 프레임을 1.0으로 본 비율이다. */
export interface GeometryVerdict {
  eyeLine: number
  chinLine: number
  centerX: number
  pass: boolean
  faults: string[]
}

export function judgeGeometry(
  a: FaceAnchors,
  crop: { left: number; top: number; size: number }
): GeometryVerdict {
  const eyeLine = (a.eyeY - crop.top) / crop.size
  const chinLine = (a.chinY - crop.top) / crop.size
  const centerX = (a.eyeX - crop.left) / crop.size
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
