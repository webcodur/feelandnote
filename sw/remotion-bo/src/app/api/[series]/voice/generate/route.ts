import { NextResponse } from 'next/server'
import { runTask, runTaskSequence } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, engine, role, only, force, updateJson, upload, normalizeOnly, thenAlign } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const args = ['voice', '--', '--episode', episode, '--series', series]
  if (normalizeOnly) {
    // 생성 없이 gemini·elevenlabs 모든 wav 라우드니스 일괄 정규화만
    args.push('--normalize-only')
  } else {
    if (engine) args.push('--engine', engine)
    if (role) args.push('--role', role)
    if (only) args.push('--only', only)
    if (force) args.push('--force')
    if (updateJson !== false) args.push('--update-json')
    if (upload) args.push('--upload')
  }

  // 「정렬까지 수행」 토글: 특정 대상(only) 생성 직후 받아쓰기(3)·발화시각(4)을 같은 작업으로
  // 이어 실행한다. 의미 분할(5-chunk)은 호출하지 않으므로 기존 sub 분할은 보존된다.
  if (thenAlign && only && !normalizeOnly) {
    const m = String(only).match(/shorts-(\d+)[/\\]/)
    const scope = m ? ['--shorts', m[1]] : ['--long']
    const onlyKey = String(only).replace(/^shorts-\d+[/\\]/, '').replace(/\.wav$/i, '')
    // transcribe/align 은 locale 꼬리표(-ko/-en) 필수. 꼬리표 없으면 ko(앱 규약).
    const ep = /-(ko|en)$/.test(String(episode)) ? String(episode) : `${episode}-ko`
    const transcribeArgs = ['voice:transcribe', '--', '--episode', ep, ...scope, '--only', onlyKey]
    const alignArgs = ['voice:align', '--', '--episode', ep, ...scope, '--only', onlyKey, '--update-json']
    const task = runTaskSequence('voice', series, episode, [args, transcribeArgs, alignArgs])
    return NextResponse.json({ taskId: task.id })
  }

  const task = runTask('voice', series, episode, args)
  return NextResponse.json({ taskId: task.id })
}
