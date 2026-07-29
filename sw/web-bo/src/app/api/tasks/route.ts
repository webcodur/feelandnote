import { NextResponse } from 'next/server'
import { getTasks } from '@feelandnote/shared/bo/task-queue'

export async function GET() {
  return NextResponse.json(getTasks())
}
