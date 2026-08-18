'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import {
  serializeTeamImages,
  toTeamImages,
  type FactionTeamImage,
} from '@feelandnote/shared/lib/faction-team-image'
import { checkAdmin } from '@/lib/auth/checkAdmin'
import { createClient } from '@/lib/supabase/server'
import { failure, handleSupabaseError, success, type ActionResult } from '@/lib/errors'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface SetFactionCoverImageInput {
  tagId: string
  imageUrl: string
}

export interface UpdatedFactionTeamImages {
  id: string
  team_images: FactionTeamImage[]
}

/**
 * 특정 단체 사진을 맨 앞(0번, 대표 이미지)으로 승격하여 저장합니다.
 */
export async function setFactionCoverImage(
  input: SetFactionCoverImageInput,
): Promise<ActionResult<UpdatedFactionTeamImages>> {
  const tagId = typeof input?.tagId === 'string' ? input.tagId.trim() : ''
  const imageUrl = typeof input?.imageUrl === 'string' ? input.imageUrl.trim() : ''

  if (!UUID_PATTERN.test(tagId)) {
    return failure('INVALID_INPUT', '유효하지 않은 팩션입니다.')
  }
  if (!imageUrl) {
    return failure('VALIDATION_ERROR', '대표로 지정할 사진 주소가 올바르지 않습니다.')
  }

  const supabase = await createClient()
  const adminCheck = await checkAdmin(supabase)
  if (!adminCheck.success) return adminCheck

  // 1. 현재 tag의 team_images를 조회합니다.
  const { data: tag, error: fetchErr } = await supabase
    .from('celeb_tags')
    .select('id, slug, team_images')
    .eq('id', tagId)
    .single()

  if (fetchErr || !tag) {
    return handleSupabaseError(fetchErr, { logPrefix: '[팩션 대표 이미지 조회]' })
  }

  const current = toTeamImages(tag.team_images)
  const targetIndex = current.findIndex((img) => img.url === imageUrl)
  if (targetIndex === -1) {
    return failure('NOT_FOUND', '해당 단체 사진을 찾을 수 없습니다.')
  }

  // 타겟 사진을 맨 앞으로 이동
  const [targetImage] = current.splice(targetIndex, 1)
  const next = [targetImage, ...current]
  const serialized = serializeTeamImages(next)

  const { data, error } = await supabase
    .from('celeb_tags')
    .update({
      team_images: serialized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tagId)
    .select('id, team_images')
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[팩션 대표 이미지 저장]' })
  }

  revalidateTag(CACHE_TAGS.TAGS, { expire: 0 })
  revalidateTag(CACHE_TAGS.CELEBS, { expire: 0 })
  revalidatePath('/explore/faction')
  revalidatePath('/en/explore/faction')
  if (tag.slug) {
    revalidatePath(`/explore/faction/${tag.slug}`)
    revalidatePath(`/en/explore/faction/${tag.slug}`)
  }

  return success({
    id: data.id,
    team_images: toTeamImages(data.team_images),
  })
}

/**
 * 팩션의 전체 단체 사진 목록을 저장합니다.
 */
export async function updateFactionTeamImages(
  tagId: string,
  images: FactionTeamImage[],
): Promise<ActionResult<UpdatedFactionTeamImages>> {
  const id = typeof tagId === 'string' ? tagId.trim() : ''

  if (!UUID_PATTERN.test(id)) {
    return failure('INVALID_INPUT', '유효하지 않은 팩션입니다.')
  }

  const supabase = await createClient()
  const adminCheck = await checkAdmin(supabase)
  if (!adminCheck.success) return adminCheck

  const serialized = serializeTeamImages(images)

  const { data, error } = await supabase
    .from('celeb_tags')
    .update({
      team_images: serialized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, slug, team_images')
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[팩션 단체 사진 갱신]' })
  }

  revalidateTag(CACHE_TAGS.TAGS, { expire: 0 })
  revalidateTag(CACHE_TAGS.CELEBS, { expire: 0 })
  revalidatePath('/explore/faction')
  revalidatePath('/en/explore/faction')
  if (data.slug) {
    revalidatePath(`/explore/faction/${data.slug}`)
    revalidatePath(`/en/explore/faction/${data.slug}`)
  }

  return success({
    id: data.id,
    team_images: toTeamImages(data.team_images),
  })
}
