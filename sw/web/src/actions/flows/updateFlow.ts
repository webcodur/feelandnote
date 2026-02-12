'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

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
}

export async function updateFlow(params: UpdateFlowParams): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return failure('UNAUTHORIZED')

  // 소유권 확인
  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', params.flowId)
    .single()

  if (!flow || flow.user_id !== user.id) {
    return failure('FORBIDDEN')
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

  const { error } = await supabase
    .from('flows')
    .update(updateData)
    .eq('id', params.flowId)

  if (error) {
    return handleSupabaseError(error, { context: 'flow', logPrefix: '[플로우 수정]' })
  }

  revalidatePath(`/${user.id}/reading/collections`)
  revalidatePath(`/${user.id}/reading/collections/${params.flowId}`)

  return success(null)
}
