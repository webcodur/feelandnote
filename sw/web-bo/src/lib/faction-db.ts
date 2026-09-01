/**
 * 세력도감 제작 데이터 DB 접근 — 서버 전용.
 *
 * 팩션 5테이블은 RLS 로 admin 전용이고, 원자 저장 함수(`faction_replace_episode`)는 service_role
 * 에게만 실행 권한이 있다(문서 §3). 그래서 이 파일은 service role 클라이언트를 쓴다 —
 * **RLS 를 우회하므로 호출 전에 반드시 `requireFactionAdmin()` 으로 사람을 확인한다.**
 * 화면 진입은 (admin)/layout.tsx 가 막지만 서버 액션은 주소만 알면 따로 불릴 수 있다.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { FactionRowSource } from '@feelandnote/shared/lib/faction-assemble'

/** 관리자 확인 — 로그인 + 활성 관리자 계정. 아니면 던진다 */
export async function requireFactionAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) throw new Error('로그인이 필요합니다')
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) {
    throw new Error('관리자 권한이 필요합니다')
  }
  return { userId }
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

/**
 * 한 왕복 로드 — 4계층(에피소드→세력→클러스터→인물)을 PostgREST 중첩 임베드로
 * 한 번에 받아 메모리에서 공급한다. 직렬 4왕복을 1왕복으로 줄인다(왕복당 실측 ≈110ms —
 * 자체 호스팅 db.feelandnote.com, 연결 재사용 기준 26.08.28). 조립기 계약(FactionRowSource)은
 * 그대로라 조립·정렬·검증 로직은 아무것도 모른 채 빨라진다.
 * 규모 상한: 최대 에피소드가 세력 16·인물 87이라 임베드 행수 제약과 무관하다.
 */
export async function factionTreeSource(db: SupabaseClient, folder: string): Promise<FactionRowSource> {
  const { data, error } = await db
    .from('faction_episodes')
    .select('*, faction_groups(*, faction_clusters(*, faction_people(*)))')
    .eq('folder', folder)
  if (error) throw new Error(`faction_episodes 트리 조회 실패(${folder}): ${error.message}`)

  const episodes: Record<string, unknown>[] = []
  const groups: Record<string, unknown>[] = []
  const clusters: Record<string, unknown>[] = []
  const people: Record<string, unknown>[] = []
  for (const epRaw of (data ?? []) as Record<string, unknown>[]) {
    const { faction_groups: gs, ...ep } = epRaw as { faction_groups?: Record<string, unknown>[] } & Record<string, unknown>
    episodes.push(ep)
    for (const gRaw of gs ?? []) {
      const { faction_clusters: cs, ...g } = gRaw as { faction_clusters?: Record<string, unknown>[] } & Record<string, unknown>
      groups.push(g)
      for (const cRaw of cs ?? []) {
        const { faction_people: ps, ...c } = cRaw as { faction_people?: Record<string, unknown>[] } & Record<string, unknown>
        clusters.push(c)
        people.push(...(ps ?? []))
      }
    }
  }
  const byTable: Record<string, Record<string, unknown>[]> = {
    faction_episodes: episodes,
    faction_groups: groups,
    faction_clusters: clusters,
    faction_people: people,
  }
  return async (table, col, values) => {
    const rows = byTable[table]
    if (!rows) throw new Error(`트리 공급자가 모르는 테이블: ${table}`)
    const want = new Set(values)
    return rows.filter(r => want.has(r[col] as never))
  }
}
