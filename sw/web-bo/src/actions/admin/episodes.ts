'use server'

import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { EpisodeScript, EpisodeListItem } from '@/types/episode'

const execFileAsync = promisify(execFile)
const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const REMOTION_DIR = join(process.cwd(), '..', 'remotion')
const EPISODES_DIR = join(REMOTION_DIR, 'episodes')

function validateName(name: string) {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('잘못된 에피소드 이름')
  }
}

export async function listEpisodes(): Promise<EpisodeListItem[]> {
  const files = await readdir(EPISODES_DIR)
  const items: EpisodeListItem[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const name = file.replace('.json', '')
    const raw = await readFile(join(EPISODES_DIR, file), 'utf-8')
    const data = JSON.parse(raw) as EpisodeScript
    items.push({
      name,
      nickname: data.host.nickname,
      avatar_url: data.host.avatar_url,
      bookCount: data.books.length,
    })
  }

  return items
}

export async function getEpisode(name: string): Promise<EpisodeScript> {
  validateName(name)
  const raw = await readFile(join(EPISODES_DIR, `${name}.json`), 'utf-8')
  return JSON.parse(raw) as EpisodeScript
}

export async function saveEpisodeTexts(
  name: string,
  texts: {
    narrator: Pick<EpisodeScript['narrator'], 'celebIntro' | 'bridge' | 'outro'> & { interlude?: string }
    host: Pick<EpisodeScript['host'], 'philosophy'>
    books: Array<{
      summary: string
      context: string
      directQuote?: string
      directQuoteSource?: string
      contextAfter?: string
      oneLiner: string
    }>
    tts?: EpisodeScript['tts']
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    validateName(name)
    const filePath = join(EPISODES_DIR, `${name}.json`)
    const raw = await readFile(filePath, 'utf-8')
    const original = JSON.parse(raw) as EpisodeScript

    // 텍스트 필드만 병합, duration 보존
    original.narrator.celebIntro = texts.narrator.celebIntro
    original.narrator.bridge = texts.narrator.bridge
    original.narrator.outro = texts.narrator.outro
    if (texts.narrator.interlude !== undefined) {
      original.narrator.interlude = texts.narrator.interlude
    }

    original.host.philosophy = texts.host.philosophy

    for (let i = 0; i < original.books.length; i++) {
      if (!texts.books[i]) continue
      const src = texts.books[i]
      original.books[i].summary = src.summary
      original.books[i].context = src.context
      original.books[i].oneLiner = src.oneLiner
      if (src.directQuote !== undefined) original.books[i].directQuote = src.directQuote
      if (src.directQuoteSource !== undefined) original.books[i].directQuoteSource = src.directQuoteSource
      if (src.contextAfter !== undefined) original.books[i].contextAfter = src.contextAfter
    }

    // TTS 오버라이드 병합
    if (texts.tts) {
      original.tts = texts.tts
    }

    await writeFile(filePath, JSON.stringify(original, null, 2) + '\n', 'utf-8')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** TTS 음성 생성 */
export async function generateVoice(
  name: string,
  engine: 'gemini' | 'cloud',
  only?: string,
  updateJson?: boolean,
  force?: boolean,
  role?: string,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    validateName(name)
    const args = ['voice', '--', '--episode', name, '--engine', engine]
    if (only) args.push('--only', only)
    if (updateJson) args.push('--update-json')
    if (force) args.push('--force')
    if (role) args.push('--role', role)

    const { stdout, stderr } = await execFileAsync(PNPM, args, {
      cwd: REMOTION_DIR,
      timeout: 300_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    return { success: true, output: (stdout + '\n' + stderr).trim() }
  } catch (e: any) {
    const output = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n').trim()
    return { success: false, error: output }
  }
}

/** TTS 생성 대상 목록 조회 */
export async function listVoiceJobs(
  name: string,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    validateName(name)
    const { stdout } = await execFileAsync(PNPM, ['voice', '--', '--episode', name, '--list'], {
      cwd: REMOTION_DIR,
      timeout: 30_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    return { success: true, output: stdout.trim() }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Voice Select (멀티엔진 음성 소스 선택) ---

export interface VoiceSelect {
  default: string
  slots?: Record<string, string>
}

const VOICE_DIR = join(REMOTION_DIR, 'public', 'voice')
const ENGINES = ['gemini', 'cloud', 'elevenlabs'] as const

/** 엔진별 폴더의 wav 파일 목록 조회 */
export async function getVoiceFiles(name: string): Promise<Record<string, string[]>> {
  validateName(name)
  const baseDir = join(VOICE_DIR, name)
  const result: Record<string, string[]> = {}

  for (const engine of ENGINES) {
    const dir = join(baseDir, engine)
    try {
      const s = await stat(dir)
      if (!s.isDirectory()) continue
      const files = await readdir(dir)
      const wavs = files.filter(f => f.endsWith('.wav')).sort()
      if (wavs.length > 0) result[engine] = wavs
    } catch { /* 폴더 없음 */ }
  }

  // 플랫 폴더 (레거시)
  try {
    const files = await readdir(baseDir)
    const wavs = files.filter(f => f.endsWith('.wav')).sort()
    if (wavs.length > 0) result['_flat'] = wavs
  } catch { /* 폴더 없음 */ }

  return result
}

/** voice-select.json 읽기 */
export async function getVoiceSelect(name: string): Promise<VoiceSelect | null> {
  validateName(name)
  try {
    const raw = await readFile(join(VOICE_DIR, name, 'voice-select.json'), 'utf-8')
    return JSON.parse(raw) as VoiceSelect
  } catch {
    return null
  }
}

/** voice-select.json 저장 */
export async function saveVoiceSelect(
  name: string,
  select: VoiceSelect,
): Promise<{ success: boolean; error?: string }> {
  try {
    validateName(name)
    await writeFile(
      join(VOICE_DIR, name, 'voice-select.json'),
      JSON.stringify(select, null, 2) + '\n',
      'utf-8',
    )
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
