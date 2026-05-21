/**
 * 2-synthesize/manifest.ts — wav 매니페스트(텍스트 해시) 관리
 *
 * 매니페스트는 텍스트가 변경됐는지 감지해 변경 없는 wav 재생성을 스킵한다.
 * 공용 음성과 에피소드별 음성을 다른 디렉토리에 분리 저장한다.
 */

import { createHash } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { COMMON_VOICE_FILES } from '../../../src/compositions/BookRecommend/voice-names'
import { OUT_DIR, COMMON_DIR } from './cli.js'
import type { Job } from './jobs.js'

export type Manifest = Record<string, string> // file → sha256(text+voice)

/**
 * 매니페스트 해시 — 텍스트·기본 voice를 묶고, 화자 ElevenLabs voiceId 오버라이드가 있을 때만 추가 분기.
 *
 * 화자 voiceId까지 포함해야 "텍스트 동일 + 화자만 교체" 사례에서 변경 감지가 된다.
 * 다만 오버라이드가 없는 경우에는 기존 hash 형식(`${voice}:${text}`)을 유지해 옛 wav 호환을 보장.
 * 즉 화자 도입 전부터 있던 모든 wav는 추가 입력 없이 그대로 통과.
 */
export function jobHash(text: string, voice: string, elevenlabsVoiceId?: string): string {
  const payload = elevenlabsVoiceId
    ? `${voice}|ele:${elevenlabsVoiceId}:${text}`
    : `${voice}:${text}`
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

export async function loadManifest(dir: string = OUT_DIR): Promise<Manifest> {
  try {
    const raw = await readFile(path.join(dir, 'manifest.json'), 'utf-8')
    return JSON.parse(raw) as Manifest
  } catch {
    return {}
  }
}

export async function saveManifest(m: Manifest, dir: string = OUT_DIR): Promise<void> {
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n', 'utf-8')
}

/** job이 원래 공용 파일인지 */
export function isCommonFile(file: string): boolean {
  return COMMON_VOICE_FILES.has(file)
}

/** job의 출력 디렉토리 — 공용 파일은 common/, 나머지는 episode/engine/ */
export function jobOutDir(job: Job): string {
  return isCommonFile(job.file) ? COMMON_DIR : OUT_DIR
}

/** job의 매니페스트 디렉토리 (= 출력 디렉토리) */
export function manifestDir(job: Job): string {
  return jobOutDir(job)
}
