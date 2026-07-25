import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// 세력도·북리커맨드 음원 표준 포맷 — mono 24kHz 16-bit
const SR = 24000

/**
 * 연령 변형 필터 체인 — age ∈ [-1, 1] (양수=젊게, 음수=늙게).
 *
 * 나이 인상의 8할은 음높이가 아니라 성대 공명(포먼트)에서 온다. 젊을수록 성도가 짧아 공명이 위로,
 * 나이 들수록 아래로 간다. 그래서 포먼트를 크게(±10%), 음높이를 작게(±4%) 함께 움직여 자연스러운
 * 나이 인상을 만든다. 전체 길이는 그대로 유지한다(자막 싱크 재실행 불필요).
 *
 * 구현:
 *  1. asetrate → aresample → atempo : 음높이·포먼트를 모두 f배로 올리고 길이를 원복.
 *  2. rubberband pitch=p/f, formant=preserved : 음높이만 p/f배(최종 p배)로 되돌리고 포먼트는 f배 유지.
 *  결과 — 음높이 p배, 포먼트 f배, 길이 불변.
 *
 * age 가 0이면 null(변형 없음 = 원본 그대로).
 */
export function ageFilterChain(age: number, sr = SR): string | null {
  const a = Math.max(-1, Math.min(1, age))
  if (Math.abs(a) < 0.001) return null
  const f = 1 + 0.10 * a // 포먼트 배율
  const p = 1 + 0.04 * a // 음높이 배율
  const rate = Math.round(sr * f)
  return [
    `asetrate=${rate}`,
    `aresample=${sr}`,
    `atempo=${(sr / rate).toFixed(6)}`,
    `rubberband=pitch=${(p / f).toFixed(6)}:formant=preserved:pitchq=quality`,
  ].join(',')
}

/**
 * 연령 변형을 적용해 src wav → dst wav 로 출력한다(mono 24kHz 16-bit).
 * age 가 0이면 필터 없이 그대로 복제한다. 시스템 ffmpeg(librubberband) 필요.
 */
export async function applyAgeToFile(src: string, dst: string, age: number, sr = SR): Promise<void> {
  const chain = ageFilterChain(age, sr)
  const filterArgs = chain ? ['-af', chain] : []
  await execFileAsync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-loglevel', 'error', '-y', '-i', src, ...filterArgs, '-ar', String(sr), '-ac', '1', '-c:a', 'pcm_s16le', dst],
    { maxBuffer: 1 << 25 },
  )
}
