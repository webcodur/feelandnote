/** Remove backgrounds from only the accepted mythology framing-redo portraits. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const PROMPTS =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\framing-severe-redo-prompts.json'
const REDO =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\전체-v2-framing-redo-candidates'
const INPUT_DIR = path.join(REDO, '_누끼-입력')
const FINAL_DIR = path.join(REDO, '_누끼-통과본')
const WORK_DIR = path.join(REDO, '_nobg-work')
const ORIGINALS_DIR = path.join(WORK_DIR, 'originals')
const NOBG_DIR = path.join(WORK_DIR, 'nobg')
const NOBG_TOOL_DIR = 'C:\\project\\nobg\\batch'
const NOBG_TOOL = path.join(NOBG_TOOL_DIR, 'batch_nobg.py')
const CHUNK_SIZE = 12

function clearFiles(dir) {
  mkdirSync(dir, { recursive: true })
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) throw new Error(`Unexpected non-file in scratch directory: ${path.join(dir, entry.name)}`)
    rmSync(path.join(dir, entry.name))
  }
}

async function validateCutout(file) {
  const image = sharp(file)
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()])
  const alpha = stats.channels[3]
  if (metadata.format !== 'webp' || metadata.width !== metadata.height || !metadata.hasAlpha) {
    throw new Error(`Invalid cutout format: ${file}`)
  }
  if (stats.isOpaque || !alpha || alpha.min >= 250 || alpha.max <= 5) {
    throw new Error(`No meaningful transparent region: ${file}`)
  }
  return {
    width: metadata.width,
    height: metadata.height,
    alpha_min: alpha.min,
    alpha_max: alpha.max,
    alpha_mean: Number(alpha.mean.toFixed(2)),
  }
}

if (!existsSync(NOBG_TOOL)) throw new Error(`Missing nobg tool: ${NOBG_TOOL}`)
const document = JSON.parse(readFileSync(PROMPTS, 'utf8'))
const rows = document.prompts
if (!Array.isArray(rows) || rows.length !== 19) throw new Error(`Expected 19 redo rows, got ${rows?.length}`)
if (new Set(rows.map((row) => row.name_ko)).size !== rows.length) throw new Error('Korean filenames are not unique')

mkdirSync(INPUT_DIR, { recursive: true })
mkdirSync(FINAL_DIR, { recursive: true })
clearFiles(INPUT_DIR)
clearFiles(FINAL_DIR)
clearFiles(ORIGINALS_DIR)
clearFiles(NOBG_DIR)

for (const row of rows) {
  const source = path.join(REDO, `${row.slug}.png`)
  if (!existsSync(source)) throw new Error(`Missing accepted redo: ${source}`)
  await sharp(source).webp({ lossless: true, effort: 6 }).toFile(path.join(INPUT_DIR, `${row.name_ko}.webp`))
}

const completed = []
const totalChunks = Math.ceil(rows.length / CHUNK_SIZE)
for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
  const chunk = rows.slice(start, start + CHUNK_SIZE)
  const chunkNumber = Math.floor(start / CHUNK_SIZE) + 1
  clearFiles(ORIGINALS_DIR)
  clearFiles(NOBG_DIR)

  for (const row of chunk) {
    copyFileSync(path.join(INPUT_DIR, `${row.name_ko}.webp`), path.join(ORIGINALS_DIR, `${row.name_ko}.webp`))
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
  if (result.status !== 0) throw new Error(`nobg failed for chunk ${chunkNumber}/${totalChunks}: exit ${result.status}`)

  for (const row of chunk) {
    const toolOutput = path.join(NOBG_DIR, `${row.name_ko}_nobg.webp`)
    const output = path.join(FINAL_DIR, `${row.name_ko}.webp`)
    if (!existsSync(toolOutput)) throw new Error(`Missing nobg output: ${toolOutput}`)
    copyFileSync(toolOutput, output)
    completed.push({ slug: row.slug, name_ko: row.name_ko, output, ...(await validateCutout(output)) })
  }
  console.log(JSON.stringify({ event: 'nobg_chunk_complete', chunk: chunkNumber, completed: completed.length }))
}

clearFiles(ORIGINALS_DIR)
clearFiles(NOBG_DIR)
const finalCount = readdirSync(FINAL_DIR).filter((name) => name.toLowerCase().endsWith('.webp')).length
if (completed.length !== rows.length || finalCount !== rows.length) {
  throw new Error(`Final count mismatch: validated=${completed.length}, files=${finalCount}`)
}

console.log(JSON.stringify({ event: 'framing_redo_nobg_complete', outputs: finalCount, output: FINAL_DIR }))
