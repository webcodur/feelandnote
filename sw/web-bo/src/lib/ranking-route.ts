/**
 * 랭킹 로컬 자산 창구의 공통 진입 검사 — 서버 전용.
 *
 * 이 앱에는 미들웨어가 없다. `/api/**` 는 화면과 달리 아무도 막아주지 않는다.
 * proxy matcher가 이미지 확장자로 끝나는 주소를 로그인 검사에서 빼므로
 * 라우트마다 이 함수를 첫 줄에 둔다.
 */

import { NextResponse } from 'next/server'
import { remotionLocalGuard } from './remotion-local'
import { createClient } from './supabase/server'

export async function guardRankingRoute(): Promise<NextResponse | null> {
  const off = remotionLocalGuard()
  if (off) return off

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }
  return null
}
