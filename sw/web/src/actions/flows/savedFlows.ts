'use server'

import { createClient } from '@/lib/supabase/server'
import type { SavedFlowWithDetails, Flow, FlowOwner } from '@/types/database'

interface SavedFlowQueryResult {
  id: string
  saved_at: string
  flow: Flow & {
    flow_nodes: { count: number }[]
    flow_stages: { count: number }[]
    owner: FlowOwner
    stages: { nodes: { content: { thumbnail_url: string | null } }[] }[]
  }
}

// 플로우 저장
export async function saveFlow(flowId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: flow, error: flowError } = await supabase
    .from('flows')
    .select('user_id, is_public')
    .eq('id', flowId)
    .single()

  if (flowError || !flow) throw new Error('플로우를 찾을 수 없습니다')
  if (flow.user_id === user.id) throw new Error('본인의 플로우는 저장할 수 없습니다')
  if (!flow.is_public) throw new Error('비공개 플로우입니다')

  const { error } = await supabase
    .from('saved_flows')
    .upsert({ user_id: user.id, flow_id: flowId }, { onConflict: 'user_id,flow_id' })

  if (error) {
    console.error('플로우 저장 실패:', error)
    throw new Error('저장에 실패했습니다')
  }
}

// 플로우 저장 해제
export async function unsaveFlow(flowId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase
    .from('saved_flows')
    .delete()
    .eq('user_id', user.id)
    .eq('flow_id', flowId)

  if (error) {
    console.error('저장 해제 실패:', error)
    throw new Error('저장 해제에 실패했습니다')
  }
}

// 저장된 플로우 목록 조회
export async function getSavedFlows(): Promise<SavedFlowWithDetails[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data, error } = await supabase
    .from('saved_flows')
    .select(`
      id,
      saved_at,
      flow:flows(
        *,
        flow_nodes(count),
        flow_stages(count),
        owner:profiles!playlists_user_id_fkey(id, nickname, avatar_url),
        stages:flow_stages(
          nodes:flow_nodes(
            content:contents(thumbnail_url)
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (error) {
    console.error('저장된 플로우 조회 실패:', error)
    throw new Error('저장된 플로우를 불러오는데 실패했습니다')
  }

  const results = (data || []) as unknown as any[]

  return results
    .filter((item) => item.flow)
    .map((item): SavedFlowWithDetails => ({
      id: item.id,
      saved_at: item.saved_at,
      flow: {
        ...item.flow,
        node_count: item.flow.flow_nodes?.[0]?.count || 0,
        stage_count: item.flow.flow_stages?.[0]?.count || 0,
        owner: item.flow.owner,
        stages: item.flow.stages?.slice(0, 1) || []
      }
    }))
}

// 플로우 저장 여부 확인
export async function checkFlowSaved(flowId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('saved_flows')
    .select('id')
    .eq('user_id', user.id)
    .eq('flow_id', flowId)
    .maybeSingle()

  if (error) return false
  return !!data
}
