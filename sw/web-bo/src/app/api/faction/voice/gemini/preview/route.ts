import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { MODEL_GEMINI_25 } from '@feelandnote/shared/lib/voice-policy'
import { guardFactionRoute } from '@/lib/faction-route'

// ── Gemini 단일 segment 미리듣기 라우트
//
// 요청: { voiceName: 'Sulafat' 등 prebuilt voice 이름, text: 합성 텍스트 (style prefix 포함 가능) }
// 응답: { success, base64 (WAV mono 24kHz 16-bit), bytes, format: 'wav' }
//
// 모델: gemini-2.5-flash-preview-tts (CLI sw/remotion/scripts/voice/2-synthesize/config.ts와 동일)
// 키 로테이션: GOOGLE_GENAI_API_KEY_FREE1..N. 429/403/만료/500 자동 재시도.
// 환경변수 GEMINI_START_KEY (1-based)로 시작 키 지정 가능.
//
// 이식 시 교체: 이 앱의 음성 창구는 세력도 전용이므로 `[series]` 동적 세그먼트와
// 시리즈 유효성 검사(isValidSeries)를 없애고 guardFactionRoute() 진입 검사로 갈음했다.

const MODEL = MODEL_GEMINI_25
const API_KEYS = Array.from({ length: 100 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY_FREE${i + 1}`]).filter(Boolean) as string[]

function wrapPcmAsWav(pcm: Buffer, sr: number, ch: number, bits: number): Buffer {
  const dataLen = pcm.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLen, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(ch, 22)
  header.writeUInt32LE(sr, 24)
  header.writeUInt32LE(sr * ch * (bits / 8), 28)
  header.writeUInt16LE(ch * (bits / 8), 32)
  header.writeUInt16LE(bits, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataLen, 40)
  return Buffer.concat([header, pcm])
}

export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  if (API_KEYS.length === 0) {
    return NextResponse.json({ success: false, error: 'GOOGLE_GENAI_API_KEY_FREE* 환경변수 미설정' }, { status: 500 })
  }

  const { voiceName, text } = await req.json()
  if (!voiceName || !text) {
    return NextResponse.json({ success: false, error: 'voiceName and text required' }, { status: 400 })
  }

  const startKeyIndex = parseInt(process.env.GEMINI_START_KEY ?? '1', 10) - 1
  let keyIndex = Math.max(0, Math.min(startKeyIndex, API_KEYS.length - 1))
  let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
  let keyRetries = API_KEYS.length - 1
  let retries = 5

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      })
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (!data) {
        if (retries-- > 0) { await new Promise(r => setTimeout(r, 2000)); continue }
        return NextResponse.json({ success: false, error: '빈 응답 — 재시도 횟수 초과' })
      }
      const pcm = Buffer.from(data, 'base64')
      const wav = wrapPcmAsWav(pcm, 24000, 1, 16)
      return NextResponse.json({
        success: true,
        base64: wav.toString('base64'),
        bytes: wav.length,
        format: 'wav',
        keyIndex: keyIndex + 1,
      })
    } catch (e: unknown) {
      const status = (e as { status?: number }).status
      const msg = (e as { message?: string }).message ?? String(e)
      if ((status === 429 || status === 403 || (status === 400 && msg.includes('expired'))) && keyRetries-- > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        retries = 5
        continue
      }
      if (status === 500 && retries-- > 0) {
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      return NextResponse.json({ success: false, error: msg })
    }
  }
}
