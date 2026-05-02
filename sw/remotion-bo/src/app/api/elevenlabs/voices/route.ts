import { NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!

type ElevenVoice = {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string> | null
  preview_url?: string | null
  description?: string | null
}

/**
 * GET /api/elevenlabs/voices
 *
 * 사용자 ElevenLabs 워크스페이스에 등록된 보이스 전체 목록을 반환한다.
 * 응답이 변동될 수 있어 캐시는 짧게(5분) 적용한다.
 */
export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `ElevenLabs ${res.status}: ${err}` }, { status: 502 })
    }
    const data: { voices?: ElevenVoice[] } = await res.json()
    const voices = (data.voices ?? []).map(v => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category ?? null,
      labels: v.labels ?? null,
      preview_url: v.preview_url ?? null,
      description: v.description ?? null,
    }))
    return NextResponse.json({ voices })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
