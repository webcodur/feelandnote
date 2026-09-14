import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * 합성 음성 정리 — 단일 원천(SSoT)
 *
 * 들숨 제거와 앞·중간·뒤 쉼 정리의 구현은 sw/audio-bo/scripts/voice_cleanup.py 하나다.
 * TTS 음원은 경로(web-bo 미리듣기·Remotion CLI·배치)와 엔진(Gemini·ElevenLabs)에 상관없이
 * **처음 생긴 자리**에서 이 모듈을 거친다. 사람이 편집기에서 손본 음원을 저장할 때는 부르지 않는다 —
 * 일부러 넓힌 간격까지 다시 줄인다. 규칙과 근거: docs/project/production/voice-cleanup.md
 *
 * 파이썬(numpy)·ffmpeg·ffprobe가 필요하다. 없으면 실패한다 — 정리 안 된 음원이 조용히 나가지 않게 한다.
 * 파이썬 명령은 VOICE_CLEANUP_PYTHON, 스크립트 경로는 VOICE_CLEANUP_SCRIPT로 바꿀 수 있다.
 */

/** reading: 문장 사이 쉼 기준(내레이션·안내) / dialogue: 쉼표 자리 기준(인물 대사) */
export type VoiceCleanupProfile = 'reading' | 'dialogue'

export interface VoiceCleanupResult {
  /** 정리 뒤 길이(초) — 합성 길이를 기록하는 쪽은 이 값을 쓴다 */
  seconds: number
  breaths: number
}

function cleanupScript(): string {
  if (process.env.VOICE_CLEANUP_SCRIPT) return process.env.VOICE_CLEANUP_SCRIPT
  // 앱마다 작업 폴더가 다르다(sw/web-bo, sw/remotion …). 저장소 뿌리까지 올라가며 찾는다.
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'sw', 'audio-bo', 'scripts', 'voice_cleanup.py')
    if (existsSync(candidate)) return candidate
    if (path.dirname(dir) === dir) throw new Error('voice_cleanup.py를 찾지 못했다 — 저장소 안에서 실행하거나 VOICE_CLEANUP_SCRIPT를 지정한다')
  }
}

function pythonCommand(): [string, string[]] {
  if (process.env.VOICE_CLEANUP_PYTHON) return [process.env.VOICE_CLEANUP_PYTHON, []]
  return process.platform === 'win32' ? ['py', ['-3']] : ['python3', []]
}

/** 파일을 정리해 output에 쓴다(같은 경로 가능). 출력이 .wav면 PCM, 그 외는 MP3 128k. 샘플레이트는 원본 유지. */
export async function cleanVoiceFile(input: string, output: string, profile: VoiceCleanupProfile): Promise<VoiceCleanupResult> {
  const [command, prefix] = pythonCommand()
  const { stdout } = await execFileAsync(command, [...prefix, cleanupScript(), '--profile', profile, input, output], {
    maxBuffer: 1 << 20,
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })
  const summary = JSON.parse(stdout.trim().split('\n').pop() ?? '') as VoiceCleanupResult
  return { seconds: summary.seconds, breaths: summary.breaths }
}

/** 메모리의 합성 음원을 정리해 같은 형식으로 돌려준다(미리듣기 응답용). */
export async function cleanVoiceBuffer(audio: Buffer, format: 'wav' | 'mp3', profile: VoiceCleanupProfile): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-cleanup-'))
  try {
    const file = path.join(dir, `voice.${format}`)
    await writeFile(file, audio)
    await cleanVoiceFile(file, file, profile)
    return await readFile(file)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
