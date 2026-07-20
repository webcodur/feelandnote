import { spawn } from 'node:child_process'
import path from 'node:path'
import { getJob } from '@/lib/jobs'
import { jobDirectory } from '@/lib/paths'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Context) {
  const id = (await params).id
  if (!await getJob(id)) return NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
  const target = new URL(request.url).searchParams.get('target') === 'output'
    ? path.join(jobDirectory(id), 'output')
    : jobDirectory(id)
  const explorer = spawn('C:\\Windows\\explorer.exe', [target], { detached: true, stdio: 'ignore', windowsHide: false })
  explorer.unref()
  return NextResponse.json({ opened: true })
}
