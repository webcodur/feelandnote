/**
 * 가상 담화 제작 데이터 DB 접근 — 서버 전용.
 *
 * 담화 3테이블은 RLS 로 admin 전용이고, 원자 저장 함수(`discourse_replace_episode`)는 service_role
 * 에게만 실행 권한이 있다(설계 §3). 그래서 이 파일은 service role 클라이언트를 쓴다 —
 * **RLS 를 우회하므로 호출 전에 반드시 `requireDiscourseAdmin()` 으로 사람을 확인한다.**
 * 화면 진입은 (admin)/layout.tsx 가 막지만 서버 액션은 주소만 알면 따로 불릴 수 있다.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { DiscourseRowSource } from '@feelandnote/shared/lib/discourse-assemble'

/** 관리자 확인 — 로그인 + 활성 관리자 계정. 아니면 던진다 */
export async function requireDiscourseAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) {
    throw new Error('관리자 권한이 필요합니다')
  }
  return { userId: user.id }
}

/** service role 클라이언트 — 조용한 폴백 금지: 키가 없으면 즉시 던진다 */
export function discourseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL 없음')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 없음')
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}

/**
 * 조립기(`assembleDiscourseEpisode`)가 요구하는 행 공급자.
 * 청크 끊기·정렬·절단 감시는 조립기가 하므로 여기서는 한 번 긁어오기만 한다.
 * 실패는 던진다 — 빈 배열로 돌려주면 발언이 사라진 것을 성공으로 오인한다.
 */
export function discourseRowSource(db: SupabaseClient): DiscourseRowSource {
  return async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
}

/**
 * 한 왕복 로드 — 에피소드와 그 아래 인물·발언을 PostgREST 중첩 임베드로 한 번에 받아
 * 메모리에서 공급한다. 직렬 3왕복(리전이 싱가포르라 왕복당 200~550ms)을 1왕복으로 줄인다.
 * 조립기 계약(DiscourseRowSource)은 그대로라 조립·정렬·검증 로직은 아무것도 모른 채 빨라진다.
 *
 * 규모 상한: 최대 편이 인물 4·발언 21이라 임베드 행수 제약과 무관하다.
 */
export async function discourseTreeSource(db: SupabaseClient, folder: string): Promise<DiscourseRowSource> {
  const { data, error } = await db
    .from('discourse_episodes')
    .select('*, discourse_speakers(*), discourse_turns(*)')
    .eq('folder', folder)
  if (error) throw new Error(`discourse_episodes 트리 조회 실패(${folder}): ${error.message}`)

  const episodes: Record<string, unknown>[] = []
  const speakers: Record<string, unknown>[] = []
  const turns: Record<string, unknown>[] = []
  for (const epRaw of (data ?? []) as Record<string, unknown>[]) {
    const {
      discourse_speakers: sp, discourse_turns: tn, ...ep
    } = epRaw as {
      discourse_speakers?: Record<string, unknown>[]
      discourse_turns?: Record<string, unknown>[]
    } & Record<string, unknown>
    episodes.push(ep)
    speakers.push(...(sp ?? []))
    turns.push(...(tn ?? []))
  }
  const byTable: Record<string, Record<string, unknown>[]> = {
    discourse_episodes: episodes,
    discourse_speakers: speakers,
    discourse_turns: turns,
  }
  return async (table, col, values) => {
    const rows = byTable[table]
    if (!rows) throw new Error(`트리 공급자가 모르는 테이블: ${table}`)
    const want = new Set(values)
    return rows.filter(r => want.has(r[col] as never))
  }
}
