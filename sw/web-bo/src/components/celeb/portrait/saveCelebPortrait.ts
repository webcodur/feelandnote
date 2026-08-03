import { updateCeleb } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { resizePortraitImage } from '@/lib/image'

export async function saveCelebPortrait(celebId: string, file: File): Promise<string> {
  const resized = await resizePortraitImage(file)
  const uploaded = await uploadCelebImage({ celebId, image: resized, type: 'portrait' })

  if (!uploaded.success || !uploaded.url) {
    throw new Error(uploaded.error || '대표사진 업로드에 실패했습니다.')
  }

  await updateCeleb({ id: celebId, portrait_url: uploaded.url })
  return uploaded.url
}
