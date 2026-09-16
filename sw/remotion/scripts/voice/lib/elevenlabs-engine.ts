/**
 * lib/elevenlabs-engine.ts — ElevenLabs TTS 저수준 호출 (단일 원천)
 *
 * 계정 선택은 shared/lib/ele-accounts, 기본값은 shared/bo/voice-utils 의
 * ELEVENLABS_TTS_DEFAULTS를 쓴다. 여기서는 fetch + MP3→PCM 변환만 하고
 * 태그 검증·wav 저장·들숨 정리는 각 파이프라인 래퍼가 담당한다.
 *
 * 유료 API — 사용자 지시 뒤에만 호출한다.
 */
import { spawn } from 'node:child_process'
import { resolveEleAccountForVoice } from '@feelandnote/shared/lib/ele-accounts'
import { ELEVENLABS_TTS_DEFAULTS } from '@feelandnote/shared/bo/voice-utils'

/** ElevenLabs TTS → MP3 Buffer. 계정 해소 실패·HTTP 오류는 throw. */
export async function fetchElevenlabsMp3(text: string, voiceId: string): Promise<Buffer> {
  const account = await resolveEleAccountForVoice(voiceId)
  if (!account) throw new Error(`해당 음성을 가진 ElevenLabs 계정을 찾지 못함: ${voiceId}`)

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': account.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_TTS_DEFAULTS.modelId,
      voice_settings: {
        stability: ELEVENLABS_TTS_DEFAULTS.stability,
        similarity_boost: ELEVENLABS_TTS_DEFAULTS.similarity_boost,
        style: ELEVENLABS_TTS_DEFAULTS.style,
      },
      speed: ELEVENLABS_TTS_DEFAULTS.speed,
    }),
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

/** MP3 buffer → 24kHz mono 16-bit PCM buffer (saveWav 입력 형태). 시스템 ffmpeg 필요. */
export function mp3ToPcm24k(mp3: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 's16le', '-ar', '24000', '-ac', '1',
      'pipe:1',
    ])
    const chunks: Buffer[] = []
    let stderr = ''
    ff.stdout.on('data', d => chunks.push(d as Buffer))
    ff.stderr.on('data', d => { stderr += d.toString() })
    ff.on('close', code => {
      if (code !== 0) reject(new Error(`ffmpeg(MP3→PCM) ${code}: ${stderr.slice(0, 500)}`))
      else resolve(Buffer.concat(chunks))
    })
    ff.stdin.write(mp3)
    ff.stdin.end()
  })
}
