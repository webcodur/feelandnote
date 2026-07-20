import { getJob } from '@/lib/jobs'
import { listOutputRuns } from '@/lib/output-files'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Context) {
  const job = await getJob((await params).id)
  if (!job) return NextResponse.json({ message: '작업을 찾지 못했습니다.' }, { status: 404 })
  return NextResponse.json({ runs: await listOutputRuns(job) })
}
