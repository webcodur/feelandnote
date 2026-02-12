'use server'

import { createClient } from '@/lib/supabase/server'

interface FlowInfo {
  id: string
  name: string
}

// 특정 content_id가 포함된 사용자의 플로우 조회
export async function getFlowsContainingContent(contentId: string): Promise<FlowInfo[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('flow_nodes')
    .select(`
      flow:flows!inner(id, name, user_id)
    `)
    .eq('content_id', contentId)
    .eq('flows.user_id', user.id)

  if (error) {
    console.error('플로우 조회 에러:', error)
    return []
  }

  const flowMap = new Map<string, FlowInfo>()
  data?.forEach((item) => {
    const flow = item.flow as unknown as { id: string; name: string; user_id: string }
    if (flow && !flowMap.has(flow.id)) {
      flowMap.set(flow.id, { id: flow.id, name: flow.name })
    }
  })

  return Array.from(flowMap.values())
}

// 여러 content_id가 포함된 플로우 일괄 조회
export async function getFlowsContainingContents(contentIds: string[]): Promise<FlowInfo[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || contentIds.length === 0) return []

  const { data, error } = await supabase
    .from('flow_nodes')
    .select(`
      flow:flows!inner(id, name, user_id)
    `)
    .in('content_id', contentIds)
    .eq('flows.user_id', user.id)

  if (error) {
    console.error('플로우 조회 에러:', error)
    return []
  }

  const flowMap = new Map<string, FlowInfo>()
  data?.forEach((item) => {
    const flow = item.flow as unknown as { id: string; name: string; user_id: string }
    if (flow && !flowMap.has(flow.id)) {
      flowMap.set(flow.id, { id: flow.id, name: flow.name })
    }
  })

  return Array.from(flowMap.values())
}
