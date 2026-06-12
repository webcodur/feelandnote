'use server'

import { createClient } from '@/lib/supabase/server'
import type { SavedFlowWithDetails, Flow, FlowOwner } from '@/types/database'

// select 문자열에 대응하는 조인 행 타입
interface ThumbnailLocale {
  locale: string
  thumbnail_url: string | null
}

interface StageNodeRow {
  content: { id: string; content_locales: ThumbnailLocale[] } | null
}

interface StageRow {
  nodes: StageNodeRow[]
}

interface SavedFlowJoined extends Flow {
  flow_nodes: { count: number }[]
  flow_stages: { count: number }[]
  owner: FlowOwner
  stages: StageRow[]
}

interface SavedFlowQueryResult {
  id: string
  saved_at: string
  // RLS로 flows 행이 숨겨지면 조인 결과가 null이 된다
  flow: SavedFlowJoined | null
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
            content:contents(id, content_locales(locale, thumbnail_url))
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })
    // flow는 다대일 조인이라 실제로는 단일 객체인데 추론은 배열로 잡혀 타입만 교정한다
    .overrideTypes<SavedFlowQueryResult[], { merge: false }>()

  if (error) {
    console.error('저장된 플로우 조회 실패:', error)
    throw new Error('저장된 플로우를 불러오는데 실패했습니다')
  }

  const results = data || []

  return results
    .filter((item): item is SavedFlowQueryResult & { flow: SavedFlowJoined } => !!item.flow)
    .map((item): SavedFlowWithDetails => ({
      id: item.id,
      saved_at: item.saved_at,
      flow: {
        ...item.flow,
        node_count: item.flow.flow_nodes?.[0]?.count || 0,
        stage_count: item.flow.flow_stages?.[0]?.count || 0,
        owner: item.flow.owner,
        stages: (item.flow.stages?.slice(0, 1) || []).map((stage) => ({
          ...stage,
          nodes: (stage.nodes || []).map((node) => {
            const locales = node.content?.content_locales || []
            const ko = locales.find((l) => l.locale === 'ko')
            const en = locales.find((l) => l.locale === 'en')
            return {
              ...node,
              // content_id는 NOT NULL FK라 조인 결과가 비지 않는다. null 분기는 방어 코드.
              content: (node.content ? {
                ...node.content,
                thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null,
              } : null)!,
            }
          }),
        }))
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
