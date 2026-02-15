'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FlowNodeWithContent } from '@/types/database'

// Node 추가
export async function addNode(params: {
  flowId: string;
  stageId: string;
  contentId: string;
  description?: string;
  insertBeforeNodeId?: string;
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  let targetOrder: number

  if (params.insertBeforeNodeId) {
    // 특정 노드 앞에 삽입
    const { data: targetNode } = await supabase
      .from('flow_nodes')
      .select('sort_order')
      .eq('id', params.insertBeforeNodeId)
      .eq('stage_id', params.stageId)
      .single()

    if (targetNode) {
      targetOrder = targetNode.sort_order

      // 해당 위치 이후의 모든 노드들을 조회
      const { data: nodesToShift } = await supabase
        .from('flow_nodes')
        .select('id')
        .eq('stage_id', params.stageId)
        .gte('sort_order', targetOrder)

      // 한 칸씩 뒤로 이동
      if (nodesToShift && nodesToShift.length > 0) {
        const updates = nodesToShift.map((node, index) =>
          supabase
            .from('flow_nodes')
            .update({ sort_order: targetOrder + index + 1 })
            .eq('id', node.id)
        )
        await Promise.all(updates)
      }
    } else {
      // 타겟 노드를 찾지 못하면 맨 끝에 추가
      const { data: maxNode } = await supabase
        .from('flow_nodes')
        .select('sort_order')
        .eq('stage_id', params.stageId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      targetOrder = (maxNode?.sort_order ?? -1) + 1
    }
  } else {
    // 맨 끝에 추가
    const { data: maxNode } = await supabase
      .from('flow_nodes')
      .select('sort_order')
      .eq('stage_id', params.stageId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    targetOrder = (maxNode?.sort_order ?? -1) + 1
  }

  const { data: node, error } = await supabase
    .from('flow_nodes')
    .insert({
      flow_id: params.flowId,
      stage_id: params.stageId,
      content_id: params.contentId,
      sort_order: targetOrder,
      description: params.description?.trim() || null,
    })
    .select(`
      id,
      flow_id,
      stage_id,
      content_id,
      sort_order,
      description,
      difficulty,
      is_optional,
      bonus_content_ids,
      theme_color,
      created_at,
      content:contents!inner(
        id,
        type,
        subtype,
        genre,
        title,
        creator,
        thumbnail_url,
        description,
        publisher,
        release_date,
        metadata,
        created_at
      )
    `)
    .single()

  if (error) {
    console.error('노드 추가 에러:', error)
    throw new Error('노드 추가에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading/collections/${params.flowId}`)

  // Supabase returns content as array for FK join; normalize to single object
  const raw = node as any
  const normalized: FlowNodeWithContent = {
    ...raw,
    content: Array.isArray(raw.content) ? raw.content[0] : raw.content,
  }

  return normalized
}

// Node 삭제
export async function removeNode(nodeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase
    .from('flow_nodes')
    .delete()
    .eq('id', nodeId)

  if (error) {
    console.error('노드 삭제 에러:', error)
    throw new Error('노드 삭제에 실패했습니다')
  }

  return { success: true }
}

// Node 순서 변경 (스테이지 내)
export async function reorderNodes(params: { stageId: string; nodeIds: string[] }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const updates = params.nodeIds.map((nodeId, index) =>
    supabase
      .from('flow_nodes')
      .update({ sort_order: index })
      .eq('id', nodeId)
      .eq('stage_id', params.stageId)
  )

  await Promise.all(updates)

  return { success: true }
}

// Node를 다른 스테이지로 이동
export async function moveNode(params: { nodeId: string; targetStageId: string; sortOrder?: number }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const updateData: Record<string, unknown> = { stage_id: params.targetStageId }
  if (params.sortOrder !== undefined) updateData.sort_order = params.sortOrder

  const { error } = await supabase
    .from('flow_nodes')
    .update(updateData)
    .eq('id', params.nodeId)

  if (error) {
    console.error('노드 이동 에러:', error)
    throw new Error('노드 이동에 실패했습니다')
  }

  return { success: true }
}

// Node 설명/속성 수정
export async function updateNode(params: { nodeId: string; description?: string | null }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: node } = await supabase
    .from('flow_nodes')
    .select('id, flow_id')
    .eq('id', params.nodeId)
    .single()

  if (!node) {
    throw new Error('노드를 찾을 수 없습니다.')
  }

  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', node.flow_id)
    .single()

  if (!flow || flow.user_id !== user.id) {
    throw new Error('수정 권한이 없습니다.')
  }

  const updateData: Record<string, unknown> = {}
  if (params.description !== undefined) {
    updateData.description = params.description?.trim() || null
  }

  const { error } = await supabase
    .from('flow_nodes')
    .update(updateData)
    .eq('id', params.nodeId)

  if (error) {
    console.error('노드 수정 오류:', error)
    throw new Error('노드 수정에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading/collections/${node.flow_id}`)

  return { success: true }
}
