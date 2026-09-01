import { updateCeleb } from '@/actions/admin/celebs'
import { deleteCelebAwakenedImage, uploadCelebImage } from '@/actions/admin/storage'
import { resizeSingleImage } from '@/lib/image'

export async function saveCelebAwakenedImage(
  celebId: string,
  file: File,
  revalidateAdminRoutes = true
): Promise<string> {
  const resized = await resizeSingleImage(file, 'awakened')
  const uploaded = await uploadCelebImage({ celebId, image: resized, type: 'awakened' })

  if (!uploaded.success || !uploaded.url) {
    throw new Error(uploaded.error || '각성 이미지 업로드에 실패했습니다.')
  }

  await updateCeleb(
    { id: celebId, awakened_image_url: uploaded.url },
    { revalidateAdminRoutes }
  )
  return uploaded.url
}

export async function removeCelebAwakenedImage(
  celebId: string,
  revalidateAdminRoutes = true
): Promise<void> {
  await updateCeleb(
    { id: celebId, awakened_image_url: '' },
    { revalidateAdminRoutes }
  )
  await deleteCelebAwakenedImage(celebId)
}
