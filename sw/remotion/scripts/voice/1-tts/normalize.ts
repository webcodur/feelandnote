/**
 * 1-tts/normalize.ts — 라우드니스 정규화 (loudnorm 2-pass linear)
 *
 * 신규 wav 생성 직후 또는 --normalize 단독 호출 시 디렉토리 일괄 적용.
 * 원본은 같은 디렉토리의 .raw/ 에 자동 백업하여 롤백 가능.
 * 셀럽이 ElevenLabs 보이스를 쓰는 경우 적용하지 않는다 (수작업 검수 영역 보호).
 */

import { mkdir } from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import {
  NORMALIZE_TARGET_I, NORMALIZE_TARGET_TP, NORMALIZE_TARGET_LRA,
} from './config.js'

function runFfmpeg(ffArgs: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', ffArgs, { maxBuffer: 1024 * 1024 * 32 }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stderr }))
      else resolve({ stdout, stderr })
    })
  })
}

/** 단일 wav 정규화. 원본은 .raw/에 매번 갱신 백업. 성공 시 input_i 반환. */
export async function normalizeWav(filePath: string): Promise<{ inI: string } | null> {
  const dir = path.dirname(filePath)
  const name = path.basename(filePath)
  const rawDir = path.join(dir, '.raw')
  const rawPath = path.join(rawDir, name)

  // 1) 원본 백업: 매 호출마다 본체로 갱신 (이전 .raw가 stale일 수 있음)
  await mkdir(rawDir, { recursive: true })
  {
    const { copyFile } = await import('fs/promises')
    await copyFile(filePath, rawPath)
  }

  // 2) 1-pass 측정
  let measureRes: { stderr: string }
  try {
    measureRes = await runFfmpeg([
      '-hide_banner', '-nostats', '-i', filePath,
      '-af', `loudnorm=I=${NORMALIZE_TARGET_I}:TP=${NORMALIZE_TARGET_TP}:LRA=${NORMALIZE_TARGET_LRA}:print_format=json`,
      '-f', 'null', '-',
    ])
  } catch (e: any) {
    measureRes = { stderr: e.stderr || '' }
  }
  const jsonMatch = measureRes.stderr.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) return null
  let measured: { input_i?: string; input_tp?: string; input_lra?: string; input_thresh?: string; target_offset?: string }
  try { measured = JSON.parse(jsonMatch[0]) } catch { return null }
  const { input_i, input_tp, input_lra, input_thresh, target_offset } = measured
  if (!input_i || !input_tp || !input_lra || !input_thresh || !target_offset) return null

  // 3) 2-pass 적용 (linear: 게인만 조정, 컴프레션 없음)
  // ffmpeg 입력은 .raw 백업본을 사용. 출력은 filePath에 직접 덮어쓴다(rename 회피).
  await runFfmpeg([
    '-hide_banner', '-nostats', '-loglevel', 'error', '-y',
    '-i', rawPath,
    '-af', `loudnorm=I=${NORMALIZE_TARGET_I}:TP=${NORMALIZE_TARGET_TP}:LRA=${NORMALIZE_TARGET_LRA}:linear=true:measured_I=${input_i}:measured_TP=${input_tp}:measured_LRA=${input_lra}:measured_thresh=${input_thresh}:offset=${target_offset}`,
    '-ar', '24000', '-ac', '1',
    filePath,
  ])

  return { inI: input_i }
}

/** 지정된 디렉토리의 최상위 *.wav 일괄 정규화 (서브디렉토리 미순회, `.raw/` 제외).
 *
 * 쇼츠처럼 서브디렉토리(`shorts-{N}/`)를 대상으로 하려면 호출 측이 그 경로를 직접 넘긴다.
 * 존재하지 않는 디렉토리는 경고 후 조용히 통과.
 */
export async function normalizeAll(outDir: string): Promise<void> {
  const { readdirSync, existsSync } = await import('fs')
  if (!existsSync(outDir)) {
    console.log(`(없음) ${outDir}`)
    return
  }
  const files = readdirSync(outDir).filter((f: string) => f.endsWith('.wav'))
  if (files.length === 0) {
    console.log(`(wav 없음) ${outDir}`)
    return
  }
  console.log(`\n=== 라우드니스 정규화: ${files.length}개 @ ${outDir} (I=${NORMALIZE_TARGET_I} LUFS, TP=${NORMALIZE_TARGET_TP}, linear) ===`)
  for (const f of files) {
    const fp = path.join(outDir, f)
    const result = await normalizeWav(fp)
    if (result) console.log(`  [OK]   ${f.padEnd(34)} in_i=${result.inI}`)
    else console.log(`  [SKIP] ${f.padEnd(34)} 측정 실패`)
  }
}
