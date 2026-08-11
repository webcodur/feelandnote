// 이미지 리사이징 유틸리티 (클라이언트용)

import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'

// quality — 이 프로그램에서 그림을 압축하는 마지막 지점이다. 앞 단계(크롭)는 무손실로 넘어온다.
// 아바타 0.95는 규격 SSoT(docs/project/celeb/celeb-avatar-spec.md §6)가 정한 값이며 서버 등록 경로와 같다.
const IMAGE_SIZES = {
  avatar: { width: 800, height: 800, quality: 0.95 },  // 1:1 정사각 (원형 아바타, 레티나 3x 대응)
  faction: { width: 1080, height: 1080, quality: 0.85 },  // 1:1 정사각 (세력도감 단체샷·전용 화보)
} as const

export type ImageType = 'avatar' | 'faction'

// 비율 유지 중앙 크롭 + 리사이징하여 webp base64 반환
function resizeToBase64(source: ImageBitmap, targetWidth: number, targetHeight: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')!

    // 타겟 비율에 맞춰 중앙 크롭
    const targetRatio = targetWidth / targetHeight
    const sourceRatio = source.width / source.height

    let srcX = 0, srcY = 0, srcW = source.width, srcH = source.height

    if (sourceRatio > targetRatio) {
      // 원본이 더 넓음 → 좌우 크롭
      srcW = source.height * targetRatio
      srcX = (source.width - srcW) / 2
    } else {
      // 원본이 더 높음 → 상하 크롭
      srcH = source.width / targetRatio
      srcY = (source.height - srcH) / 2
    }

    ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight)
    resolve(canvas.toDataURL('image/webp', quality))
  })
}

/**
 * base64 이미지 미리보기 URL 생성 (이미 base64면 그대로 반환)
 */
export function createPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

/** Return the first image file from a paste event without consuming text pastes. */
export function getClipboardImageFile(event: ClipboardEvent): File | null {
  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) return file
  }

  return Array.from(event.clipboardData?.files ?? [])
    .find((file) => file.type.startsWith('image/')) ?? null
}

// 대표 화보(celebs.portrait_url) 긴 변 상한. 편집기에서 정한 공용 비율 구도를 추가 크롭 없이 줄인다.
const PORTRAIT_MAX_EDGE = CELEB_HERO_PHOTO_SPEC.storageHeightPx

/**
 * 대표 화보용 축소. 공용 상수 비율의 편집 결과를 유지하며, 원본이 작으면 확대하지 않는다.
 * 실제 구도 선택은 CelebPortraitEditor에서 끝내고 여기서는 압축만 한 번 수행한다.
 * (아바타는 얼굴 중앙 크롭 800×800 — resizeSingleImage 쪽)
 */
export async function resizePortraitImage(file: File): Promise<string> {
  const source = await createImageBitmap(file)
  const scale = Math.min(1, PORTRAIT_MAX_EDGE / Math.max(source.width, source.height))
  const width = Math.round(source.width * scale)
  const height = Math.round(source.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(source, 0, 0, width, height)
  source.close()

  return canvas.toDataURL('image/webp', 0.88)
}

/**
 * 단일 이미지를 지정 타입에 맞게 리사이징하여 webp base64로 반환
 */
export async function resizeSingleImage(file: File, type: ImageType): Promise<string> {
  const imageBitmap = await createImageBitmap(file)
  const size = IMAGE_SIZES[type]
  const result = await resizeToBase64(imageBitmap, size.width, size.height, size.quality)
  imageBitmap.close()
  return result
}
