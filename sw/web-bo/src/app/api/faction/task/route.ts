import { NextResponse } from 'next/server'
import { getTasks } from '@feelandnote/shared/bo/task-queue'
import { guardFactionRoute } from '@/lib/faction-route'

/**
 * GET /api/faction/task — 백그라운드 작업 목록(최신 순).
 * 음성 합성·받아쓰기·정렬처럼 오래 걸리는 명령의 진행 로그를 작업 패널이 여기서 긁어간다.
 */
export async function GET() {
  const denied = await guardFactionRoute()
  if (denied) return denied
  return NextResponse.json(getTasks())
}
