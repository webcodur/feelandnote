/**
 * 한국어 파일명 신화 초상화 세트를 C:\project\nobg 전용 도구로 순차 처리한다.
 * 한 번에 12장씩, rembg 프로세스는 항상 하나만 실행한다. DB와 R2는 건드리지 않는다.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const OUTPUT_DIR = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름'
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'manifest.json')
const FINAL_DIR = path.join(OUTPUT_DIR, '03-누끼-WebP')
const WORK_DIR = path.join(OUTPUT_DIR, '_nobg-work')
const ORIGINALS_DIR = path.join(WORK_DIR, 'originals')
const NOBG_DIR = path.join(WORK_DIR, 'nobg')
const NOBG_TOOL_DIR = 'C:\\project\\nobg\\batch'
const NOBG_TOOL = path.join(NOBG_TOOL_DIR, 'batch_nobg.py')
const CHUNK_SIZE = 12

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function clearFiles(dir) {
  mkdirSync(dir, { recursive: true })
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) throw new Error(`임시 작업 폴더의 예상 밖 항목: ${path.join(dir, entry.name)}`)
    rmSync(path.join(dir, entry.name))
  }
}

function expectedToolOutput(inputFile) {
  return path.join(NOBG_DIR, `${path.parse(inputFile).name}_nobg.webp`)
}

async function validateCutout(file) {
  const image = sharp(file)
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()])
  const alpha = stats.channels[3]
  if (metadata.format !== 'webp' || !metadata.width || metadata.width !== metadata.height) {
    throw new Error(`출력 형식/치수 오류: ${file} (${metadata.format} ${metadata.width}x${metadata.height})`)
  }
  if (!metadata.hasAlpha || stats.isOpaque || !alpha || alpha.min >= 250 || alpha.max <= 5) {
    throw new Error(`실제 투명 영역이 없는 누끼 출력: ${file}`)
  }
  return {
    width: metadata.width,
    height: metadata.height,
    alpha_min: alpha.min,
    alpha_max: alpha.max,
    alpha_mean: Number(alpha.mean.toFixed(2)),
  }
}

async function main() {
  if (!existsSync(NOBG_TOOL)) throw new Error(`nobg 전용 도구 누락: ${NOBG_TOOL}`)
  const manifest = readJson(MANIFEST_FILE)
  if (!Array.isArray(manifest.rows) || manifest.rows.length !== 198) {
    throw new Error(`매니페스트 대상 수 오류: ${manifest.rows?.length}`)
  }

  mkdirSync(FINAL_DIR, { recursive: true })
  clearFiles(ORIGINALS_DIR)
  clearFiles(NOBG_DIR)

  const completed = []
  const totalChunks = Math.ceil(manifest.rows.length / CHUNK_SIZE)
  for (let start = 0; start < manifest.rows.length; start += CHUNK_SIZE) {
    const chunk = manifest.rows.slice(start, start + CHUNK_SIZE)
    const chunkNumber = Math.floor(start / CHUNK_SIZE) + 1
    clearFiles(ORIGINALS_DIR)
    clearFiles(NOBG_DIR)

    for (const row of chunk) {
      if (!existsSync(row.nobg_input_file)) throw new Error(`누끼 입력 누락: ${row.nobg_input_file}`)
      copyFileSync(row.nobg_input_file, path.join(ORIGINALS_DIR, path.basename(row.nobg_input_file)))
    }

    console.log(JSON.stringify({ event: 'nobg_chunk_start', chunk: chunkNumber, total_chunks: totalChunks, rows: chunk.length }))
    const result = spawnSync('py', ['-3.12', NOBG_TOOL, 'rembg'], {
      cwd: NOBG_TOOL_DIR,
      env: { ...process.env, NOBG_WORK_DIR: WORK_DIR, PYTHONUTF8: '1' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    if (result.status !== 0) throw new Error(`nobg ${chunkNumber}/${totalChunks} 실패: exit ${result.status}`)

    for (const row of chunk) {
      const toolOutput = expectedToolOutput(row.nobg_input_file)
      if (!existsSync(toolOutput)) throw new Error(`nobg 출력 누락: ${toolOutput}`)
      const outputFile = row.nobg_output_file
      copyFileSync(toolOutput, outputFile)
      const validation = await validateCutout(outputFile)
      completed.push({ slug: row.slug, name_ko: row.name_ko, output_file: outputFile, ...validation })
    }
    console.log(JSON.stringify({ event: 'nobg_chunk_complete', chunk: chunkNumber, total_chunks: totalChunks, completed: completed.length }))
  }

  clearFiles(ORIGINALS_DIR)
  clearFiles(NOBG_DIR)
  const finalCount = readdirSync(FINAL_DIR).filter((name) => name.toLowerCase().endsWith('.webp')).length
  if (completed.length !== 198 || finalCount !== 198) {
    throw new Error(`최종 누끼 수 오류: 검증 ${completed.length}, 파일 ${finalCount}`)
  }

  manifest.nobg = {
    completed_at: new Date().toISOString(),
    tool: NOBG_TOOL,
    model: 'birefnet-general',
    process_count_at_once: 1,
    chunk_size: CHUNK_SIZE,
    output_count: finalCount,
    outputs: completed,
  }
  writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ event: 'nobg_batch_complete', outputs: finalCount, output: FINAL_DIR }))
}

await main()
