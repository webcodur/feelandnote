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

// #region 스포트라이트(기획전) 이미지
const SPOTLIGHT_FOLDER = 'spotlight'

interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

function decodeBase64Image(image: string): Buffer {
  return Buffer.from(image.split(',')[1], 'base64')
}

// R2 공개 URL에서 키 추출 (쿼리스트링 제거)
function keyFromPublicUrl(url: string): string | null {
  const prefix = `${R2_PUBLIC_URL}/`
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length).split('?')[0]
}

// 단체 이미지 업로드 (테마당 여러 장, 고유 키)
export async function uploadTagTeamImage(input: {
  tagId: string
  image: string // base64
}): Promise<UploadResult> {
  const { tagId, image } = input
  const key = `${SPOTLIGHT_FOLDER}/${tagId}/team/${crypto.randomUUID()}.webp`

  try {
    await uploadToR2(key, decodeBase64Image(image), 'image/webp')
    return { success: true, url: buildPublicUrl(key) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'R2 upload failed' }
  }
}

// 단체 이미지 삭제 (공개 URL 기준)
export async function deleteTagTeamImage(url: string): Promise<void> {
  const key = keyFromPublicUrl(url)
  if (key) await deleteFromR2(key)
}

// 인물 전용 화보 업로드 (인물당 1장, 고정 키 덮어쓰기)
export async function uploadTagCelebImage(input: {
  tagId: string
  celebId: string
  image: string // base64
}): Promise<UploadResult> {
  const { tagId, celebId, image } = input
  const key = `${SPOTLIGHT_FOLDER}/${tagId}/celeb-${celebId}.webp`

  try {
    await uploadToR2(key, decodeBase64Image(image), 'image/webp')
    return { success: true, url: buildPublicUrl(key) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'R2 upload failed' }
  }
}

// 인물 전용 화보 삭제
export async function deleteTagCelebImage(input: { tagId: string; celebId: string }): Promise<void> {
  const { tagId, celebId } = input
  await deleteFromR2(`${SPOTLIGHT_FOLDER}/${tagId}/celeb-${celebId}.webp`)
}
// #endregion
