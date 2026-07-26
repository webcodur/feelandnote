import { NextResponse } from 'next/server'
import { listFactionVoices } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'
import { paramToFolder } from '@/lib/faction-edit-route'

/**
 * GET /api/faction/voice/{에피소드}
 * 에피소드 voice/ 폴더의 인물 대사 wav 목록(파일명·크기·길이)을 돌려준다.
 * 편집기가 인물별 음성 존재 여부·길이를 표시하는 데 쓴다.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  const files = await listFactionVoices(paramToFolder(episode))
  return NextResponse.json(
    { files },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
