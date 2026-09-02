'use server'

// egress-allow: flows는 공개 or 본인 RLS — 본인 비공개 플로우가 섞여 anon 전환 불가
import { createClient } from '@/lib/db/server'
import type { FlowWithStages, FlowStage, FlowStageWithNodes, FlowNode, FlowNodeWithContent, ContentType } from '@/types/database'

// select 문자열에 대응하는 조인 행 타입
interface NodeLocaleRow {
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  description: string | null
}

interface NodeContentRow {
  id: string
  type: ContentType
  external_id: string | null
  subtype: string | null
  release_date: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  content_locales?: NodeLocaleRow[]
}

interface FlowNodeQueryRow extends FlowNode {
  content: NodeContentRow | null
}

export async function getFlow(flowId: string): Promise<FlowWithStages> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()

  // 플로우 기본 정보 조회
  const { data: flow, error: flowError } = await db
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
  const { data: stages, error: stagesError } = await db
    .from('flow_stages')
    .select('*')
    .eq('flow_id', flowId)
    .order('sort_order', { ascending: true })

  if (stagesError) {
    console.error('스테이지 조회 에러:', stagesError)
    throw new Error('스테이지를 불러오는데 실패했습니다')
  }

  // 노드 조회 (콘텐츠 정보 포함)
  const { data: nodes, error: nodesError } = await db
    .from('flow_nodes')
    .select(`
      *,
      content:contents(id, type, external_id, subtype, release_date, metadata, created_at, content_locales(locale, title, creator, thumbnail_url, description))
    `)
    .eq('flow_id', flowId)
    .order('sort_order', { ascending: true })

  if (nodesError) {
    console.error('노드 조회 에러:', nodesError)
    throw new Error('노드를 불러오는데 실패했습니다')
  }

  // content_locales를 flat하게 resolve
  const nodeRows: FlowNodeQueryRow[] = nodes || []
  const typedNodes = nodeRows.map((node) => {
    if (!node.content) return node
    const locales = node.content.content_locales || []
    const ko = locales.find((l) => l.locale === 'ko')
    const en = locales.find((l) => l.locale === 'en')
    return {
      ...node,
      content: {
        ...node.content,
        title: ko?.title || en?.title || '',
        creator: ko?.creator || en?.creator || null,
        thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null,
        description: ko?.description || en?.description || null,
        publisher: null,
      },
    }
  }) as FlowNodeWithContent[]

  // 스테이지별로 노드 그룹핑
  const stageRows: FlowStage[] = stages || []
  const stagesWithNodes: FlowStageWithNodes[] = stageRows.map(stage => ({
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
