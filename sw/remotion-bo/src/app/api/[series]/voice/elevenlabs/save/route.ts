import { NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { voiceDir } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

const execFileAsync = promisify(execFile)

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, fileName, base64 } = await req.json()
  if (!episode || !fileName || !base64) {
    return NextResponse.json({ success: false, error: 'episode, fileName, base64 required' }, { status: 400 })
  }

  try {
    const filePath = path.join(voiceDir(episode), fileName)
    await mkdir(path.dirname(filePath), { recursive: true })
    const buf = Buffer.from(base64, 'base64')

    // ElevenLabs preview API가 MP3를 반환하므로 WAV로 변환
    const isMp3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33 // ID3 header
      || buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0 // MPEG sync word
    if (isMp3 && filePath.endsWith('.wav')) {
      const tmpMp3 = filePath.replace('.wav', '.tmp.mp3')
      await writeFile(tmpMp3, buf)
      await execFileAsync('ffmpeg', ['-y', '-i', tmpMp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', filePath])
      await unlink(tmpMp3)
    } else {
      await writeFile(filePath, buf)
    }

    return NextResponse.json({ success: true, bytes: buf.length })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
