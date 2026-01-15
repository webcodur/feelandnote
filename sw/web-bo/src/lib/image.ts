// 이미지 리사이징 유틸리티 (클라이언트용)

const IMAGE_SIZES = {
  avatar: 100,
  portrait: 400,
} as const

export type ImageType = 'avatar' | 'portrait'

/**
 * ImageBitmap을 지정 크기로 리사이징하여 webp base64 반환
 */
function resizeToBase64(source: ImageBitmap, size: number): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')!

    // 중앙 크롭 계산
    const srcSize = Math.min(source.width, source.height)
    const srcX = (source.width - srcSize) / 2
    const srcY = (source.height - srcSize) / 2

    // 그리기 (중앙 크롭 + 리사이즈)
    ctx.drawImage(source, srcX, srcY, srcSize, srcSize, 0, 0, size, size)

    // webp base64로 변환
    resolve(canvas.toDataURL('image/webp', 0.85))
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

/**
 * 단일 이미지를 지정 타입에 맞게 리사이징하여 webp base64로 반환
 */
export async function resizeSingleImage(file: File, type: ImageType): Promise<string> {
  const imageBitmap = await createImageBitmap(file)
  const result = await resizeToBase64(imageBitmap, IMAGE_SIZES[type])
  imageBitmap.close()
  return result
}
