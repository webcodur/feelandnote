/**
 * 세력도감 로컬 자산 창구의 공통 진입 검사 — 서버 전용.
 *
 * ⚠ 이 앱에는 미들웨어가 없다. 즉 `/api/**` 는 화면과 달리 **아무도 막아주지 않는다.**
 *   (같은 함정으로 이미지 프록시가 인증 없이 열려 있던 이력이 있다 — AGENTS.md 참조.)
 *   세력도감 창구는 파일을 쓰고 외부 명령까지 돌리므로 더 위험하다. 그래서 라우트마다
 *   `guardFactionRoute()` 를 첫 줄에 둔다. 통과하면 null, 막히면 그대로 돌려줄 응답이 나온다.
 *
 * 두 겹으로 막는다.
 *   1. 로컬 자산 창구가 켜져 있나 (`FACTION_LOCAL=1`) — 아니면 503 + 사유.
 *   2. 관리자인가 — 아니면 401/403.
 */

import { NextResponse } from 'next/server'
import { factionLocalGuard } from './faction-local'
import { createClient } from './supabase/server'

export async function guardFactionRoute(): Promise<NextResponse | null> {
  const off = factionLocalGuard()
  if (off) return off

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_accounts').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }
  return null
}
