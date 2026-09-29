/**
 * gemini-tts.ts — Gemini 미리듣기 합성 공통 코어 (web-bo 라우트 4곳 공용)
 *
 * `api/{faction,[series]}/voice/{gemini,gemini-v3}/preview` 라우트가 공유한다.
 * 키 풀 규약은 @feelandnote/shared/lib/gemini-keys, 모델은 shared/lib/voice-policy.
 * 무료 키만 쓴다 — 유료 경로 금지.
 */
import { GoogleGenAI } from '@google/genai'
import { googleFreeApiKeys } from '@feelandnote/shared/lib/gemini-keys'
import { wrapPcmAsWav, unwrapWavToPcm } from '@feelandnote/shared/lib/pcm-wav'
import { isGemini38Tts } from '@feelandnote/shared/lib/voice-policy'

export { wrapPcmAsWav }

export function googleFreeKeyCount(): number {
  return googleFreeApiKeys().length
}

export type GeminiPreviewResult =
  | { ok: true; pcm: Buffer; keyIndex: number }
  | { ok: false; error: string }

/**
 * 단일 텍스트 합성 — 요청 1건당 키 로테이션 상태 1벌.
 * 429/403/만료(400)는 다음 키로 순환, 500은 같은 키로 재시도, 빈 응답은 재시도.
 * 환경변수 GEMINI_START_KEY (1-based)로 시작 키 지정 가능.
 */
export async function synthesizeGeminiPreview(opts: {
  model: string
  voiceName: string
  text: string
  /** 발화 지시 — ≤3.1은 텍스트 prefix로, 3.8은 speechMetadata로 적용된다 */
  style?: string
}): Promise<GeminiPreviewResult> {
  const API_KEYS = googleFreeApiKeys()
  if (API_KEYS.length === 0) return { ok: false, error: 'GOOGLE_GENAI_API_KEY_FREE* 환경변수 미설정' }

  const startKeyIndex = parseInt(process.env.GEMINI_START_KEY ?? '1', 10) - 1
  let keyIndex = Math.max(0, Math.min(startKeyIndex, API_KEYS.length - 1))
  let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
  let keyRetries = API_KEYS.length - 1
  let retries = 5

  // 3.8: verbatim transcript — style은 speechMetadata. SDK 1.x는 part 필드를 화이트리스트로
  // 직렬화해 speechMetadata를 지우므로 raw REST로 호출한다. 응답은 WAV(RIFF)라 PCM을 벗겨낸다.
  const is38 = isGemini38Tts(opts.model)

  while (true) {
    try {
      if (is38) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${API_KEYS[keyIndex]}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: opts.text, ...(opts.style ? { speechMetadata: { style: opts.style } } : {}) }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voiceName } } },
            },
          }),
        })
        if (!res.ok) {
          const msg = (await res.text()).slice(0, 300)
          const err = new Error(msg) as Error & { status?: number }
          err.status = res.status
          throw err
        }
        const j = await res.json()
        const data = j.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
        if (!data) {
          if (retries-- > 0) { await new Promise(r => setTimeout(r, 2000)); continue }
          return { ok: false, error: '빈 응답 — 재시도 횟수 초과' }
        }
        return { ok: true, pcm: unwrapWavToPcm(Buffer.from(data, 'base64')).pcm, keyIndex: keyIndex + 1 }
      }
      const response = await ai.models.generateContent({
        model: opts.model,
        contents: [{ parts: [{ text: opts.style ? `${opts.style}: ${opts.text}` : opts.text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voiceName } } },
        },
      })
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (!data) {
        if (retries-- > 0) { await new Promise(r => setTimeout(r, 2000)); continue }
        return { ok: false, error: '빈 응답 — 재시도 횟수 초과' }
      }
      return { ok: true, pcm: Buffer.from(data, 'base64'), keyIndex: keyIndex + 1 }
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
      return { ok: false, error: msg }
    }
  }
}
