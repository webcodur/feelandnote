// 이미지 리사이징 유틸리티 (클라이언트용)

const IMAGE_SIZES = {
  avatar: { width: 100, height: 100 },
  portrait: { width: 675, height: 1200 },
} as const

export type ImageType = 'avatar' | 'portrait'

// 비율 유지 중앙 크롭 + 리사이징하여 webp base64 반환
function resizeToBase64(source: ImageBitmap, targetWidth: number, targetHeight: number): Promise<string> {
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
  const size = IMAGE_SIZES[type]
  const result = await resizeToBase64(imageBitmap, size.width, size.height)
  imageBitmap.close()
  return result
}
