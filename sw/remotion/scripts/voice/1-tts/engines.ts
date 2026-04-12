/**
 * 1-tts/engines.ts — Gemini · ElevenLabs TTS 합성 엔진
 *
 * 저수준 API 호출과 wav 저장만 담당한다. 스타일 prefix 결정은 tts.ts.
 *
 * Gemini: 키 로테이션 + 재시도 (429/403/만료/500)
 * ElevenLabs: --engine elevenlabs 명시 시에만 사용
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import path from 'path'
import { MODEL, ELEVENLABS_KEY, ELEVENLABS_URL, type Voice } from './config.js'
import { START_KEY_INDEX } from './cli.js'

// --- API 키 로테이션 ---
const API_KEYS = Array.from({ length: 100 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY_FREE${i + 1}`]).filter(Boolean) as string[]
let keyIndex = Math.min(START_KEY_INDEX - 1, API_KEYS.length - 1)
let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

// --- WAV 저장 ---
export async function saveWav(filename: string, pcmData: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcmData.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}

// --- Gemini TTS 합성 ---

/** Gemini TTS → PCM Buffer (키 로테이션·재시도 포함) */
async function synthesizeRaw(text: string, voiceName: Voice, retries = 5, keyRetries = API_KEYS.length - 1): Promise<Buffer> {
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
      if (retries > 0) {
        console.log(`  빈 응답 — 2초 후 재시도 (${retries}회 남음)`)
        await new Promise(r => setTimeout(r, 2000))
        return synthesizeRaw(text, voiceName, retries - 1, keyRetries)
      }
      throw new Error('No audio data')
    }
    return Buffer.from(data, 'base64')
  } catch (e: any) {
    if ([429, 403].includes(e.status) && keyRetries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (${e.status})`)
      return synthesizeRaw(text, voiceName, 5, keyRetries - 1)
    }
    if ([400].includes(e.status) && e.message?.includes('expired') && keyRetries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (만료)`)
      return synthesizeRaw(text, voiceName, 5, keyRetries - 1)
    }
    if ([500].includes(e.status) && retries > 0) {
      console.log(`  서버 오류(500) — 3초 후 재시도 (${retries}회 남음)`)
      await new Promise(r => setTimeout(r, 3000))
      return synthesizeRaw(text, voiceName, retries - 1, keyRetries)
    }
    throw e
  }
}

export async function synthesizeGemini(text: string, voiceName: Voice, outputFile: string): Promise<number> {
  const pcm = await synthesizeRaw(text, voiceName)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
  return duration
}

// --- ElevenLabs TTS ---

export async function synthesizeElevenlabs(text: string, voiceId: string, outputFile: string): Promise<number> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY 없음. .env에 추가하세요.')
  if (!voiceId) throw new Error('elevenlabsVoiceId 없음. 에피소드 JSON host에 추가하세요.')
  if (!/^\[.+?\]/.test(text.trim())) throw new Error(`ElevenLabs 감정 태그 누락: "${text.slice(0, 50)}…" — 텍스트 앞에 [감정, 톤] 태그를 추가하세요.`)

  const res = await fetch(`${ELEVENLABS_URL}/${voiceId}?output_format=pcm_24000`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 300)}`)
  }
  const arrayBuf = await res.arrayBuffer()
  const pcm = Buffer.from(arrayBuf)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s [ElevenLabs]`)
  return duration
}
