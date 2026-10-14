/** 각성 이미지의 편집·표시·저장 규격. */
const ASPECT_WIDTH = 4
const ASPECT_HEIGHT = 5
const STORAGE_WIDTH_PX = 1080

export const CELEB_AWAKENED_IMAGE_SPEC = {
  aspectRatio: ASPECT_WIDTH / ASPECT_HEIGHT,
  aspectLabel: `${ASPECT_WIDTH}:${ASPECT_HEIGHT}`,
  storageWidthPx: STORAGE_WIDTH_PX,
  storageHeightPx: STORAGE_WIDTH_PX * ASPECT_HEIGHT / ASPECT_WIDTH,
} as const
