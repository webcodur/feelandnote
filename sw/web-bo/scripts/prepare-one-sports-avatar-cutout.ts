/**
 * C:\project\nobg 전용 도구로 스포츠 팩션 아바타 재료 한 장만 배경 제거한다.
 *
 * 한 번 실행할 때 입력 파일이 정확히 한 장인지 확인하고, 완료 직후 입력·출력을
 * 작업 폴더 밖으로 옮긴다. 여러 장 병렬 실행은 의도적으로 지원하지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/prepare-one-sports-avatar-cutout.ts <slug> <source-jpg>
 */

import { spawnSync } from 'node:child_process'
import { mkdir, readdir, rename } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const [, , slug, sourceArg] = process.argv
if (!slug || !sourceArg) throw new Error('slug와 원본 이미지 경로가 필요합니다.')
if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`slug 형식이 잘못됐습니다: ${slug}`)

const NOBG_BATCH = 'C:\\project\\nobg\\batch'
const ORIGINALS = path.join(NOBG_BATCH, 'batch_work', 'originals')
const NOBG = path.join(NOBG_BATCH, 'batch_work', 'nobg')
const STAGING = 'C:\\project\\feelandnote\\sw\\remotion\\public\\factions\\_staging\\avatar-cutouts'
const SOURCE_STAGING = path.join(STAGING, 'source-webp')

async function assertEmpty(dir: string, label: string) {
  const entries = await readdir(dir)
  if (entries.length !== 0) throw new Error(`${label} 폴더가 비어 있지 않습니다: ${entries.join(', ')}`)
}

async function main() {
  const source = path.resolve(sourceArg)
  await mkdir(SOURCE_STAGING, { recursive: true })
  await assertEmpty(ORIGINALS, 'nobg originals')
  await assertEmpty(NOBG, 'nobg output')

  const input = path.join(ORIGINALS, `${slug}.webp`)
  await sharp(source).webp({ quality: 98 }).toFile(input)

  const run = spawnSync('py', ['-3.12', 'batch_nobg.py', 'rembg'], {
    cwd: NOBG_BATCH,
    stdio: 'inherit',
    shell: false,
  })
  if (run.status !== 0) throw new Error(`nobg 실패: ${slug} (${run.status})`)

  const result = path.join(NOBG, `${slug}_nobg.webp`)
  await rename(input, path.join(SOURCE_STAGING, `${slug}.webp`))
  await rename(result, path.join(STAGING, `${slug}_nobg.webp`))
  await assertEmpty(ORIGINALS, 'nobg originals')
  await assertEmpty(NOBG, 'nobg output')
  console.log(`DONE ${slug}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
