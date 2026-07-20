import { NextResponse } from 'next/server'
import { runTaskSequence } from '@/lib/server-utils'
import { isSeriesModel } from '@/lib/series-registry'

function guard(series: string) {
  return isSeriesModel(series, 'faction')
}

/**
 * POST : 세력도 음성 정렬 — 받아쓰기(3-transcribe --faction) → 발화시각(voice:faction-align)을
 * 하나의 백그라운드 작업으로 순차 실행한다. 팩션엔 의미 분할(chunk) 단계가 없다.
 *   pnpm voice:transcribe -- --episode <ep> --faction --lang <lang> [--only <stem>]
 *   pnpm voice:faction-align -- --episode <ep> --lang <lang> [--only <stem>]
 *
 * body: { only?: string, lang?: 'ko' | 'en' }
 *   - only : 특정 인물 stem(부분 일치, 예 'F01P01'). 비우면 전체(무거움).
 *   - lang : 정렬 산출물 언어. 기본 ko. 팩션 음원은 ko 기준이므로 대개 ko.
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const { only, lang } = await req.json().catch(() => ({}))
  const locale = lang === 'en' ? 'en' : 'ko'
  const onlyKey = only && typeof only === 'string' ? only.replace(/\.wav$/i, '') : null

  const transcribeArgs = ['voice:transcribe', '--', '--episode', episode, '--faction', '--lang', locale]
  const alignArgs = ['voice:faction-align', '--', '--episode', episode, '--lang', locale]
  if (onlyKey) {
    transcribeArgs.push('--only', onlyKey)
    alignArgs.push('--only', onlyKey)
  }

  const task = runTaskSequence('voice:faction', series, episode, [transcribeArgs, alignArgs])
  return NextResponse.json({ taskId: task.id })
}
