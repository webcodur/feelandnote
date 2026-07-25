/**
 * 세력도 제작 데이터 DB 접근 — 서버 전용.
 *
 * 팩션 5테이블은 RLS 로 admin 전용이고, 원자 저장 함수(`faction_replace_episode`)는 service_role
 * 에게만 실행 권한이 있다(문서 §3). 그래서 이 파일은 service role 클라이언트를 쓴다 —
 * **RLS 를 우회하므로 호출 전에 반드시 `requireFactionAdmin()` 으로 사람을 확인한다.**
 * 화면 진입은 (admin)/layout.tsx 가 막지만 서버 액션은 주소만 알면 따로 불릴 수 있다.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { FactionRowSource } from '@feelandnote/shared/lib/faction-assemble'

/** 관리자 확인 — 로그인 + role(admin|super_admin). 아니면 던진다 */
export async function requireFactionAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) {
    throw new Error('관리자 권한이 필요합니다')
  }
  return { userId: user.id }
}

/** service role 클라이언트 — 조용한 폴백 금지: 키가 없으면 즉시 던진다 */
export function factionAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL 없음')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 없음')
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}

/**
 * 조립기(`assembleFactionEpisode`)가 요구하는 행 공급자.
 * 청크 끊기·정렬·절단 감시는 조립기가 하므로 여기서는 한 번 긁어오기만 한다.
 * 실패는 던진다 — 빈 배열로 돌려주면 인물이 사라진 것을 성공으로 오인한다.
 */
export function factionRowSource(db: SupabaseClient): FactionRowSource {
  return async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
}
