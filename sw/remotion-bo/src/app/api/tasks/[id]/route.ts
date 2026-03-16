import { NextResponse } from 'next/server'
import { getTask } from '@/lib/server-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = getTask(id)
  return task ? NextResponse.json(task) : NextResponse.json({ error: 'not found' }, { status: 404 })
}
