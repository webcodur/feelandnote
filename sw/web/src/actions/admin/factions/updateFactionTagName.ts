'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { checkAdmin } from '@/lib/auth/checkAdmin'
import { createClient } from '@/lib/db/server'
import { failure, handleDatabaseError, success, type ActionResult } from '@/lib/errors'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_NAME_LENGTH = 100

export interface UpdateFactionTagNameInput {
  id: string
  name: string
  name_en?: string | null
}

export interface UpdatedFactionTagName {
  id: string
  name: string
  name_en: string | null
}

export async function updateFactionTagName(
  input: UpdateFactionTagNameInput,
): Promise<ActionResult<UpdatedFactionTagName>> {
  const id = typeof input?.id === 'string' ? input.id.trim() : ''
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  const hasEnglishName = input?.name_en !== undefined
  const nameEn = typeof input?.name_en === 'string' ? input.name_en.trim() : null

  if (!UUID_PATTERN.test(id)) {
    return failure('INVALID_INPUT', '유효하지 않은 팩션입니다.')
  }
  if (!name) {
    return failure('VALIDATION_ERROR', '팩션 이름을 입력해 주세요.')
  }
  if (name.length > MAX_NAME_LENGTH || (nameEn && nameEn.length > MAX_NAME_LENGTH)) {
    return failure('LIMIT_EXCEEDED', `팩션 이름은 ${MAX_NAME_LENGTH}자까지 작성할 수 있습니다.`)
  }

  const db = await createClient()
  const adminCheck = await checkAdmin(db)
  if (!adminCheck.success) return adminCheck

  const updateData: {
    name: string
    name_en?: string | null
    updated_at: string
  } = {
    name,
    updated_at: new Date().toISOString(),
  }
  if (hasEnglishName) updateData.name_en = nameEn

  const { data, error } = await db
    .from('celeb_tags')
    .update(updateData)
    .eq('id', id)
    .select('id, name, name_en')
    .single()

  if (error) {
    return handleDatabaseError(error, { logPrefix: '[팩션 이름 수정]' })
  }

  revalidateTag(CACHE_TAGS.TAGS, { expire: 0 })
  revalidateTag(CACHE_TAGS.CELEBS, { expire: 0 })
  revalidatePath('/explore/faction')
  revalidatePath('/en/explore/faction')

  return success({
    id: data.id,
    name: data.name,
    name_en: data.name_en,
  })
}
