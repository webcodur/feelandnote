import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const NOBG_BATCH_DIR = 'C:\\project\\nobg\\batch'
const NOBG_SCRIPT = join(NOBG_BATCH_DIR, 'batch_nobg.py')

function runNobg(workDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('py', ['-3.12', NOBG_SCRIPT, 'rembg'], {
      cwd: NOBG_BATCH_DIR,
      env: { ...process.env, NOBG_WORK_DIR: workDir, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    })
    child.once('error', (error) => reject(new Error(`nobg 실행 실패: ${error.message}`)))
    child.once('close', (code) => code === 0
      ? resolve()
      : reject(new Error(`nobg 처리 실패: exit ${code}`)))
  })
}

// 기존 nobg 배치를 한 번만 호출한다. 입력과 무손실 중간본은 검수용으로 남긴다.
export async function removeBackgrounds(
  files: string[],
  inDir: string,
  outDir: string,
  run: (workDir: string) => Promise<void> = runNobg,
): Promise<Map<string, string>> {
  if (!files.length) throw new Error('배경 제거할 이미지가 없다')
  if (!existsSync(NOBG_SCRIPT)) throw new Error(`nobg 유틸을 찾지 못했다: ${NOBG_SCRIPT}`)
  mkdirSync(outDir, { recursive: true })
  const workDir = mkdtempSync(join(outDir, '_nobg-'))
  const originals = join(workDir, 'originals')
  mkdirSync(originals)
  console.log(`배경 제거 ${files.length}장 → ${workDir} (속도: ${process.env.NOBG_SPEED?.trim() || 'medium'})`)
  for (const file of files) {
    await sharp(join(inDir, file)).ensureAlpha().webp({ lossless: true })
      .toFile(join(originals, parse(file).name + '.webp'))
  }
  await run(workDir)
  const processed = new Map(files.map((file) => [file, join(workDir, 'nobg', `${parse(file).name}_nobg.webp`)]))
  // nobg 배치는 개별 실패에도 exit 0을 반환하므로 모든 결과가 있는지 확인한다.
  const missing = [...processed].filter(([, path]) => !existsSync(path)).map(([file]) => file)
  if (missing.length) throw new Error(`nobg 결과 누락 — 재배치 중단: ${missing.join(', ')}. 중간본: ${workDir}`)
  return processed
}
