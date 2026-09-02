'use server'

import { createClient } from '@/lib/db/server'

// 플로우 저장
export async function saveFlow(flowId: string): Promise<void> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: flow, error: flowError } = await db
    .from('flows')
    .select('user_id, is_public')
    .eq('id', flowId)
    .single()

  if (flowError || !flow) throw new Error('플로우를 찾을 수 없습니다')
  if (flow.user_id === user.id) throw new Error('본인의 플로우는 저장할 수 없습니다')
  if (!flow.is_public) throw new Error('비공개 플로우입니다')

  const { error } = await db
    .from('saved_flows')
    .upsert({ user_id: user.id, flow_id: flowId }, { onConflict: 'user_id,flow_id' })

  if (error) {
    console.error('플로우 저장 실패:', error)
    throw new Error('저장에 실패했습니다')
  }
}

// 플로우 저장 해제
export async function unsaveFlow(flowId: string): Promise<void> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await db
    .from('saved_flows')
    .delete()
    .eq('user_id', user.id)
    .eq('flow_id', flowId)

  if (error) {
    console.error('저장 해제 실패:', error)
    throw new Error('저장 해제에 실패했습니다')
  }
}

// 플로우 저장 여부 확인
export async function checkFlowSaved(flowId: string): Promise<boolean> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return false

  const { data, error } = await db
    .from('saved_flows')
    .select('id')
    .eq('user_id', user.id)
    .eq('flow_id', flowId)
    .maybeSingle()

  if (error) return false
  return !!data
}
