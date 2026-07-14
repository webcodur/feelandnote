import { spawn } from 'node:child_process'
import { getJob } from '@/lib/jobs'
import { jobDirectory } from '@/lib/paths'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function POST(_: Request, { params }: Context) {
  const id = (await params).id
  if (!await getJob(id)) return NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
  const explorer = spawn('C:\\Windows\\explorer.exe', [jobDirectory(id)], { detached: true, stdio: 'ignore', windowsHide: false })
  explorer.unref()
  return NextResponse.json({ opened: true })
}
