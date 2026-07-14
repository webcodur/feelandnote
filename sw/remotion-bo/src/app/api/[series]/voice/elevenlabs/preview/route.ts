import { NextResponse } from 'next/server'
import { isValidSeries } from '@/lib/series-registry'
import { getEleAccounts, resolveEleAccountForVoice } from '@feelandnote/shared/lib/ele-accounts'

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { voiceId, text, settings, accountId } = await req.json()
  if (!voiceId || !text) return NextResponse.json({ success: false, error: 'voiceId and text required' }, { status: 400 })

  const id = String(voiceId).trim()
  if (!id) return NextResponse.json({ success: false, error: 'voiceId and text required' }, { status: 400 })

  if (getEleAccounts().length === 0) {
    return NextResponse.json({
      success: false,
      error: 'ElevenLabs API 키가 설정되지 않음 (.env 의 ELEVENLABS_API_KEY / ELEVENLABS_API_KEY_FEELANDNOTE)',
    }, { status: 400 })
  }

  const account = await resolveEleAccountForVoice(id, accountId)
  if (!account) {
    return NextResponse.json({
      success: false,
      error: `해당 음성을 가진 ElevenLabs 계정을 찾지 못함: ${id} (연결된 계정 라이브러리에 없거나, 무료 계정은 라이브러리 음성을 API로 쓸 수 없음)`,
    }, { status: 400 })
  }

  try {
    // MP3 원본 반환 — web-bo와 동일 (pcm_24000은 끝 잘림 발생)
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': account.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      cache: 'no-store',
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
