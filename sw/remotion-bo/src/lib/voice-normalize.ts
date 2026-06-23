import { mkdir, copyFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

// 라우드니스 목표 — remotion 파이프라인(2-synthesize/config.ts)과 동일 값 유지
const NORM_I = -17
const NORM_TP = -1.5
const NORM_LRA = 11

/**
 * 단일 wav 라우드니스 정규화(loudnorm 2-pass linear) — 저장 즉시 음량 균일화.
 * 엔진(Gemini·ElevenLabs) 무관: 입력이 wav면 라우드니스를 측정해 목표(-17 LUFS)로 맞춘다.
 * 원본은 같은 폴더의 .raw/ 에 백업한다. 측정 실패(무음 등) 시 false 반환(원본 유지).
 * 시스템 ffmpeg 필요.
 */
export async function normalizeWavInPlace(filePath: string): Promise<boolean> {
  const rawDir = path.join(path.dirname(filePath), '.raw')
  const rawPath = path.join(rawDir, path.basename(filePath))
  await mkdir(rawDir, { recursive: true })
  await copyFile(filePath, rawPath) // 원본 백업(롤백용)

  // 1-pass 측정 — loudnorm 통계는 stderr(JSON)로 나온다
  let stderr = ''
  try {
    const r = await execFileAsync('ffmpeg', ['-hide_banner', '-nostats', '-i', filePath, '-af', `loudnorm=I=${NORM_I}:TP=${NORM_TP}:LRA=${NORM_LRA}:print_format=json`, '-f', 'null', '-'], { maxBuffer: 1 << 25 })
    stderr = r.stderr
  } catch (e) {
    stderr = (e as { stderr?: string })?.stderr ?? ''
  }
  const m = stderr.match(/\{[\s\S]*?\}/)
  if (!m) return false
  let meas: { input_i?: string; input_tp?: string; input_lra?: string; input_thresh?: string; target_offset?: string }
  try { meas = JSON.parse(m[0]) } catch { return false }
  const { input_i, input_tp, input_lra, input_thresh, target_offset } = meas
  if (!input_i || !input_tp || !input_lra || !input_thresh || !target_offset) return false

  // 2-pass 적용(linear: 게인만, 컴프레션 없음). 입력은 .raw 백업본, 출력은 본체 덮어쓰기.
  await execFileAsync('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'error', '-y', '-i', rawPath, '-af', `loudnorm=I=${NORM_I}:TP=${NORM_TP}:LRA=${NORM_LRA}:linear=true:measured_I=${input_i}:measured_TP=${input_tp}:measured_LRA=${input_lra}:measured_thresh=${input_thresh}:offset=${target_offset}`, '-ar', '24000', '-ac', '1', filePath], { maxBuffer: 1 << 25 })
  return true
}
