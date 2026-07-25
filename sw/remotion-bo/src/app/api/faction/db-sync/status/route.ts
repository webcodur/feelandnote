import { NextResponse } from 'next/server'
import { buildStatus } from '@/lib/faction-sync/diff'
import { missingSupabaseEnv } from '@/lib/faction-sync/supabase'

/**
 * 출간 진단 — GET ?episode=<에피소드>
 *
 * 로컬 팩션 데이터(세력·인물·사진)를 본서비스 DB·R2 기록과 대조해 읽기 전용으로 보고한다.
 * 아무것도 쓰지 않는다. 응답 형태는 lib/faction-sync/types.ts 의 FactionSyncStatus.
 */
export async function GET(req: Request) {
  const episode = new URL(req.url).searchParams.get('episode')?.trim()
  if (!episode) return NextResponse.json({ error: 'episode 필요' }, { status: 400 })

  const missing = missingSupabaseEnv()
  if (missing.length) {
    return NextResponse.json({ error: `Supabase 환경변수 누락: ${missing.join(', ')}` }, { status: 500 })
  }

  try {
    return NextResponse.json(await buildStatus(episode))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 에피소드 데이터가 없으면 요청 잘못, 그 밖(DB 연결·조회 실패)은 전역 실패
    const notFound = /ENOENT|no such file/i.test(msg)
    return NextResponse.json(
      { error: notFound ? `에피소드를 찾을 수 없습니다: ${episode}` : msg },
      { status: notFound ? 404 : 500 },
    )
  }
}
