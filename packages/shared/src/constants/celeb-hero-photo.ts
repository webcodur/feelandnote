/**
 * 인물 상세 상단 대표사진 규격의 유일한 코드 원천.
 * 화면, 백오피스 크롭, 저장 스크립트는 숫자를 복제하지 않고 이 값을 사용한다.
 */
const ASPECT_WIDTH = 4
const ASPECT_HEIGHT = 5
const DESKTOP_WIDTH_PX = 240
const STORAGE_WIDTH_PX = 1080

export const CELEB_HERO_PHOTO_SPEC = {
  aspectWidth: ASPECT_WIDTH,
  aspectHeight: ASPECT_HEIGHT,
  aspectRatio: ASPECT_WIDTH / ASPECT_HEIGHT,
  aspectLabel: `${ASPECT_WIDTH}:${ASPECT_HEIGHT}`,
  desktopWidthPx: DESKTOP_WIDTH_PX,
  desktopHeightPx: Math.round(DESKTOP_WIDTH_PX * ASPECT_HEIGHT / ASPECT_WIDTH),
  storageWidthPx: STORAGE_WIDTH_PX,
  storageHeightPx: STORAGE_WIDTH_PX * ASPECT_HEIGHT / ASPECT_WIDTH,
} as const
