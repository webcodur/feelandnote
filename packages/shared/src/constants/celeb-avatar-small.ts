/**
 * 아바타 작은 판(avatar-sm.webp)의 유일한 코드 원천.
 *
 * 원본 아바타는 800×800 한 장뿐이라(레티나 3x 대응) 얼굴이 지름 40px 안팎으로 나오는 화면에서도
 * 800px을 그대로 받는다. 그런 얼굴이 한 화면에 수백 개 깔리면 브라우저가 그림 준비를 감당하지
 * 못해 자리가 빈 채로 남는다. 작은 판은 그 화면들만 쓰는 별도 파일이며, 원본은 손대지 않는다.
 *
 * 파일 생성: sw/web-bo/scripts/generate-celeb-avatar-sm.ts
 */
const SIZE_PX = 96
const ORIGINAL_FILE = 'avatar.webp'
const SMALL_FILE = 'avatar-sm.webp'

/** 이 크기 이하로 보이는 자리는 작은 판을 쓴다. 96 ÷ 48 이라 고해상도 화면 2배까지 또렷하다. */
const MAX_DISPLAY_PX = 48

export const CELEB_AVATAR_SMALL = {
  /** 저장 한 변(px). 표시 크기 40px 안팎을 고해상도 화면 2~3배까지 감당한다 */
  sizePx: SIZE_PX,
  /** 작은 판을 쓸 표시 크기 상한(px) */
  maxDisplayPx: MAX_DISPLAY_PX,
  originalFile: ORIGINAL_FILE,
  smallFile: SMALL_FILE,
} as const

/** `celebs/{id}/avatar.webp` 를 같은 자리의 작은 판으로 바꾼다. 캐시 버스터(?v=)는 그대로 둔다. */
const AVATAR_PATH = /(\/celebs\/[^/]+\/)avatar\.webp/

/**
 * 얼굴이 작게 나오는 자리에서 쓸 주소를 만든다.
 * 규칙에 맞지 않는 주소(외부 이미지 등)는 바꾸지 않고 그대로 돌려준다 —
 * 부르는 쪽은 작은 판이 없을 때를 대비해 원래 주소로 되돌릴 수단을 함께 둔다.
 */
export function celebAvatarSmallUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(AVATAR_PATH, `$1${SMALL_FILE}`)
}

/** `sizes`가 `"40px"`처럼 고정 한 값일 때만 숫자를 뽑는다. 화면 폭에 따라 달라지는 표기는 판단하지 않는다. */
const FIXED_PX = /^\s*(\d+(?:\.\d+)?)px\s*$/

export function fixedDisplayPx(sizes: string | null | undefined): number | null {
  const matched = sizes?.match(FIXED_PX)
  return matched ? Number(matched[1]) : null
}

/** 표시 크기를 알 수 없으면 원본을 쓴다 — 큰 자리에 작은 판을 넣어 흐려지는 쪽이 더 나쁘다. */
export function usesSmallAvatar(sizes: string | null | undefined): boolean {
  const px = fixedDisplayPx(sizes)
  return px !== null && px <= MAX_DISPLAY_PX
}
