import { NextResponse } from 'next/server'
import { runTask } from '@/lib/server-utils'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'

function guard(series: string) {
  return isValidSeries(series) && isFactionSeries(series)
}

/**
 * POST : 세력도 인물 대사 음성 생성 트리거.
 *   pnpm voice:faction -- --episode <name> --normalize [--only <file>] [--force]
 * 를 백그라운드 task(runTask)로 실행한다. 진행 상태는 /api/tasks(TaskPanel)로 조회.
 *
 * body: { episode: string, only?: string, force?: boolean }
 *   - only  : 특정 인물 파일명(부분 일치, 예 'F01P01'). 그 인물만 재생성.
 *   - force : 변경 감지 무시하고 전체 재생성.
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, only, force } = await req.json().catch(() => ({}))
  if (!episode || typeof episode !== 'string') {
    return NextResponse.json({ error: 'episode required' }, { status: 400 })
  }

  // 라우드니스 균일화를 위해 --normalize 기본 적용 (메모리 규칙)
  const args = ['voice:faction', '--', '--episode', episode, '--normalize']
  if (only && typeof only === 'string') args.push('--only', only)
  if (force) args.push('--force')

  const task = runTask('voice:faction', series, episode, args)
  return NextResponse.json({ taskId: task.id })
}
