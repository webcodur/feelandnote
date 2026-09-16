/**
 * 2-synthesize/engines.ts — Gemini · ElevenLabs TTS 합성 엔진
 *
 * 저수준 API 호출과 wav 저장만 담당한다. 스타일 prefix 결정은 tts.ts.
 * Gemini 합성 코어(키 로테이션·재시도·wav 저장)는 ../lib/gemini-engine.ts 단일 원천을 쓴다.
 *
 * ElevenLabs: --engine elevenlabs 명시 시에만 사용
 */

import 'dotenv/config'
import path from 'path'
import {
  getEleAccountSetupError, getEleAccounts,
} from '@feelandnote/shared/lib/ele-accounts'
import { cleanVoiceFile } from '@feelandnote/shared/bo/voice-cleanup'
import { createGeminiTts, saveWav } from '../lib/gemini-engine.js'
import { fetchElevenlabsMp3, mp3ToPcm24k } from '../lib/elevenlabs-engine.js'
import { type Voice } from './config.js'
import { START_KEY_INDEX, GEMINI_MODEL } from './cli.js'

export { saveWav }

// --- Gemini TTS 합성 ---
const gemini = createGeminiTts({ model: GEMINI_MODEL, startKeyIndex: START_KEY_INDEX })

export async function synthesizeGemini(text: string, voiceName: Voice, outputFile: string): Promise<number> {
  const pcm = await gemini.synthesize(text, voiceName)
  await saveWav(outputFile, pcm)
  // 들숨·쉼 정리(SSoT) — 내레이션이라 reading 프로필, 길이는 정리 뒤 값
  const { seconds: duration } = await cleanVoiceFile(outputFile, outputFile, 'reading')
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
  return duration
}

// --- ElevenLabs TTS ---
//
// CLI와 web-bo는 계정 선택 정책을 @feelandnote/shared/lib/ele-accounts에서 공유한다.
// 저수준 호출(fetch·MP3→PCM·기본값)은 ../lib/elevenlabs-engine.ts 단일 원천.

export async function synthesizeElevenlabs(text: string, voiceId: string, outputFile: string): Promise<number> {
  if (!voiceId) throw new Error('elevenlabsVoiceId 없음. 에피소드 JSON host에 추가하세요.')
  if (!/^\[.+?\]/.test(text.trim())) throw new Error(`ElevenLabs 감정 태그 누락: "${text.slice(0, 50)}…" — 텍스트 앞에 [감정, 톤] 태그를 추가하세요.`)

  if (getEleAccounts().length === 0) {
    throw new Error(getEleAccountSetupError())
  }

  const pcm = await mp3ToPcm24k(await fetchElevenlabsMp3(text, voiceId))
  await saveWav(outputFile, pcm)
  // 들숨·쉼 정리(SSoT) — 셀럽 보이스라 dialogue 프로필, 길이는 정리 뒤 값
  const { seconds: duration } = await cleanVoiceFile(outputFile, outputFile, 'dialogue')
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s [ElevenLabs]`)
  return duration
}
