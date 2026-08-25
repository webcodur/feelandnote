/**
 * 관리 창구의 공통 진입 검사 — 서버 전용. 관리자 확인만 한다.
 *
 * ⚠ 이 앱에는 미들웨어가 없다. 즉 `/api/**` 는 화면과 달리 **아무도 막아주지 않는다.**
 *   그래서 라우트마다 첫 줄에서 이 함수를 부른다. 통과하면 null, 막히면 그대로 돌려줄 응답이 나온다.
 *
 * `guardFactionRoute()` 와의 차이: 저쪽은 렌더 저장소의 파일을 만지므로 로컬 자산 창구
 * 켜짐(`FACTION_LOCAL=1`)까지 함께 확인한다. 이쪽은 DB·외부 API 만 다루고 로컬 파일과
 * 무관하므로 그 확인을 뺀다 — 배포 환경에서도 관리자면 써야 한다.
 * 관리자 판정 규칙(로그인 + role admin|super_admin)은 `faction-route.ts`·`faction-db.ts` 와 같다.
 */

import { NextResponse } from 'next/server'
import { createClient } from './supabase/server'

export async function guardAdminRoute(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }
  return null
}
