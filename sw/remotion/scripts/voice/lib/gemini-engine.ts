/**
 * lib/gemini-engine.ts — Gemini TTS 합성 코어 (단일 원천)
 *
 * BookRecommend(2-synthesize/engines.ts)·BookPerson(book-person/tts.ts)이 공유한다.
 * 키 로테이션·재시도(429/403/만료/500)·WAV 저장·길이 측정이 여기 한 벌만 있다.
 *
 * Google 무료 키(GOOGLE_GENAI_API_KEY_FREE<n>)만 쓴다 — 유료 Gemini·Vertex·Cloud TTS 금지.
 * 모델·시작 키는 각 파이프라인 cli.ts 가 넘긴다(이 모듈은 argv 를 건드리지 않는다).
 */
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import { googleFreeApiKeys } from '@feelandnote/shared/lib/gemini-keys'
import { unwrapWavToPcm } from '@feelandnote/shared/lib/pcm-wav'
import { isGemini38Tts } from '@feelandnote/shared/lib/voice-policy'

// --- API 키 풀 (env 규약은 shared/lib/gemini-keys.ts 단일 원천) ---
const API_KEYS = googleFreeApiKeys()

/** 등록된 무료 키 수 — 스크립트가 합성 전에 키 존재 여부를 미리 검사할 때 쓴다. */
export function googleFreeKeyCount(): number {
  return API_KEYS.length
}

export type GeminiTtsClient = {
  /**
   * model 미지정 시 createGeminiTts 의 기본 모델 사용.
   * text는 verbatim transcript, style은 발화 지시(≤3.1은 텍스트 prefix로, 3.8은 speechMetadata로 적용).
   */
  synthesize: (text: string, voiceName: string, model?: string, style?: string) => Promise<Buffer>
}

/** 키 로테이션 상태를 가진 합성 클라이언트. startKeyIndex 는 재개용 시작 키(1-based). */
export function createGeminiTts(opts: { model: string; startKeyIndex?: number }): GeminiTtsClient {
  let keyIndex = Math.min(Math.max(0, (opts.startKeyIndex ?? 1) - 1), Math.max(0, API_KEYS.length - 1))
  let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

  /**
   * ≤3.1 SDK 호출 — style은 텍스트 prefix로 붙인다.
   * @google/genai 1.x는 part 필드를 화이트리스트로 직렬화해 speechMetadata를 지우므로
   * 3.8 요청에는 쓸 수 없다.
   */
  async function synthesizeLegacy(text: string, voiceName: string, model: string, style?: string): Promise<Buffer | null> {
    const styled = style ? `${style}: ${text}` : text
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: styled }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    })
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    return data ? Buffer.from(data, 'base64') : null
  }

  /**
   * 3.8 REST 호출 — 입력을 verbatim transcript로 취급하므로 style은 part의 speechMetadata로 넘긴다
   * (텍스트에 붙이면 그대로 낭독된다). unary 응답은 raw PCM이 아니라 WAV(RIFF)라 헤더를 벗긴다.
   */
  async function synthesize38(text: string, voiceName: string, model: string, style?: string): Promise<Buffer | null> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEYS[keyIndex]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text, ...(style ? { speechMetadata: { style } } : {}) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
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
    if (!data) return null
    const { pcm, sampleRate } = unwrapWavToPcm(Buffer.from(data, 'base64'))
    if (sampleRate !== undefined && sampleRate !== 24000) {
      console.log(`  ⚠ WAV ${sampleRate}Hz — saveWav(24kHz 가정)와 다름`)
    }
    return pcm
  }

  /** Gemini TTS → PCM Buffer (키 로테이션·재시도 포함) */
  async function synthesizeRaw(text: string, voiceName: string, model: string, style?: string, retries = 5, keyRetries = API_KEYS.length - 1): Promise<Buffer> {
    try {
      const pcm = isGemini38Tts(model)
        ? await synthesize38(text, voiceName, model, style)
        : await synthesizeLegacy(text, voiceName, model, style)
      if (!pcm) {
        if (retries > 0) {
          console.log(`  빈 응답 — 2초 후 재시도 (${retries}회 남음)`)
          await new Promise(r => setTimeout(r, 2000))
          return synthesizeRaw(text, voiceName, model, style, retries - 1, keyRetries)
        }
        throw new Error('No audio data')
      }
      return pcm
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if ([429, 403].includes(err.status ?? 0) && keyRetries > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        console.log(`  키 ${keyIndex + 1}로 전환 (${err.status})`)
        return synthesizeRaw(text, voiceName, model, style, 5, keyRetries - 1)
      }
      if (err.status === 400 && err.message?.includes('expired') && keyRetries > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        console.log(`  키 ${keyIndex + 1}로 전환 (만료)`)
        return synthesizeRaw(text, voiceName, model, style, 5, keyRetries - 1)
      }
      if (err.status === 500 && retries > 0) {
        console.log(`  서버 오류(500) — 3초 후 재시도 (${retries}회 남음)`)
        await new Promise(r => setTimeout(r, 3000))
        return synthesizeRaw(text, voiceName, model, style, retries - 1, keyRetries)
      }
      throw e
    }
  }

  return { synthesize: (text, voiceName, model, style) => synthesizeRaw(text, voiceName, model ?? opts.model, style) }
}

// --- WAV 저장 (24kHz mono 16-bit) ---
export async function saveWav(filename: string, pcmData: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcmData.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}
