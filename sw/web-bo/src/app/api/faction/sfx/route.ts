import { NextResponse } from 'next/server'
import { guardFactionRoute } from '@/lib/faction-route'
import { listSfx } from '@/lib/faction-file-utils'

/** GET : public/common/sfx/ 의 효과음 파일 목록 */
export async function GET() {
  const denied = await guardFactionRoute()
  if (denied) return denied
  return NextResponse.json(await listSfx())
}
