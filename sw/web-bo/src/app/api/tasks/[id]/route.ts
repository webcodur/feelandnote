import { NextResponse } from 'next/server'
import { getTask, cancelTask } from '@feelandnote/shared/bo/task-queue'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = getTask(id)
  return task ? NextResponse.json(task) : NextResponse.json({ error: 'not found' }, { status: 404 })
}

/** 진행/대기 중인 작업을 중단한다 — 자식 프로세스 트리까지 강제 종료. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = cancelTask(id)
  return ok ? NextResponse.json({ cancelled: id }) : NextResponse.json({ error: 'not cancellable' }, { status: 404 })
}
