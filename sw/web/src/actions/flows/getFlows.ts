'use server'

// egress-allow: flows는 공개 or 본인 RLS — 본인 비공개 플로우가 섞여 anon 전환 불가
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/db/server'
import { flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import type { Flow, FlowSummary } from '@/types/database'

interface StageNodeRow {
  content: { id: string; type: string | null; content_locales: ContentLocaleRow[] } | null
}

interface StageRow {
  nodes: StageNodeRow[]
}

interface FlowQueryRow extends Flow {
  flow_stages: { count: number }[]
  flow_nodes: { count: number }[]
  stages: StageRow[]
}

export async function getFlows(targetUserId?: string): Promise<FlowSummary[]> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  const userId = targetUserId || user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const isOwner = user?.id === userId

  let query = db
    .from('flows')
    .select(`
      *,
      flow_stages(count),
      flow_nodes(count),
      stages:flow_stages(
        nodes:flow_nodes(
          content:contents(id, type, content_locales(locale, title, creator, thumbnail_url))
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

  const rows: FlowQueryRow[] = data || []
  const locale = await getLocale()

  return rows.map((flow) => ({
    ...flow,
    stage_count: flow.flow_stages?.[0]?.count || 0,
    node_count: flow.flow_nodes?.[0]?.count || 0,
    stages: (flow.stages || []).map((stage) => ({
      ...stage,
      nodes: (stage.nodes || []).map((node) => {
        return {
          ...node,
          // content_id는 NOT NULL FK라 조인 결과가 비지 않는다. null 분기는 방어 코드.
          content: (node.content ? {
            ...node.content,
            thumbnail_url: flattenLocales(node.content.content_locales, locale, node.content.type).thumbnail_url,
          } : null)!,
        }
      }),
    })),
  }))
}
