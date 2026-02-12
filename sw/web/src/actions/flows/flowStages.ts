'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addStage(params: { flowId: string; name: string; description?: string; badge_title?: string; theme_color?: string }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', params.flowId)
    .single()

  if (!flow || flow.user_id !== user.id) {
    throw new Error('수정 권한이 없습니다.')
  }

  const { data: maxStage } = await supabase
    .from('flow_stages')
    .select('sort_order')
    .eq('flow_id', params.flowId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxStage?.sort_order ?? -1) + 1

  const { data: stage, error } = await supabase
    .from('flow_stages')
    .insert({
      flow_id: params.flowId,
      name: params.name.trim(),
      description: params.description?.trim() || null,
      sort_order: nextOrder,
      badge_title: params.badge_title?.trim() || null,
      theme_color: params.theme_color || null,
    })
    .select('id')
    .single()

  if (error || !stage) {
    console.error('스테이지 추가 오류:', error)
    throw new Error('스테이지 추가에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading/collections/${params.flowId}`)

  return stage
}

export async function updateStage(params: { stageId: string; name?: string; description?: string; badge_title?: string; theme_color?: string }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: stage } = await supabase
    .from('flow_stages')
    .select('id, flow_id')
    .eq('id', params.stageId)
    .single()

  if (!stage) throw new Error('스테이지를 찾을 수 없습니다')

  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', stage.flow_id)
    .single()

  if (!flow || flow.user_id !== user.id) {
    throw new Error('수정 권한이 없습니다.')
  }

  const updateData: Record<string, unknown> = {}
  if (params.name !== undefined) updateData.name = params.name.trim()
  if (params.description !== undefined) updateData.description = params.description?.trim() || null
  if (params.badge_title !== undefined) updateData.badge_title = params.badge_title?.trim() || null
  if (params.theme_color !== undefined) updateData.theme_color = params.theme_color || null

  const { error } = await supabase
    .from('flow_stages')
    .update(updateData)
    .eq('id', params.stageId)

  if (error) {
    console.error('스테이지 수정 오류:', error)
    throw new Error('스테이지 수정에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading/collections/${stage.flow_id}`)

  return { success: true }
}

export async function deleteStage(stageId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: stage } = await supabase
    .from('flow_stages')
    .select('id, flow_id')
    .eq('id', stageId)
    .single()

  if (!stage) throw new Error('스테이지를 찾을 수 없습니다')

  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', stage.flow_id)
    .single()

  if (!flow || flow.user_id !== user.id) {
    throw new Error('삭제 권한이 없습니다.')
  }

  const { error } = await supabase
    .from('flow_stages')
    .delete()
    .eq('id', stageId)

  if (error) {
    console.error('스테이지 삭제 오류:', error)
    throw new Error('스테이지 삭제에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading/collections/${stage.flow_id}`)

  return { success: true }
}

export async function reorderStages(params: { flowId: string; stageIds: string[] }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: flow } = await supabase
    .from('flows')
    .select('user_id')
    .eq('id', params.flowId)
    .single()

  if (!flow || flow.user_id !== user.id) {
    throw new Error('수정 권한이 없습니다.')
  }

  const updates = params.stageIds.map((stageId, index) =>
    supabase
      .from('flow_stages')
      .update({ sort_order: index })
      .eq('id', stageId)
      .eq('flow_id', params.flowId)
  )

  await Promise.all(updates)

  revalidatePath(`/${user.id}/reading/collections/${params.flowId}`)

  return { success: true }
}
