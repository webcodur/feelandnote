'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { tierContentIds, validateContentReferences } from '@/lib/content-reference-validation'

interface UpdateFlowParams {
  flowId: string
  name?: string
  description?: string
  coverUrl?: string | null
  isPublic?: boolean
  difficulty?: number | null
  estimatedDuration?: number | null
  themeColors?: { primary: string; secondary: string } | null
  completionMessage?: string | null
  hasTiers?: boolean
  tiers?: Record<string, string[]> | null
  expectedUpdatedAt?: string | null
  expectedTiers?: Record<string, string[]> | null
  expectedHasTiers?: boolean | null
}

export async function updateFlow(params: UpdateFlowParams): Promise<ActionResult<null>> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return failure('UNAUTHORIZED')

  // 소유권 확인
  const { data: flow, error: flowError } = await db
    .from('flows')
    .select('user_id, updated_at, tiers, has_tiers')
    .eq('id', params.flowId)
    .maybeSingle()

  if (flowError) {
    return handleDatabaseError(flowError, { context: 'flow', logPrefix: '[플로우 조회]' })
  }
  if (!flow) return failure('NOT_FOUND')

  if (flow.user_id !== user.id) {
    return failure('FORBIDDEN')
  }

  const changesTiers = params.tiers !== undefined || params.hasTiers !== undefined
  if (changesTiers && (params.expectedUpdatedAt === undefined || params.expectedTiers === undefined || params.expectedHasTiers === undefined)) {
    return failure('CONFLICT', '편집한 목록의 원본 정보가 없습니다. 최신 목록을 다시 열어주세요.')
  }
  if (params.expectedUpdatedAt !== undefined && params.expectedUpdatedAt !== flow.updated_at) {
    return failure('CONFLICT', '목록이 다른 곳에서 수정되었습니다. 현재 편집 내용을 보관하고 최신 목록을 확인해주세요.')
  }
  if (changesTiers && (tierContentIds(params.expectedTiers) === null || (params.expectedHasTiers !== null && typeof params.expectedHasTiers !== 'boolean'))) {
    return failure('VALIDATION_ERROR', '티어 원본 정보가 올바르지 않습니다.')
  }

  const updateData: Record<string, unknown> = {}

  if (params.name !== undefined) {
    if (!params.name.trim()) return failure('VALIDATION_ERROR', '플로우 제목을 입력해주세요.')
    updateData.name = params.name.trim()
  }
  if (params.description !== undefined) updateData.description = params.description?.trim() || null
  if (params.coverUrl !== undefined) updateData.cover_url = params.coverUrl
  if (params.isPublic !== undefined) updateData.is_public = params.isPublic
  if (params.difficulty !== undefined) updateData.difficulty = params.difficulty
  if (params.estimatedDuration !== undefined) updateData.estimated_duration = params.estimatedDuration
  if (params.themeColors !== undefined) updateData.theme_colors = params.themeColors
  if (params.completionMessage !== undefined) updateData.completion_message = params.completionMessage
  if (params.hasTiers !== undefined) updateData.has_tiers = params.hasTiers
  if (params.tiers !== undefined) updateData.tiers = params.tiers

  if (params.tiers !== undefined) {
    const ids = tierContentIds(params.tiers)
    if (ids === null) return failure('VALIDATION_ERROR', '티어에 올바른 작품 ID를 넣어주세요.')
    const validation = await validateContentReferences(db, ids)
    if (!validation.valid) {
      if (validation.reason === 'lookup-error') {
        return handleDatabaseError(validation.error, { context: 'flow', logPrefix: '[티어 작품 확인]' })
      }
      return failure('VALIDATION_ERROR', '통합되었거나 삭제된 작품이 목록에 있습니다. 현재 편집 내용을 보관하고 최신 목록을 확인해주세요.')
    }
  }

  if (!Object.keys(updateData).length) return success(null)
  updateData.updated_at = new Date().toISOString()
  let query = db
    .from('flows')
    .update(updateData)
    .eq('id', params.flowId)
    .eq('user_id', user.id)
  query = flow.updated_at === null ? query.is('updated_at', null) : query.eq('updated_at', flow.updated_at)
  if (changesTiers) {
    // The merge script may change tiers without changing updated_at.
    query = params.expectedTiers === null ? query.is('tiers', null) : query.eq('tiers', JSON.stringify(params.expectedTiers))
    query = params.expectedHasTiers === null ? query.is('has_tiers', null) : query.eq('has_tiers', params.expectedHasTiers)
  }
  const { data: saved, error } = await query.select('id').maybeSingle()

  if (error) {
    return handleDatabaseError(error, { context: 'flow', logPrefix: '[플로우 수정]' })
  }
  if (!saved) return failure('CONFLICT', '목록이 다른 곳에서 수정되었습니다. 현재 편집 내용을 보관하고 최신 목록을 확인해주세요.')

  revalidatePath(`/${user.id}/reading/collections`)
  revalidatePath(`/${user.id}/reading/collections/${params.flowId}`)

  return success(null)
}
