'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface StageInput {
  name: string
  description?: string
  badge_title?: string
  theme_color?: string
  contentIds: string[]  // 해당 스테이지에 들어갈 콘텐츠 ID 배열
}

interface CreateFlowParams {
  name: string
  description?: string
  isPublic?: boolean
  difficulty?: number
  estimatedDuration?: number
  themeColors?: { primary: string; secondary: string }
  stages: StageInput[]  // 최소 1개 스테이지 필수
}

interface CreateFlowData {
  flowId: string
}

export async function createFlow(params: CreateFlowParams): Promise<ActionResult<CreateFlowData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return failure('UNAUTHORIZED')

  if (!params.name.trim()) {
    return failure('VALIDATION_ERROR', '플로우 제목을 입력해주세요.')
  }

  if (params.stages.length === 0) {
    return failure('INVALID_INPUT', '최소 1개 이상의 스테이지가 필요합니다.')
  }

  // 전체 콘텐츠 수 확인
  const totalNodes = params.stages.reduce((sum, s) => sum + s.contentIds.length, 0)
  if (totalNodes === 0) {
    return failure('INVALID_INPUT', '최소 1개 이상의 콘텐츠를 추가해주세요.')
  }

  // 1. Flow 생성
  const { data: flow, error: flowError } = await supabase
    .from('flows')
    .insert({
      user_id: user.id,
      name: params.name.trim(),
      description: params.description?.trim() || null,
      is_public: params.isPublic ?? false,
      difficulty: params.difficulty || null,
      estimated_duration: params.estimatedDuration || null,
      theme_colors: params.themeColors || { primary: '#d4af37', secondary: '#8a732a' },
    })
    .select('id')
    .single()

  if (flowError || !flow) {
    return handleSupabaseError(flowError!, { context: 'flow', logPrefix: '[플로우 생성]' })
  }

  // 2. Stage + Node 일괄 생성
  for (let si = 0; si < params.stages.length; si++) {
    const stageInput = params.stages[si]

    const { data: stage, error: stageError } = await supabase
      .from('flow_stages')
      .insert({
        flow_id: flow.id,
        name: stageInput.name.trim(),
        description: stageInput.description?.trim() || null,
        sort_order: si,
        badge_title: stageInput.badge_title?.trim() || null,
        theme_color: stageInput.theme_color || null,
      })
      .select('id')
      .single()

    if (stageError || !stage) {
      // 롤백
      await supabase.from('flows').delete().eq('id', flow.id)
      return handleSupabaseError(stageError!, { context: 'flow', logPrefix: '[스테이지 생성]' })
    }

    // 노드 생성
    if (stageInput.contentIds.length > 0) {
      const nodes = stageInput.contentIds.map((contentId, ni) => ({
        flow_id: flow.id,
        stage_id: stage.id,
        content_id: contentId,
        sort_order: ni,
      }))

      const { error: nodesError } = await supabase
        .from('flow_nodes')
        .insert(nodes)

      if (nodesError) {
        await supabase.from('flows').delete().eq('id', flow.id)
        return handleSupabaseError(nodesError, { context: 'flow', logPrefix: '[노드 생성]' })
      }
    }
  }

  revalidatePath(`/${user.id}/reading/collections`)

  return success({ flowId: flow.id })
}
