'use server'

import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'
import { buildSmallAvatar, smallAvatarKey } from '@/lib/avatar-small'
import { CELEB_AVATAR_SMALL } from '@feelandnote/shared/constants/celeb-avatar-small'

// avatar = 얼굴 크롭 800×800(목록·관계도), portrait = 인물 상세 상단 대표 화보(원본 비율)
// 화보 파일명 photo.webp는 일괄 등록 스크립트(scripts/upload-celeb-hero-photo.ts)와 같은 자리다
const CELEB_IMAGE_FILENAMES = {
  avatar: 'avatar.webp',
  portrait: 'photo.webp',
} as const

type CelebImageType = keyof typeof CELEB_IMAGE_FILENAMES

interface UploadCelebImageInput {
  celebId: string
  image: string // base64
  type: CelebImageType
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
  const { celebId, image, type } = input

  const buffer = Buffer.from(image.split(',')[1], 'base64')
  const key = buildKey(celebId, CELEB_IMAGE_FILENAMES[type])

  try {
    await uploadToR2(key, buffer, 'image/webp')
    // 얼굴이 작게 나오는 화면이 쓸 작은 판을 같이 올린다(아바타에만 해당)
    if (type === 'avatar') {
      await uploadToR2(smallAvatarKey(celebId), await buildSmallAvatar(buffer), 'image/webp')
    }
    return { success: true, url: buildPublicUrl(key) }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'R2 upload failed',
    }
  }
}

export async function deleteCelebImages(celebId: string): Promise<void> {
  for (const filename of Object.values(CELEB_IMAGE_FILENAMES)) {
    await deleteFromR2(buildKey(celebId, filename))
  }
  await deleteFromR2(buildKey(celebId, CELEB_AVATAR_SMALL.smallFile))
}

// 대표 화보만 내린다(아바타는 그대로 둔다)
export async function deleteCelebPortrait(celebId: string): Promise<void> {
  await deleteFromR2(buildKey(celebId, CELEB_IMAGE_FILENAMES.portrait))
}

// #region 세력도감(faction) 이미지
// R2 폴더. spotlight → faction 이전 완료.
const FACTION_FOLDER = 'faction'

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
  const key = `${FACTION_FOLDER}/${tagId}/team/${crypto.randomUUID()}.webp`

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
  const key = `${FACTION_FOLDER}/${tagId}/celeb-${celebId}.webp`

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
  await deleteFromR2(`${FACTION_FOLDER}/${tagId}/celeb-${celebId}.webp`)
}
// #endregion
