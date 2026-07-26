import { NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { wavDurationSec } from '@feelandnote/shared/bo/episode-store'
import { normalizeWavInPlace } from '@feelandnote/shared/bo/voice-normalize'
import { factionVoiceDir, factionVoiceFilePath } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'
import { paramToFolder } from '@/lib/faction-edit-route'

// ── 세력도 인물 대사 음성 저장 (미리듣기 → 인물 음원 확정)
//
// 음원은 public/factions/{에피소드}/voice/{파일} 에 둔다. 이 창구가 그 자리에 쓴다.
//
// 요청: { file: 'F01C01P01-quote.wav', base64 }
//   - MP3(ElevenLabs 미리듣기) 자동 감지 → ffmpeg 로 WAV(mono 24kHz 16-bit) 변환 후 저장.
//   - WAV(Gemini 미리듣기) 는 그대로 기록.
// 인물 패널에서 미리듣기를 확정할 때 부른다. 실제 합성은 부르는 쪽(브라우저)이 이미 마쳤다.

const execFileAsync = promisify(execFile)

export async function POST(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params
  const { file, base64 } = await req.json().catch(() => ({}))
  if (!file || typeof file !== 'string' || !base64) {
    return NextResponse.json({ success: false, error: 'file, base64 required' }, { status: 400 })
  }
  if (!/\.wav$/i.test(file)) {
    return NextResponse.json({ success: false, error: 'file must end with .wav' }, { status: 400 })
  }

  try {
    const ep = paramToFolder(episode)
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

    // 음량 균일화 — 저장 즉시 맞춘다(엔진별 편차 해소). 원본은 .raw 백업.
    // 실패해도 원본 저장은 유지(균일화는 독립 단계).
    let normalized = false
    try { normalized = await normalizeWavInPlace(filePath) }
    catch (e) { console.error('[faction/voice/save] 음량 균일화 실패(원본 저장은 유지):', e) }

    /**
     * 길이(초)는 균일화 후 wav 기준으로 재서 응답한다.
     * ⚠ 이 값을 사람이 대본에 적어 넣게 만들지 마라 — 음성 길이는 음성 파이프라인 소유다(문서 §7).
     *   DB 반영은 `pnpm faction:durations-pull` 이 wav 실측으로 한다. 응답값은 화면 표시용이다.
     */
    const finalBuf = await readFile(filePath)
    const duration = wavDurationSec(finalBuf)

    return NextResponse.json({ success: true, bytes: buf.length, duration, normalized })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
