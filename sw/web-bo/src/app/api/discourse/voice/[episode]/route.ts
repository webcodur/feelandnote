import { NextResponse } from 'next/server'
import { listDiscourseVoices } from '@/lib/discourse-paths'
import { guardDiscourseRoute } from '@/lib/discourse-route'
import { paramToFolder } from '@/lib/discourse-edit-route'

/**
 * GET /api/discourse/voice/{에피소드}
 *
 * 에피소드 voice/ 폴더의 발언 wav 목록(파일명·크기·길이)을 돌려준다.
 * 편집기가 이 목록을 발언 배열과 대조해 **음원 자리가 밀렸는지** 잡는다(`vnVerify`).
 *
 * 담화는 현재 음원이 0개다 — 목록은 빈 배열로 온다. 음성 착수 전에 창구만 먼저 세워 둔다.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardDiscourseRoute()
  if (denied) return denied

  const { episode } = await params
  const files = await listDiscourseVoices(paramToFolder(episode))
  return NextResponse.json(
    { files },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
