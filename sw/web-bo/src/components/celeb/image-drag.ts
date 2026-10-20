/** 앱 안의 인물 이미지끼리 주고받는다. 일반 링크 드롭과 구분한다. */
export const CELEB_IMAGE_DRAG_TYPE = 'application/x-feelandnote-celeb-image'

type DragData = Pick<DataTransfer, 'setData' | 'getData'>

export function writeCelebImageDrag(data: DragData, imageSrc: string): void {
  data.setData(CELEB_IMAGE_DRAG_TYPE, imageSrc)
}

export function acceptsCelebImageDrop(types: readonly string[], externalDropType?: string): boolean {
  return types.includes('Files')
    || types.includes(CELEB_IMAGE_DRAG_TYPE)
    || (!!externalDropType && types.includes(externalDropType))
}

/** 미저장 미리보기는 그대로 읽고, R2는 기존 관리자 중계로 CORS 없이 가져온다. */
export async function fetchCelebImage(imageSrc: string): Promise<Blob> {
  const isPreview = imageSrc.startsWith('data:image/') || imageSrc.startsWith('blob:')
  const response = await fetch(isPreview
    ? imageSrc
    : `/api/admin/image-clipboard?url=${encodeURIComponent(imageSrc)}`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error || `이미지 조회 실패: HTTP ${response.status}`)
  }
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('이미지 파일만 사용할 수 있습니다.')
  return blob
}

export async function readCelebImageDrag(data: DragData): Promise<File | null> {
  const imageSrc = data.getData(CELEB_IMAGE_DRAG_TYPE)
  if (!imageSrc) return null
  const blob = await fetchCelebImage(imageSrc)
  return new File([blob], 'image-copy', { type: blob.type })
}
