import { NextResponse } from 'next/server'
import { MODEL_GEMINI_31 } from '@feelandnote/shared/lib/voice-policy'
import { cleanVoiceBuffer } from '@feelandnote/shared/bo/voice-cleanup'
import { guardFactionRoute } from '@/lib/faction-route'
import { googleFreeKeyCount, synthesizeGeminiPreview, wrapPcmAsWav } from '@/lib/gemini-tts'

// ── Gemini 3.1 Flash TTS 단일 segment 미리듣기 라우트 (테스트용 별도 엔드포인트)
//
// 요청: { voiceName: 'Sulafat' 등 prebuilt voice 이름, text: 합성 텍스트
//        (style prefix 또는 200+ audio tag 포함 가능, 예: [whispering], [excited]) }
// 응답: { success, base64 (WAV mono 24kHz 16-bit), bytes, format: 'wav', model, keyIndex }
//
// 모델 상수는 shared/lib/voice-policy.ts. 3.1은 200+ audio tag·70+ 언어 지원.
// 합성 코어(무료 키 로테이션·재시도·WAV 헤더)는 lib/gemini-tts.ts 단일 원천.
//
// 이식 시 교체: 이 앱의 음성 창구는 세력도감 전용이므로 `[series]` 동적 세그먼트와
// 시리즈 유효성 검사(isValidSeries)를 없애고 guardFactionRoute() 진입 검사로 갈음했다.

const MODEL = MODEL_GEMINI_31

export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  if (googleFreeKeyCount() === 0) {
    return NextResponse.json({ success: false, error: 'GOOGLE_GENAI_API_KEY_FREE* 환경변수 미설정' }, { status: 500 })
  }

  const { voiceName, text } = await req.json()
  if (!voiceName || !text) {
    return NextResponse.json({ success: false, error: 'voiceName and text required' }, { status: 400 })
  }

  const result = await synthesizeGeminiPreview({ model: MODEL, voiceName, text })
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error })
  }

  // 들숨·쉼 정리(SSoT) — 인물 대사라 dialogue 프로필
  const wav = await cleanVoiceBuffer(wrapPcmAsWav(result.pcm, 24000, 1, 16), 'wav', 'dialogue')
  return NextResponse.json({
    success: true,
    base64: wav.toString('base64'),
    bytes: wav.length,
    format: 'wav',
    model: MODEL,
    keyIndex: result.keyIndex,
  })
}
