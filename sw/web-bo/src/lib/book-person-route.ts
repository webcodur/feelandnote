import { NextResponse } from 'next/server'
import { remotionLocalGuard } from './remotion-local'
import { createClient } from './supabase/server'

export async function guardBookPersonRoute(): Promise<NextResponse | null> {
  const off = remotionLocalGuard()
  if (off) return off

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
