import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { VOICE_DIR } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, fileName, base64 } = await req.json()
  if (!episode || !fileName || !base64) {
    return NextResponse.json({ success: false, error: 'episode, fileName, base64 required' }, { status: 400 })
  }

  try {
    const filePath = path.join(VOICE_DIR, episode, fileName)
    await mkdir(path.dirname(filePath), { recursive: true })
    const buf = Buffer.from(base64, 'base64')
    await writeFile(filePath, buf)
    return NextResponse.json({ success: true, bytes: buf.length })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
