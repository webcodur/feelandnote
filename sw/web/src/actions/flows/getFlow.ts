'use server'

import { createClient } from '@/lib/supabase/server'
import type { FlowWithStages, FlowStageWithNodes, FlowNodeWithContent } from '@/types/database'

export async function getFlow(flowId: string): Promise<FlowWithStages> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 플로우 기본 정보 조회
  const { data: flow, error: flowError } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .single()

  if (flowError || !flow) {
    throw new Error('플로우를 찾을 수 없습니다')
  }

  // 비공개 + 비소유자이면 접근 불가
  if (flow.user_id !== user?.id && !flow.is_public) {
    throw new Error('접근 권한이 없습니다')
  }

  // 스테이지 조회 (정렬 순서대로)
  const { data: stages, error: stagesError } = await supabase
    .from('flow_stages')
    .select('*')
    .eq('flow_id', flowId)
    .order('sort_order', { ascending: true })

  if (stagesError) {
    console.error('스테이지 조회 에러:', stagesError)
    throw new Error('스테이지를 불러오는데 실패했습니다')
  }

  // 노드 조회 (콘텐츠 정보 포함)
  const { data: nodes, error: nodesError } = await supabase
    .from('flow_nodes')
    .select(`
      *,
      content:contents(*)
    `)
    .eq('flow_id', flowId)
    .order('sort_order', { ascending: true })

  if (nodesError) {
    console.error('노드 조회 에러:', nodesError)
    throw new Error('노드를 불러오는데 실패했습니다')
  }

  const typedNodes = (nodes || []) as FlowNodeWithContent[]

  // 스테이지별로 노드 그룹핑
  const stagesWithNodes: FlowStageWithNodes[] = (stages || []).map(stage => ({
    ...stage,
    nodes: typedNodes.filter(node => node.stage_id === stage.id)
  }))

  // stage_id가 null인 노드들은 별도 처리 (레거시 호환)
  const orphanNodes = typedNodes.filter(node => !node.stage_id)
  if (orphanNodes.length > 0) {
    stagesWithNodes.push({
      id: '__orphan__',
      flow_id: flowId,
      name: '미분류',
      description: null,
      sort_order: 999,
      badge_title: null,
      badge_icon: null,
      theme_color: null,
      created_at: null,
      nodes: orphanNodes
    })
  }

  return {
    ...flow,
    stages: stagesWithNodes,
    node_count: typedNodes.length
  }
}
