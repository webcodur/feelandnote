import { NextResponse } from 'next/server'
import { collectFactionVoiceHistory } from '@/lib/faction-voice-casting-history'
import { guardAdminRoute } from '@/lib/admin-route'

// 이식 시 추가: 이 앱의 `/api/**` 는 미들웨어가 없어 그냥 열려 있으므로 관리자 확인을 앞에 둔다.

export async function GET() {
  const denied = await guardAdminRoute()
  if (denied) return denied

  try {
    return NextResponse.json(await collectFactionVoiceHistory())
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
