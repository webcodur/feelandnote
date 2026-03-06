'use server'

import { createClient } from '@/lib/supabase/server'
import type { Flow, FlowSummary } from '@/types/database'

export async function getFlows(targetUserId?: string): Promise<FlowSummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userId = targetUserId || user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const isOwner = user?.id === userId

  let query = supabase
    .from('flows')
    .select(`
      *,
      flow_stages(count),
      flow_nodes(count),
      stages:flow_stages(
        nodes:flow_nodes(
          content:contents(id, content_locales(locale, thumbnail_url))
        )
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  // 타인 조회 시 공개 플로우만
  if (!isOwner) {
    query = query.eq('is_public', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('플로우 조회 에러:', error)
    throw new Error('플로우를 불러오는데 실패했습니다')
  }

  return (data || []).map((flow: any) => ({
    ...flow,
    stage_count: flow.flow_stages?.[0]?.count || 0,
    node_count: flow.flow_nodes?.[0]?.count || 0,
    stages: (flow.stages || []).map((stage: any) => ({
      ...stage,
      nodes: (stage.nodes || []).map((node: any) => {
        const locales = node.content?.content_locales || []
        const ko = locales.find((l: any) => l.locale === 'ko')
        const en = locales.find((l: any) => l.locale === 'en')
        return {
          ...node,
          content: node.content ? {
            ...node.content,
            thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null,
          } : null,
        }
      }),
    })),
  }))
}
