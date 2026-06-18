/**
 * faction/engine.ts — Gemini TTS 합성 + WAV 저장 + 길이 측정
 *
 * BookRecommend 의 2-synthesize/engines.ts 와 같은 키 로테이션·재시도 로직을 쓰되,
 * 그 모듈은 BookRecommend 의 cli.ts(엄격 플래그 검증·--long/--shorts 강제)를 import 하므로
 * Faction 별도 진입점에서 그대로 끌어오면 argv 파싱이 충돌한다. 따라서 합성 코어를 복제해
 * Faction cli 의 GEMINI_MODEL·START_KEY_INDEX 를 쓴다. (정책 변경 시 두 곳을 함께 갱신)
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import { readFile } from 'fs/promises'
import wav from 'wav'
import path from 'path'
import { GEMINI_MODEL, START_KEY_INDEX } from './cli.js'

// --- API 키 로테이션 ---
const API_KEYS = Array.from({ length: 100 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY_FREE${i + 1}`]).filter(Boolean) as string[]
let keyIndex = Math.min(START_KEY_INDEX - 1, Math.max(0, API_KEYS.length - 1))
let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

// --- WAV 저장 (24kHz mono 16-bit, BookRecommend 와 동일 포맷) ---
export async function saveWav(filename: string, pcmData: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcmData.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}

/** Gemini TTS → PCM Buffer (키 로테이션·재시도 포함) */
async function synthesizeRaw(text: string, voiceName: string, retries = 5, keyRetries = API_KEYS.length - 1): Promise<Buffer> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if ([429, 403].includes(err.status ?? 0) && keyRetries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (${err.status})`)
      return synthesizeRaw(text, voiceName, 5, keyRetries - 1)
    }
    if (err.status === 400 && err.message?.includes('expired') && keyRetries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (만료)`)
      return synthesizeRaw(text, voiceName, 5, keyRetries - 1)
    }
    if (err.status === 500 && retries > 0) {
      console.log(`  서버 오류(500) — 3초 후 재시도 (${retries}회 남음)`)
      await new Promise(r => setTimeout(r, 3000))
      return synthesizeRaw(text, voiceName, retries - 1, keyRetries)
    }
    throw e
  }
}

/** 합성 → wav 저장 → 길이(초) 반환 */
export async function synthesizeGemini(text: string, voiceName: string, outputFile: string): Promise<number> {
  const pcm = await synthesizeRaw(text, voiceName)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(28)} ${duration.toFixed(2)}s`)
  return duration
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
