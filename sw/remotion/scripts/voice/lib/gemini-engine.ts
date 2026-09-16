/**
 * lib/gemini-engine.ts — Gemini TTS 합성 코어 (단일 원천)
 *
 * BookRecommend(2-synthesize/engines.ts)·Faction(faction/engine.ts)이 공유한다.
 * 키 로테이션·재시도(429/403/만료/500)·WAV 저장·길이 측정이 여기 한 벌만 있다.
 *
 * Google 무료 키(GOOGLE_GENAI_API_KEY_FREE<n>)만 쓴다 — 유료 Gemini·Vertex·Cloud TTS 금지.
 * 모델·시작 키는 각 파이프라인 cli.ts 가 넘긴다(이 모듈은 argv 를 건드리지 않는다).
 */
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import { readFile } from 'fs/promises'
import wav from 'wav'
import { googleFreeApiKeys } from '@feelandnote/shared/lib/gemini-keys'

// --- API 키 풀 (env 규약은 shared/lib/gemini-keys.ts 단일 원천) ---
const API_KEYS = googleFreeApiKeys()

/** 등록된 무료 키 수 — 스크립트가 합성 전에 키 존재 여부를 미리 검사할 때 쓴다. */
export function googleFreeKeyCount(): number {
  return API_KEYS.length
}

export type GeminiTtsClient = {
  /** model 미지정 시 createGeminiTts 의 기본 모델 사용 */
  synthesize: (text: string, voiceName: string, model?: string) => Promise<Buffer>
}

/** 키 로테이션 상태를 가진 합성 클라이언트. startKeyIndex 는 재개용 시작 키(1-based). */
export function createGeminiTts(opts: { model: string; startKeyIndex?: number }): GeminiTtsClient {
  let keyIndex = Math.min(Math.max(0, (opts.startKeyIndex ?? 1) - 1), Math.max(0, API_KEYS.length - 1))
  let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

  /** Gemini TTS → PCM Buffer (키 로테이션·재시도 포함) */
  async function synthesizeRaw(text: string, voiceName: string, model: string, retries = 5, keyRetries = API_KEYS.length - 1): Promise<Buffer> {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      })
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (!data) {
        if (retries > 0) {
          console.log(`  빈 응답 — 2초 후 재시도 (${retries}회 남음)`)
          await new Promise(r => setTimeout(r, 2000))
          return synthesizeRaw(text, voiceName, model, retries - 1, keyRetries)
        }
        throw new Error('No audio data')
      }
      return Buffer.from(data, 'base64')
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if ([429, 403].includes(err.status ?? 0) && keyRetries > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        console.log(`  키 ${keyIndex + 1}로 전환 (${err.status})`)
        return synthesizeRaw(text, voiceName, model, 5, keyRetries - 1)
      }
      if (err.status === 400 && err.message?.includes('expired') && keyRetries > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        console.log(`  키 ${keyIndex + 1}로 전환 (만료)`)
        return synthesizeRaw(text, voiceName, model, 5, keyRetries - 1)
      }
      if (err.status === 500 && retries > 0) {
        console.log(`  서버 오류(500) — 3초 후 재시도 (${retries}회 남음)`)
        await new Promise(r => setTimeout(r, 3000))
        return synthesizeRaw(text, voiceName, model, retries - 1, keyRetries)
      }
      throw e
    }
  }

  return { synthesize: (text, voiceName, model) => synthesizeRaw(text, voiceName, model ?? opts.model) }
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

/**
 * 기존 WAV 파일의 길이(초)를 헤더에서 측정한다.
 * RIFF/WAVE: fmt 청크의 byteRate 와 data 청크 크기로 계산. ffmpeg 의존 없이 동작한다.
 * 정규화 후에도 포맷(PCM)·헤더 구조는 유지되므로 정확하다.
 */
export async function measureWavDuration(filePath: string): Promise<number> {
  const buf = await readFile(filePath)
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`WAV 헤더 아님: ${filePath}`)
  }
  let byteRate = 0
  let dataSize = 0
  let off = 12
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      // byteRate = sampleRate * channels * bitsPerSample/8 (offset +8 within fmt body)
      byteRate = buf.readUInt32LE(off + 8 + 8)
    } else if (id === 'data') {
      dataSize = size
      break
    }
    off += 8 + size + (size % 2) // 청크는 2바이트 정렬 패딩
  }
  if (byteRate <= 0 || dataSize <= 0) throw new Error(`WAV 길이 측정 실패: ${filePath}`)
  return dataSize / byteRate
}
