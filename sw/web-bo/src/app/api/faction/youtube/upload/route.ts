import { NextResponse } from 'next/server'
import { queueTask, cancelTask } from '@feelandnote/shared/bo/task-queue'
import { FACTION_SERIES } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'
// 실행 스크립트(youtube:upload)는 faction-data.json 을 읽는다 — 올리기 직전에 파일을 DB 와 맞춘다.
import { ensureFactionExport } from '@/lib/faction-episode-data'

export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode, type, dry } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  // 올리기 전에 실행 스크립트가 읽는 파일을 DB 와 맞춘다.
  // 막혔으면 옛 제목·설명이 유튜브로 나가므로 시작하지 않는다.
  const blocked = await ensureFactionExport(episode)
  if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })

  const args = ['youtube:upload', '--', '--episode', episode]
  // 세력도감 — CLI 가 별도 진입점으로 위임하도록 시리즈 플래그를 넘긴다.
  args.push('--series', 'faction')
  if (type) args.push('--type', type)
  if (dry) args.push('--dry')
  // 원본에 있던 --lang·--shorts-index·--book-index 는 넘기지 않는다.
  // 세력도감 진입점은 uploadFaction(episode, type, dry) 로만 받아 그 셋을 읽지 않는다
  // (확인: sw/remotion/scripts/youtube/youtube-upload.ts 의 `if (series === 'faction')` 분기).

  const task = queueTask('youtube-upload', FACTION_SERIES, episode, args)
  return NextResponse.json({ taskId: task.id })
}

export async function DELETE(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const ok = cancelTask(taskId)
  if (!ok) return NextResponse.json({ error: 'task not found or not cancellable' }, { status: 404 })
  return NextResponse.json({ cancelled: taskId })
}
