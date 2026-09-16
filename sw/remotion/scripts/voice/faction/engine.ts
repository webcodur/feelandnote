/**
 * faction/engine.ts — Gemini TTS 합성 + WAV 저장 + 길이 측정
 *
 * 합성 코어(키 로테이션·재시도·wav 저장·길이 측정)는 ../lib/gemini-engine.ts 단일 원천을 쓴다.
 * Faction cli 의 GEMINI_MODEL·START_KEY_INDEX 만 여기서 주입하고, 정리 프로필은 인물 대사라
 * 'dialogue' 를 쓴다(BookRecommend 나레이션은 'reading').
 */

import 'dotenv/config'
import path from 'path'
import { cleanVoiceFile } from '@feelandnote/shared/bo/voice-cleanup'
import { createGeminiTts, saveWav, measureWavDuration } from '../lib/gemini-engine.js'
import { GEMINI_MODEL, START_KEY_INDEX } from './cli.js'

export { saveWav, measureWavDuration }

const gemini = createGeminiTts({ model: GEMINI_MODEL, startKeyIndex: START_KEY_INDEX })

/** 합성 → wav 저장 → 길이(초) 반환. model 미지정 시 CLI 기본(GEMINI_MODEL) */
export async function synthesizeGemini(text: string, voiceName: string, outputFile: string, model?: string): Promise<number> {
  const pcm = await gemini.synthesize(text, voiceName, model)
  await saveWav(outputFile, pcm)
  // 들숨·쉼 정리(SSoT) — 인물 대사라 dialogue 프로필, 길이는 정리 뒤 값
  const { seconds: duration } = await cleanVoiceFile(outputFile, outputFile, 'dialogue')
  console.log(`  ${path.basename(outputFile).padEnd(28)} ${duration.toFixed(2)}s`)
  return duration
}
