'use server'

import { createClient } from '@/lib/supabase/server'

// 사용자가 저장한 콘텐츠의 ID 목록만 가져온다 (가벼운 조회)
export async function getMyContentIds(): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // egress-allow: 본인 서재 ID 목록 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (content_id만 송출)
  const { data, error } = await supabase
    .from('member_contents')
    .select('content_id')
    .eq('member_id', user.id)

  if (error) {
    console.error('콘텐츠 ID 조회 에러:', error)
    return []
  }

  return data?.map((item) => item.content_id) || []
}

// 여러 콘텐츠의 저장 상태를 한 번에 확인 (배치 조회)
// 비로그인 시 null 반환 (빈 Set과 구분)
export async function checkContentsSaved(contentIds: string[]): Promise<Set<string> | null> {
  if (contentIds.length === 0) return new Set()

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // egress-allow: 본인 보유 여부 배치 확인 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (content_id만 송출)
  const { data, error } = await supabase
    .from('member_contents')
    .select('content_id')
    .eq('member_id', user.id)
    .in('content_id', contentIds)

  if (error || !data) return new Set()

  return new Set(data.map((item) => item.content_id))
}
