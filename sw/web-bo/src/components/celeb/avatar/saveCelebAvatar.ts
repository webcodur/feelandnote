import { updateCeleb } from '@/actions/admin/celebs'
import { uploadCelebImage } from '@/actions/admin/storage'
import { resizeSingleImage } from '@/lib/image'

export async function saveCelebAvatar(
  celebId: string,
  file: File,
  revalidateAdminRoutes = true
): Promise<string> {
  const resized = await resizeSingleImage(file, 'avatar')
  const uploaded = await uploadCelebImage({ celebId, image: resized, type: 'avatar' })

  if (!uploaded.success || !uploaded.url) {
    throw new Error(uploaded.error || '아바타 업로드에 실패했습니다.')
  }

  await updateCeleb(
    { id: celebId, avatar_url: uploaded.url },
    { revalidateAdminRoutes }
  )
  return uploaded.url
}
