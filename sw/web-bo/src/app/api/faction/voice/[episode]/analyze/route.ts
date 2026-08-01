import { NextResponse } from 'next/server'
import { runTaskSequence } from '@feelandnote/shared/bo/task-queue'
import { FACTION_SERIES } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'
import { paramToFolder } from '@/lib/faction-edit-route'

/**
 * POST : 세력도감 음성 정렬 — 받아쓰기 → 발화 시각을 하나의 백그라운드 작업으로 순차 실행한다.
 * 팩션엔 의미 분할 단계가 없다.
 *   pnpm voice:transcribe -- --episode <ep> --faction --lang <lang> [--only <이름>]
 *   pnpm voice:faction-align -- --episode <ep> --lang <lang> [--only <이름>]
 *
 * body: { only?: string, lang?: 'ko' | 'en' }
 *   - only : 특정 인물 이름(부분 일치, 예 'F01P01'). 비우면 전체(무거움).
 *   - lang : 산출물 언어. 기본 ko. 팩션 음원은 ko 기준이므로 대개 ko.
 */
export async function POST(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })
  const ep = paramToFolder(episode)

  const { only, lang } = await req.json().catch(() => ({}))
  const locale = lang === 'en' ? 'en' : 'ko'
  const onlyKey = only && typeof only === 'string' ? only.replace(/\.wav$/i, '') : null

  const transcribeArgs = ['voice:transcribe', '--', '--episode', ep, '--faction', '--lang', locale]
  const alignArgs = ['voice:faction-align', '--', '--episode', ep, '--lang', locale]
  if (onlyKey) {
    transcribeArgs.push('--only', onlyKey)
    alignArgs.push('--only', onlyKey)
  }

  const task = runTaskSequence('voice:faction', FACTION_SERIES, ep, [transcribeArgs, alignArgs])
  return NextResponse.json({ taskId: task.id })
}
