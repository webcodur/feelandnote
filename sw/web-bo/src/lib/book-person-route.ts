import { NextResponse } from 'next/server'
import { remotionLocalGuard } from './remotion-local'
import { createClient } from './db/server'

export async function guardBookPersonRoute(): Promise<NextResponse | null> {
  const off = remotionLocalGuard()
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
