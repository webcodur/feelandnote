import { NextResponse } from 'next/server'
import { runTask } from '@/lib/server-utils'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'

function guard(series: string) {
  return isValidSeries(series) && isFactionSeries(series)
}

/**
 * POST : 세력도 인물 대사 음성 생성 트리거.
 *   pnpm voice:faction -- --episode <name> [--engine <gemini|gemini-v3>] [--normalize] [--only <file>] [--force]
 * 를 백그라운드 task(runTask)로 실행한다. 진행 상태는 /api/tasks(TaskPanel)로 조회.
 *
 * body: { episode: string, engine?: string, only?: string, normalize?: boolean, force?: boolean }
 *   - engine    : gemini | gemini-v3 (기본 gemini). ElevenLabs 는 CLI 에서 거부.
 *   - only      : 특정 인물 파일명(부분 일치, 예 'F01P01'). 그 인물만 재생성.
 *   - normalize : 라우드니스 균일화. 미지정 시 기본 on.
 *   - force     : 변경 감지 무시하고 전체 재생성.
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, engine, only, normalize, force } = await req.json().catch(() => ({}))
  if (!episode || typeof episode !== 'string') {
    return NextResponse.json({ error: 'episode required' }, { status: 400 })
  }

  const args = ['voice:faction', '--', '--episode', episode]
  if (engine === 'gemini-v3' || engine === 'gemini') args.push('--engine', engine)
  // 라우드니스 균일화 — 미지정(undefined)이면 기본 on, 명시적 false 일 때만 끈다 (메모리 규칙)
  if (normalize !== false) args.push('--normalize')
  if (only && typeof only === 'string') args.push('--only', only)
  if (force) args.push('--force')

  const task = runTask('voice:faction', series, episode, args)
  return NextResponse.json({ taskId: task.id })
}
