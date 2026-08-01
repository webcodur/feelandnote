import { NextResponse } from 'next/server'
import { runTask, runTaskSequence } from '@feelandnote/shared/bo/task-queue'
import { FACTION_SERIES } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'

/**
 * POST : 세력도감 인물 대사 음성 생성 트리거.
 *   pnpm voice:faction -- --episode <name> [--engine <gemini|gemini-v3>] [--normalize] [--only <file>] [--force]
 * 를 백그라운드 작업으로 실행한다. 진행 상태는 /api/faction/task 로 조회.
 *
 * body: { episode: string, engine?: string, only?: string, normalize?: boolean, force?: boolean }
 *   - engine    : gemini | gemini-v3 (기본 gemini). ElevenLabs 는 명령 쪽에서 거부한다.
 *   - only      : 특정 인물 파일명(부분 일치, 예 'F01P01'). 그 인물만 재생성.
 *   - normalize : 음량 균일화. 미지정 시 기본 켬.
 *   - force     : 변경 감지 무시하고 전체 재생성.
 */
export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode, engine, only, normalize, force, normalizeOnly, thenAlign, lang } =
    await req.json().catch(() => ({}))
  if (!episode || typeof episode !== 'string') {
    return NextResponse.json({ error: 'episode required' }, { status: 400 })
  }

  const args = ['voice:faction', '--', '--episode', episode]
  if (normalizeOnly) {
    // 생성 없이 voice/ 의 모든 wav(ElevenLabs 포함) 음량 일괄 균일화만
    args.push('--normalize-only')
  } else {
    if (engine === 'gemini-v3' || engine === 'gemini') args.push('--engine', engine)
    // 음량 균일화 — 미지정(undefined)이면 기본 켬, 명시적 false 일 때만 끈다
    if (normalize !== false) args.push('--normalize')
    if (only && typeof only === 'string') args.push('--only', only)
    if (force) args.push('--force')
  }

  // 「정렬까지 수행」 토글: 특정 인물(only) 생성 직후 받아쓰기·발화시각 정렬을 같은 작업으로
  // 이어 실행한다. 팩션엔 의미 분할(chunk)이 없다. 정렬 산출물은 ko 기준(음원이 ko 기준).
  if (thenAlign && only && typeof only === 'string' && !normalizeOnly) {
    const locale = lang === 'en' ? 'en' : 'ko'
    const onlyKey = only.replace(/\.wav$/i, '')
    const transcribeArgs = ['voice:transcribe', '--', '--episode', episode, '--faction', '--lang', locale, '--only', onlyKey]
    const alignArgs = ['voice:faction-align', '--', '--episode', episode, '--lang', locale, '--only', onlyKey]
    const task = runTaskSequence('voice:faction', FACTION_SERIES, episode, [args, transcribeArgs, alignArgs])
    return NextResponse.json({ taskId: task.id })
  }

  const task = runTask('voice:faction', FACTION_SERIES, episode, args)
  return NextResponse.json({ taskId: task.id })
}
