import { execFile } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'

interface ReframeRow {
  name: string
  crop?: { left: number; top: number; size: number }
  error?: string
  warnings?: string[]
}

/** 기존 CLI를 배치 한 번으로 실행해 모델을 공유한다. R2·DB는 건드리지 않는다. */
function runReframe(inputDir: string, outputDir: string): Promise<void> {
  const script = path.resolve('scripts/avatar/reframe.ts')
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['--import', 'tsx', script, inputDir, outputDir], {
      windowsHide: true,
      timeout: 5 * 60 * 1000,
      maxBuffer: 2 * 1024 * 1024,
    }, (error, _stdout, stderr) => {
      // exit 1은 개별 미검출/실패를 포함한 정상 보고다. 인물별로 _report.json을 읽는다.
      if (!error || (!error.killed && error.code === 1)) resolve()
      else reject(new Error(`reframe 실행 실패: ${stderr.trim().slice(-1200) || error.message}`))
    })
  })
}

/** nobg 결과를 전달하거나 reframe한다. 재배치 실패를 원본으로 대체해 성공 처리하지 않는다. */
export async function prepareNobgAvatars(
  workDir: string,
  { reframe = true, run = runReframe }: { reframe?: boolean; run?: typeof runReframe } = {},
): Promise<Map<string, { file?: string; error?: string }>> {
  if (!reframe) {
    const inputDir = path.join(workDir, 'nobg')
    const files = (await readdir(inputDir)).filter((file) => file.endsWith('_nobg.webp'))
    return new Map(files.map((file) => [path.parse(file).name, { file: path.join(inputDir, file) }]))
  }
  const outputDir = path.join(workDir, 'reframed')
  await run(path.join(workDir, 'nobg'), outputDir)
  const rows = JSON.parse(await readFile(path.join(outputDir, '_report.json'), 'utf8')) as ReframeRow[]
  return new Map<string, { file?: string; error?: string }>(rows.map((row) => {
    if (row.error || !row.crop) return [row.name, { error: row.error || 'reframe 결과가 없습니다.' }]
    if (row.warnings?.length) console.warn(`[reframe] ${row.name}: ${row.warnings.join(' / ')}`)
    return [row.name, { file: path.join(outputDir, `${row.name}.webp`) }]
  }))
}

/** nobg만 고르면 구도를 보존해 최종 인코딩하고, reframe 완성본은 재압축하지 않는다. */
export async function encodeNobgAvatar(result: Buffer, reframed: boolean): Promise<Buffer> {
  if (reframed) {
    const metadata = await sharp(result).metadata()
    if (metadata.width !== CELEB_AVATAR_ORIGINAL.sizePx || metadata.height !== CELEB_AVATAR_ORIGINAL.sizePx) {
      throw new Error('reframe 결과 크기가 아바타 규격과 다릅니다.')
    }
    return result
  }
  return sharp(result)
    .resize(CELEB_AVATAR_ORIGINAL.sizePx, CELEB_AVATAR_ORIGINAL.sizePx, {
      fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality })
    .toBuffer()
}
