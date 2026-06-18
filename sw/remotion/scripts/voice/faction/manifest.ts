/**
 * faction/manifest.ts — 텍스트 해시 매니페스트 (변경 없는 wav 재생성 스킵)
 *
 * BookRecommend manifest.ts 와 같은 sha256(voice:text) 형식이되, 그 모듈은 BookRecommend cli 를
 * import 하므로 격리 위해 동일 해시 로직만 가져온다(voice·text 단순 분기).
 * 매니페스트는 voice/ 디렉토리에 voice-manifest.json 으로 둔다.
 */

import { createHash } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { VOICE_DIR } from './cli.js'

export type Manifest = Record<string, string>

const MANIFEST_PATH = path.join(VOICE_DIR, 'voice-manifest.json')

/** sha256(voice:text) 앞 16자. voice 가 바뀌어도(화자 교체) 재생성이 트리거된다. */
export function jobHash(text: string, voice: string): string {
  return createHash('sha256').update(`${voice}:${text}`).digest('hex').slice(0, 16)
}

export async function loadManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf-8')) as Manifest
  } catch {
    return {}
  }
}

export async function saveManifest(m: Manifest): Promise<void> {
  await writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n', 'utf-8')
}
