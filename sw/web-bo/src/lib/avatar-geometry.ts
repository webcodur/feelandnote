/**
 * 아바타 프레임 기하 — 자르는 좌표를 계산하는 단 하나의 구현.
 *
 * **수치의 원천은 이 파일이다.** `AVATAR_SPEC`을 고치면 크롭·판정·업로드가 함께 따라온다.
 * 다른 곳(문서·스크립트·화면)에 같은 숫자를 옮겨 적지 마라 — 갈라진다.
 *
 * 사람이 읽을 배경은 docs/project/celeb/celeb-avatar-spec.md가 쥔다 — 이 숫자가 어느 표본에서
 * 나왔는지(§1), 안전 영역과 발주 프롬프트(§2~4), 사람 눈으로 하는 판정 절차(§5).
 * 값을 바꾸려면 이 파일을 고치고 그 문서의 근거 설명을 함께 갱신한다.
 *
 * 왜 눈과 턱을 기준으로 삼나:
 *   얼굴 검출 상자는 모델·인물마다 잡는 범위가 달라, 같은 배율을 곱해도 결과가 흔들린다.
 *   표본 60명 실측(2026-08-01)에서 상자 큰 변 대비 눈-턱 거리가 0.542~0.714로 32% 요동쳤다.
 *   상자 배율을 쓰면 어떤 값을 넣어도 얼굴 크기가 ±14% 흔들린다는 뜻이다.
 *   눈과 턱은 랜드마크로 직접 재므로 그 흔들림이 없고, 검출 모델이 무엇이든 같은 결과가 나온다.
 *   머리끝을 기준으로 삼지 않는 이유는 따로 있다 — 랜드마크는 머리카락과 머리 장식을 보지 못한다.
 *   그래서 규격도 머리 위를 자유로 뒀다. 갓·투구·왕관이 프레임 위로 잘려도 무방하다.
 *
 * 노드(스크립트)와 브라우저(관리자 화면) 양쪽에서 쓴다. 순수 계산만 담으며 이미지 처리는 하지 않는다.
 */

/**
 * 정사각 프레임을 1.0으로 볼 때의 기준 위치. 문서 §1의 100단위 좌표를 소수로 옮긴 값이다.
 *
 * 이 수치는 이상적 아바타 규격이 아니라 **서비스에서 좋다고 판정된 실물에서 뽑았다.**
 * 2026-08-01 기준 표본은 소개 화면(`/about`)에 세운 8명 — 세종·셰익스피어·이순신·뉴턴·
 * 광개토대왕·프랭클린·정약용·제퍼슨. 이들의 중앙값이 눈높이 46 / 턱끝 81이다.
 * 처음에는 눈 44 / 턱 70으로 잡았으나 그 기준으로는 이 8명이 전원 불합격이었다.
 */
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
   * 허용 범위 — 판정에 쓴다.
   *
   * ⚠️ **이 검사가 실제로 잡는 것은 좌우 치우침 하나뿐이다.** 세로 범위는 극단만 거르는 안전망이고,
   *    얼굴 크기를 판정하지 않는다. 좁히지 마라. 좁히면 멀쩡한 인물이 무더기로 걸린다.
   *
   *   2026-08-01 실측으로 두 번 확인했다.
   *   ① 얼굴이 작아도 턱 아래에 목·옷깃까지만 보이면 쓸 만하다. 문제는 크기가 아니라
   *      **어깨·가슴·양복이 넓게 들어오는 것**인데, 둘은 턱끝 수치가 겹쳐 구분되지 않는다
   *      (목만 나오는 68.4 정상 / 양복 들어온 67.4 불량 / 목만 나오는 71.3 정상 / 양복 들어온 73.1 불량).
   *   ② 턱끝 상한도 쓸모없었다. 86을 넘겨 걸린 7명(링컨 88.3·카프 89.4·쿠로사와 88.2·
   *      알파라비 87.5·아인슈타인 86.2·러브레이스 86.5·튜링)을 눈으로 보니 **전원 멀쩡했다.**
   *      진짜 얼굴 잘림은 랜드마크가 알려주지 못한다 — 잘린 얼굴에서도 좌표를 추정해 뱉기 때문이다.
   *
   *   그래서 얼굴 크기·잘림·상반신 유입은 전부 사람이 눈으로 본다(문서 §5).
   *
   * 머리 위 여백은 항목이 없다. 머리카락·모자·투구가 프레임 위로 잘려도 규격상 무방하다.
   */
  tolerance: {
    /** 극단 방어용. 얼굴 크기를 판정하는 값이 아니다 */
    eyeLine: [0.2, 0.65],
    /** 극단 방어용. 얼굴 크기를 판정하는 값이 아니다 */
    chinLine: [0.5, 0.98],
    /** 실질 판정 항목 — 얼굴이 좌우로 밀렸는지 */
    centerX: [0.45, 0.55],
  },

  /**
   * 랜드마크를 못 얻었을 때만 쓰는 상자 기준 폴백.
   * 표본 60명 실측에서 상자 큰 변 대비 눈-턱 거리 중앙값이 0.628이었다.
   *   프레임 = 0.628 / 0.35 = 1.794배 → boxRatio = 1 / 1.794 = 0.557
   *   눈은 상자 세로중심보다 0.130B 위에 있으므로 상자 중심이 놓이는 높이 = 0.532
   * 상자 대비 눈-턱 거리가 0.542~0.714로 흔들리므로 이 경로는 부정확하다.
   */
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
