'use server'

import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'

// #region Types
interface UploadCelebImageInput {
  celebId: string
  smImage: string // base64
  mdImage: string // base64
}

interface UploadCelebImageResult {
  success: boolean
  avatarUrl?: string
  error?: string
}

interface UploadSingleImageInput {
  celebId: string
  image: string // base64
  type: 'avatar'
}

interface UploadSingleImageResult {
  success: boolean
  url?: string
  error?: string
}
// #endregion

// #region Constants
const CELEB_FOLDER = 'celebs'
// #endregion

function buildKey(celebId: string, filename: string): string {
  return `${CELEB_FOLDER}/${celebId}/${filename}`
}

function buildPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
}

// #region uploadCelebImages
export async function uploadCelebImages(
  input: UploadCelebImageInput
): Promise<UploadCelebImageResult> {
  const { celebId, smImage, mdImage } = input

  const smBuffer = Buffer.from(smImage.split(',')[1], 'base64')
  const mdBuffer = Buffer.from(mdImage.split(',')[1], 'base64')

  const smKey = buildKey(celebId, 'sm.webp')
  const mdKey = buildKey(celebId, 'md.webp')

  try {
    await Promise.all([
      uploadToR2(smKey, smBuffer, 'image/webp'),
      uploadToR2(mdKey, mdBuffer, 'image/webp'),
    ])

    return {
      success: true,
      avatarUrl: buildPublicUrl(smKey),
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'R2 upload failed',
    }
  }
}
// #endregion

// #region deleteCelebImages
export async function deleteCelebImages(celebId: string): Promise<void> {
  const key = buildKey(celebId, 'avatar.webp')
  await deleteFromR2(key)
}
// #endregion

// #region uploadCelebImage (개별 이미지)
export async function uploadCelebImage(
  input: UploadSingleImageInput
): Promise<UploadSingleImageResult> {
  const { celebId, image } = input

  const buffer = Buffer.from(image.split(',')[1], 'base64')
  const key = buildKey(celebId, 'avatar.webp')

  try {
    await uploadToR2(key, buffer, 'image/webp')
    return { success: true, url: buildPublicUrl(key) }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'R2 upload failed',
    }
  }
}
// #endregion
