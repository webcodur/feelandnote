/**
 * 1-tts/manifest.ts — wav 매니페스트(텍스트 해시) 관리
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

export function jobHash(text: string, voice: string): string {
  return createHash('sha256').update(`${voice}:${text}`).digest('hex').slice(0, 16)
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
