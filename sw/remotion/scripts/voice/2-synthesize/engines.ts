/**
 * 2-synthesize/engines.ts — Gemini · ElevenLabs TTS 합성 엔진
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
import { spawn } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'
import { MODEL, BO_BASE_URL, BO_SERIES, type Voice } from './config.js'
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

// --- ElevenLabs TTS (via BO route) ---
//
// CLI는 ElevenLabs API를 직접 호출하지 않는다. BO UI(VoiceTimingEditor·ExpandedVoicePanel)
// 와 동일하게 `${BO_BASE_URL}/api/${BO_SERIES}/voice/elevenlabs/preview` route를 통과시킨다.
// 단일원천 보장. model_id·voice_settings·audio tag 처리 등 모든 파라미터는 BO route 한 곳에서 관리.

/** MP3 buffer → 24kHz mono 16-bit PCM buffer (saveWav 입력 형태) */
async function mp3ToPcm24k(mp3: Buffer): Promise<Buffer> {
  const ffmpegPath = (ffmpegStatic as unknown as string) || 'ffmpeg'
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 's16le', '-ar', '24000', '-ac', '1',
      'pipe:1',
    ])
    const chunks: Buffer[] = []
    let stderr = ''
    ff.stdout.on('data', d => chunks.push(d as Buffer))
    ff.stderr.on('data', d => { stderr += d.toString() })
    ff.on('close', code => {
      if (code !== 0) reject(new Error(`ffmpeg(MP3→PCM) ${code}: ${stderr.slice(0, 500)}`))
      else resolve(Buffer.concat(chunks))
    })
    ff.stdin.write(mp3)
    ff.stdin.end()
  })
}

export async function synthesizeElevenlabs(text: string, voiceId: string, outputFile: string): Promise<number> {
  if (!voiceId) throw new Error('elevenlabsVoiceId 없음. 에피소드 JSON host에 추가하세요.')
  if (!/^\[.+?\]/.test(text.trim())) throw new Error(`ElevenLabs 감정 태그 누락: "${text.slice(0, 50)}…" — 텍스트 앞에 [감정, 톤] 태그를 추가하세요.`)

  const url = `${BO_BASE_URL}/api/${BO_SERIES}/voice/elevenlabs/preview`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceId,
        text,
        // BO route default와 동일 (route 내부에서 ?? 처리되지만 명시 전달).
        settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: 1.0 },
      }),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`✗ BO 서버 연결 실패 (${url}). 'pnpm dev:remotion-bo' 로 BO 서버를 켠 뒤 재시도하세요.\n   원인: ${msg}`)
  }
  if (!res.ok) {
    throw new Error(`BO route ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json() as { success: boolean; base64?: string; error?: string; format?: string }
  if (!data.success || !data.base64) {
    throw new Error(`BO route 합성 실패: ${data.error ?? 'unknown'}`)
  }
  const mp3Buffer = Buffer.from(data.base64, 'base64')
  const pcm = await mp3ToPcm24k(mp3Buffer)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s [ElevenLabs · BO route]`)
  return duration
}
