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
import { getEleAccounts, resolveEleAccountForVoice } from '@feelandnote/shared/lib/ele-accounts'
import { type Voice } from './config.js'
import { START_KEY_INDEX, GEMINI_MODEL } from './cli.js'

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
//
// CLI와 web-bo는 계정 선택 정책을 @feelandnote/shared/lib/ele-accounts에서 공유한다.
// CLI는 자체 환경의 키로 직접 합성하므로 별도 BO 서버를 켤 필요가 없다.

/** MP3 buffer → 24kHz mono 16-bit PCM buffer (saveWav 입력 형태) */
async function mp3ToPcm24k(mp3: Buffer): Promise<Buffer> {
  const ffmpegPath = 'ffmpeg'
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

  if (getEleAccounts().length === 0) {
    throw new Error('ElevenLabs API 키가 설정되지 않음 (.env의 ELEVENLABS_API_KEY / ELEVENLABS_API_KEY_FEELANDNOTE)')
  }
  const account = await resolveEleAccountForVoice(voiceId)
  if (!account) throw new Error(`해당 음성을 가진 ElevenLabs 계정을 찾지 못함: ${voiceId}`)

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': account.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
      },
      speed: 1.0,
    }),
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const mp3Buffer = Buffer.from(await res.arrayBuffer())
  const pcm = await mp3ToPcm24k(mp3Buffer)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s [ElevenLabs]`)
  return duration
}
