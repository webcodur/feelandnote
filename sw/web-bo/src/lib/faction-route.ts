/**
 * 세력도감 로컬 자산 창구의 공통 진입 검사 — 서버 전용.
 *
 * ⚠ 이 앱에는 미들웨어가 없다. 즉 `/api/**` 는 화면과 달리 **아무도 막아주지 않는다.**
 *   (같은 함정의 배경은 docs/project/apps/web-bo.md 「세력도감」 참조.)
 *   세력도감 창구는 파일을 쓰고 외부 명령까지 돌리므로 더 위험하다. 그래서 라우트마다
 *   `guardFactionRoute()` 를 첫 줄에 둔다. 통과하면 null, 막히면 그대로 돌려줄 응답이 나온다.
 *
 * 두 겹으로 막는다.
 *   1. 로컬 자산 창구가 켜져 있나 (`FACTION_LOCAL=1`) — 아니면 503 + 사유.
 *   2. 관리자인가 — 아니면 401/403.
 */

import { NextResponse } from 'next/server'
import { factionLocalGuard } from './faction-local'
import { createClient } from './db/server'

export async function guardFactionRoute(): Promise<NextResponse | null> {
  const off = factionLocalGuard()
  if (off) return off

  const db = await createClient()
  const { data: claimsData, error: claimsError } = await db.auth.getClaims()
  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { data: isAdmin, error } = await db.rpc('is_admin')
  if (error || !isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }
  return null
}
