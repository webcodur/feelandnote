'use server'

import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'

interface UploadCelebImageInput {
  celebId: string
  image: string // base64
  type: 'avatar'
}

interface UploadCelebImageResult {
  success: boolean
  url?: string
  error?: string
}

const CELEB_FOLDER = 'celebs'

function buildKey(celebId: string, filename: string): string {
  return `${CELEB_FOLDER}/${celebId}/${filename}`
}

function buildPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
}

export async function uploadCelebImage(
  input: UploadCelebImageInput
): Promise<UploadCelebImageResult> {
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

export async function deleteCelebImages(celebId: string): Promise<void> {
  const key = buildKey(celebId, 'avatar.webp')
  await deleteFromR2(key)
}
