import {
  AVATAR_SILHOUETTE_SPEC,
  computeCropFromSilhouette,
  horizontalAnchor,
  type SilhouetteAnchors,
  type SilhouetteCropOptions,
  type SilhouetteInfo,
} from './avatar-geometry'

type Point = { x: number; y: number }

/** 브라우저와 CLI가 같은 랜드마크에서 같은 기준점을 뽑는다. */
export function reframeAnchorsOf(landmarks: {
  getLeftEye(): Point[]
  getRightEye(): Point[]
  getNose(): Point[]
  getJawOutline(): Point[]
}): (SilhouetteAnchors & { emphasis: number }) | null {
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
  return { eyeX: (L.x + R.x) / 2, eyeY, chinY, ...horizontal }
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
  for (let y = 0; y < height; y++) {
    let run = 0
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > AVATAR_SILHOUETTE_SPEC.alphaThreshold) {
        run++
        if (rowLeft[y] < 0) rowLeft[y] = x
        rowRight[y] = x
      } else transparent++
    }
    if (headTop < 0 && run >= minRun) headTop = y
  }
  if (transparent < width * height * 0.05 || headTop < 0) return null
  return { headTop, touchesTop: headTop <= 1, rowLeft, rowRight }
}

/** 같은 안전 조건으로 좌표를 확정하고 잘린 어깨 옆 투명 패딩을 막는다. */
export function computeReframeCrop(
  anchors: SilhouetteAnchors,
  silhouette: SilhouetteInfo,
  width: number,
  height: number,
  options: SilhouetteCropOptions = {},
) {
  const crop = computeCropFromSilhouette(anchors, silhouette, width, height, options)
  const left = silhouette.rowLeft?.slice(crop.top, crop.top + crop.size) ?? []
  const right = silhouette.rowRight?.slice(crop.top, crop.top + crop.size) ?? []
  if ((crop.left < 0 && left.some((x) => x === 0)) ||
      (crop.left + crop.size > width && right.some((x) => x >= width - 1))) {
    throw new Error('원본 가로폭 부족: 잘린 실루엣 옆 투명 패딩 금지. 더 넓은 원본으로 재구성 필요')
  }
  return crop
}
