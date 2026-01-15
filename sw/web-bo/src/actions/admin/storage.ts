'use server'

import { createAdminClient } from '@/lib/supabase/admin'

// #region Types
interface UploadCelebImageInput {
  celebId: string
  smImage: string // base64
  mdImage: string // base64
}

interface UploadCelebImageResult {
  success: boolean
  avatarUrl?: string
  portraitUrl?: string
  error?: string
}

interface UploadSingleImageInput {
  celebId: string
  image: string // base64
  type: 'avatar' | 'portrait'
}

interface UploadSingleImageResult {
  success: boolean
  url?: string
  error?: string
}
// #endregion

// #region Constants
const BUCKET_NAME = 'avatars'
const CELEB_FOLDER = 'celebs'
// #endregion

// #region uploadCelebImages
export async function uploadCelebImages(
  input: UploadCelebImageInput
): Promise<UploadCelebImageResult> {
  const adminClient = createAdminClient()
  const { celebId, smImage, mdImage } = input

  // base64 → Buffer 변환
  const smBuffer = Buffer.from(smImage.split(',')[1], 'base64')
  const mdBuffer = Buffer.from(mdImage.split(',')[1], 'base64')

  const smPath = `${CELEB_FOLDER}/${celebId}/sm.webp`
  const mdPath = `${CELEB_FOLDER}/${celebId}/md.webp`

  // 기존 이미지 삭제 (있으면)
  await adminClient.storage.from(BUCKET_NAME).remove([smPath, mdPath])

  // 새 이미지 업로드
  const [smResult, mdResult] = await Promise.all([
    adminClient.storage.from(BUCKET_NAME).upload(smPath, smBuffer, {
      contentType: 'image/webp',
      upsert: true,
    }),
    adminClient.storage.from(BUCKET_NAME).upload(mdPath, mdBuffer, {
      contentType: 'image/webp',
      upsert: true,
    }),
  ])

  if (smResult.error || mdResult.error) {
    return {
      success: false,
      error: smResult.error?.message || mdResult.error?.message,
    }
  }

  // Public URL 생성
  const { data: smUrlData } = adminClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(smPath)
  const { data: mdUrlData } = adminClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(mdPath)

  return {
    success: true,
    avatarUrl: smUrlData.publicUrl,
    portraitUrl: mdUrlData.publicUrl,
  }
}
// #endregion

// #region deleteCelebImages
export async function deleteCelebImages(celebId: string): Promise<void> {
  const adminClient = createAdminClient()

  const smPath = `${CELEB_FOLDER}/${celebId}/avatar.webp`
  const mdPath = `${CELEB_FOLDER}/${celebId}/portrait.webp`

  await adminClient.storage.from(BUCKET_NAME).remove([smPath, mdPath])
}
// #endregion

// #region uploadCelebImage (개별 이미지)
export async function uploadCelebImage(
  input: UploadSingleImageInput
): Promise<UploadSingleImageResult> {
  const adminClient = createAdminClient()
  const { celebId, image, type } = input

  const buffer = Buffer.from(image.split(',')[1], 'base64')
  const filename = type === 'avatar' ? 'avatar.webp' : 'portrait.webp'
  const path = `${CELEB_FOLDER}/${celebId}/${filename}`

  // 기존 이미지 삭제 후 업로드
  await adminClient.storage.from(BUCKET_NAME).remove([path])

  const { error } = await adminClient.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType: 'image/webp',
    upsert: true,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const { data } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(path)
  return { success: true, url: data.publicUrl }
}
// #endregion
