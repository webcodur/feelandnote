import { NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { factionVoiceDir, factionVoiceFilePath, wavDurationSec } from '@/lib/faction-utils'
import { normalizeWavInPlace } from '@/lib/voice-normalize'

// ── 세력도 인물 대사 음성 저장 라우트 (미리듣기 → 인물 음원 확정)
//
// BookRecommend 의 /voice/save 는 episodes/ 경로(voiceDir)를 쓰므로 세력도엔 맞지 않다.
// 세력도 음원은 public/factions/{episode}/voice/{file} 에 둔다. 이 라우트가 그 자리에 쓴다.
//
// 요청: { file: 'F01P01-quote.wav', base64 }
//   - MP3(ElevenLabs preview) 자동 감지 → ffmpeg 로 WAV(mono 24kHz 16-bit) 변환 후 저장.
//   - WAV(Gemini preview) 는 그대로 기록.
// 인물 패널에서 미리듣기를 확정(저장)할 때 호출한다. 실제 합성은 호출 측(브라우저)이 이미 마쳤다.

const execFileAsync = promisify(execFile)

export async function POST(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isValidSeries(series) || !isFactionSeries(series)) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }

  const { file, base64 } = await req.json().catch(() => ({}))
  if (!file || typeof file !== 'string' || !base64) {
    return NextResponse.json({ success: false, error: 'file, base64 required' }, { status: 400 })
  }
  if (!/\.wav$/i.test(file)) {
    return NextResponse.json({ success: false, error: 'file must end with .wav' }, { status: 400 })
  }

  try {
    const ep = decodeURIComponent(episode)
    const filePath = factionVoiceFilePath(ep, file)
    await mkdir(factionVoiceDir(ep), { recursive: true })
    const buf = Buffer.from(base64, 'base64')

    const isMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) // ID3
      || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) // MPEG sync
    if (isMp3) {
      const tmpMp3 = filePath.replace(/\.wav$/i, '.tmp.mp3')
      await writeFile(tmpMp3, buf)
      await execFileAsync('ffmpeg', ['-y', '-i', tmpMp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', filePath])
      await unlink(tmpMp3)
    } else {
      await writeFile(filePath, buf)
    }

    // 라우드니스 정규화 — 저장 즉시 음량 균일화(ElevenLabs 음원 편차 해소). 원본은 .raw 백업.
    // 실패해도 원본 저장은 유지(정규화는 독립 단계).
    let normalized = false
    try { normalized = await normalizeWavInPlace(filePath) }
    catch (e) { console.error('[faction-voice/save] 라우드니스 정규화 실패(원본 저장은 유지):', e) }

    // 길이(초)는 정규화 후 wav 기준으로 측정 → 응답. 호출 측이 인물 quoteDuration 에 기록해
    // 렌더(컷 길이·음성 재생)가 이 음원에 맞춰진다.
    const finalBuf = await readFile(filePath)
    const duration = wavDurationSec(finalBuf)

    return NextResponse.json({ success: true, bytes: buf.length, duration, normalized })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
