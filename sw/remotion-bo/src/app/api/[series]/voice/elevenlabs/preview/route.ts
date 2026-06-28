import { NextResponse } from 'next/server'
import { isValidSeries } from '@/lib/series-registry'
import { resolveEleAccountForVoice } from '@feelandnote/shared/lib/ele-accounts'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { voiceId, text, settings, accountId } = await req.json()
  if (!voiceId || !text) return NextResponse.json({ success: false, error: 'voiceId and text required' }, { status: 400 })

  const account = await resolveEleAccountForVoice(voiceId, accountId)
  if (!account) {
    return NextResponse.json({ success: false, error: `해당 음성을 가진 ElevenLabs 계정을 찾지 못함: ${voiceId}` }, { status: 400 })
  }

  try {
    // MP3 원본 반환 — web-bo와 동일 (pcm_24000은 끝 잘림 발생)
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': account.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_v3',
        voice_settings: {
          stability: settings?.stability ?? 0.5,
          similarity_boost: settings?.similarity_boost ?? 0.75,
          style: settings?.style ?? 0.3,
        },
        speed: settings?.speed ?? 1.0,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ success: false, error: `ElevenLabs ${res.status}: ${err}` })
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return NextResponse.json({ success: true, base64: buffer.toString('base64'), bytes: buffer.length, format: 'mp3' })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
