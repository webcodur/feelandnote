/** 아바타 원본과 작은 판의 파일·출력 규격을 공유하는 코드 원천. */
const ORIGINAL_SIZE_PX = 800
const ORIGINAL_WEBP_QUALITY = 95
const ORIGINAL_FILE = 'avatar.webp'
const SIZE_PX = 96
const SMALL_WEBP_QUALITY = 82
const SMALL_FILE = 'avatar-sm.webp'

export const CELEB_AVATAR_ORIGINAL = {
  sizePx: ORIGINAL_SIZE_PX,
  webpQuality: ORIGINAL_WEBP_QUALITY,
  file: ORIGINAL_FILE,
} as const

export const CELEB_AVATAR_SMALL = {
  /** 저장 한 변(px). 실제 표시 크기와 화면 배율에 필요한 해상도를 비교한다 */
  sizePx: SIZE_PX,
  /** 작은 판 WebP 저장 품질 */
  webpQuality: SMALL_WEBP_QUALITY,
  originalFile: CELEB_AVATAR_ORIGINAL.file,
  smallFile: SMALL_FILE,
} as const

/** `celebs/{id}/avatar.webp` 를 같은 자리의 작은 판으로 바꾼다. 캐시 버스터(?v=)는 그대로 둔다. */
const AVATAR_PATH = /^([^?#]*\/celebs\/[^/?#]+\/)avatar\.webp(?=[?#]|$)/

/**
 * 얼굴이 작게 나오는 자리에서 쓸 주소를 만든다.
 * 규칙에 맞지 않는 주소(외부 이미지 등)는 바꾸지 않고 그대로 돌려준다 —
 * 부르는 쪽은 작은 판이 없을 때를 대비해 원래 주소로 되돌릴 수단을 함께 둔다.
 */
export function celebAvatarSmallUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(AVATAR_PATH, `$1${SMALL_FILE}`)
}

// 정사각 원본의 cover 확대는 가로·세로 중 긴 쪽을 기준으로 한다.
export function usesSmallAvatar(width: number, height: number, pixelRatio: number): boolean {
  if (![width, height, pixelRatio].every((value) => Number.isFinite(value) && value > 0)) return false
  return Math.max(width, height) * pixelRatio <= CELEB_AVATAR_SMALL.sizePx
}
