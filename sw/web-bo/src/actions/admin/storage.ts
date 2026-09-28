'use server'

import sharp from 'sharp'
import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'
import { uploadAvatarVariants } from '@/lib/avatar-small'
import { uploadPortraitVariants } from '@/lib/portrait-variants'
import { encodeFactionTeamDisplay } from '@/lib/faction-team-display'
import { PORTRAIT_DISPLAY, artworkVariantKey } from '@feelandnote/shared/constants/responsive-artwork'
import { CELEB_AVATAR_SMALL, CELEB_AVATAR_MEDIUM } from '@feelandnote/shared/constants/celeb-avatar-small'

// avatar = 얼굴 크롭 800×800(목록·관계도), portrait = 인물 상세 상단 대표 화보(원본 비율)
// awakened = 대표 사진과 별개로 보관하는 각성 이미지. 사용자 화면 사용 방식은 아직 정하지 않았다.
// 화보 파일명 photo.webp는 일괄 등록 스크립트(scripts/upload-celeb-hero-photo.ts)와 같은 자리다
const CELEB_IMAGE_FILENAMES = {
  avatar: 'avatar.webp',
  portrait: 'photo.webp',
  awakened: 'awakened.webp',
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
    // 화면 크기에 맞춰 쓸 중·소를 같이 올린다(아바타에만 해당).
    if (type === 'avatar') {
      await uploadAvatarVariants(celebId, buffer, (variantKey, body) => uploadToR2(variantKey, body, 'image/webp'))
    }
    if (type === 'portrait') {
      await uploadPortraitVariants(key, buffer, (variantKey, body) => uploadToR2(variantKey, body, 'image/webp'))
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
  await deleteFromR2(buildKey(celebId, CELEB_AVATAR_MEDIUM.file))
  for (const width of PORTRAIT_DISPLAY.widths) await deleteFromR2(artworkVariantKey(buildKey(celebId, CELEB_IMAGE_FILENAMES.portrait), width))
}

// 대표 화보만 내린다(아바타는 그대로 둔다)
export async function deleteCelebPortrait(celebId: string): Promise<void> {
  await deleteFromR2(buildKey(celebId, CELEB_IMAGE_FILENAMES.portrait))
  for (const width of PORTRAIT_DISPLAY.widths) await deleteFromR2(artworkVariantKey(buildKey(celebId, CELEB_IMAGE_FILENAMES.portrait), width))
}

// 각성 이미지만 내린다(아바타와 대표 사진은 그대로 둔다)
export async function deleteCelebAwakenedImage(celebId: string): Promise<void> {
  await deleteFromR2(buildKey(celebId, CELEB_IMAGE_FILENAMES.awakened))
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

// 단체·장면 원본을 보관하고, 더 작은 표시용 WebP를 제공한다(원본 비율·해상도 유지).
export async function uploadFactionTeamImage(input: {
  lv2Id: string
  image: string // base64
}): Promise<UploadResult> {
  const { lv2Id, image } = input

  try {
    const body = decodeBase64Image(image)
    const metadata = await sharp(body).metadata()
    const formats = {
      png: { extension: 'png', contentType: 'image/png' },
      jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
      webp: { extension: 'webp', contentType: 'image/webp' },
      gif: { extension: 'gif', contentType: 'image/gif' },
      avif: { extension: 'avif', contentType: 'image/avif' },
    } as const
    const format = metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format
    if (!format || !Object.prototype.hasOwnProperty.call(formats, format)) {
      return { success: false, error: 'PNG, JPEG, WebP, GIF, AVIF 이미지를 등록할 수 있습니다.' }
    }
    const { extension, contentType } = formats[format as keyof typeof formats]
    const key = `${FACTION_FOLDER}/${lv2Id}/team/${crypto.randomUUID()}.${extension}`
    const display = await encodeFactionTeamDisplay(body)
    await uploadToR2(key, body, contentType)
    if (display) {
      const displayKey = key.replace(/\.[^.]+$/, '.display.webp')
      await uploadToR2(displayKey, display, 'image/webp')
      return { success: true, url: buildPublicUrl(displayKey) }
    }
    return { success: true, url: buildPublicUrl(key) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'R2 upload failed' }
  }
}

// 단체 이미지 삭제 (공개 URL 기준)
export async function deleteFactionTeamImage(url: string): Promise<void> {
  const key = keyFromPublicUrl(url)
  if (key) await deleteFromR2(key)
}

// 인물 전용 화보 업로드 (인물당 1장, 고정 키 덮어쓰기)
export async function uploadFactionCelebImage(input: {
  lv2Id: string
  celebId: string
  image: string // base64
}): Promise<UploadResult> {
  const { lv2Id, celebId, image } = input
  const key = `${FACTION_FOLDER}/${lv2Id}/celeb-${celebId}.webp`

  try {
    const body = decodeBase64Image(image)
    await uploadToR2(key, body, 'image/webp')
    await uploadPortraitVariants(key, body, (variantKey, variant) => uploadToR2(variantKey, variant, 'image/webp'))
    return { success: true, url: buildPublicUrl(key) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'R2 upload failed' }
  }
}

// 인물 전용 화보 삭제
export async function deleteFactionCelebImage(input: { lv2Id: string; celebId: string }): Promise<void> {
  const { lv2Id, celebId } = input
  await deleteFromR2(`${FACTION_FOLDER}/${lv2Id}/celeb-${celebId}.webp`)
  for (const width of PORTRAIT_DISPLAY.widths) await deleteFromR2(artworkVariantKey(`${FACTION_FOLDER}/${lv2Id}/celeb-${celebId}.webp`, width))
}
// #endregion
