/** Remove backgrounds from the extra three mythology portraits with the project nobg tool. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const OUTPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-추가-3명-업로드본'
const MANIFEST_FILE = path.join(OUTPUT, 'manifest.json')
const WORK_DIR = path.join(OUTPUT, '_nobg-work')
const ORIGINALS_DIR = path.join(WORK_DIR, 'originals')
const NOBG_DIR = path.join(WORK_DIR, 'nobg')
const NOBG_TOOL_DIR = 'C:\\project\\nobg\\batch'
const NOBG_TOOL = path.join(NOBG_TOOL_DIR, 'batch_nobg.py')

function clearFiles(directory) {
  mkdirSync(directory, { recursive: true })
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile()) throw new Error(`Unexpected non-file in scratch directory: ${path.join(directory, entry.name)}`)
    rmSync(path.join(directory, entry.name))
  }
}

if (!existsSync(NOBG_TOOL)) throw new Error(`Missing nobg tool: ${NOBG_TOOL}`)
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
if (!Array.isArray(manifest.rows) || manifest.rows.length !== 3) {
  throw new Error(`Expected 3 manifest rows, got ${manifest.rows?.length}`)
}

clearFiles(ORIGINALS_DIR)
clearFiles(NOBG_DIR)
for (const row of manifest.rows) {
  if (!existsSync(row.nobg_input_file)) throw new Error(`Missing nobg input: ${row.nobg_input_file}`)
  copyFileSync(row.nobg_input_file, path.join(ORIGINALS_DIR, path.basename(row.nobg_input_file)))
}

const result = spawnSync('py', ['-3.12', NOBG_TOOL, 'rembg'], {
  cwd: NOBG_TOOL_DIR,
  env: { ...process.env, NOBG_WORK_DIR: WORK_DIR, PYTHONUTF8: '1' },
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})
if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.status !== 0) throw new Error(`nobg failed: exit ${result.status}`)

const completed = []
for (const row of manifest.rows) {
  const toolOutput = path.join(NOBG_DIR, `${row.name_ko}_nobg.webp`)
  if (!existsSync(toolOutput)) throw new Error(`Missing nobg output: ${toolOutput}`)
  copyFileSync(toolOutput, row.nobg_output_file)
  const image = sharp(row.nobg_output_file)
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()])
  const alpha = stats.channels[3]
  if (
    metadata.format !== 'webp' ||
    metadata.width !== metadata.height ||
    !metadata.hasAlpha ||
    stats.isOpaque ||
    !alpha ||
    alpha.min >= 250 ||
    alpha.max <= 5
  ) {
    throw new Error(`Invalid transparent output: ${row.slug}`)
  }
  completed.push({
    slug: row.slug,
    name_ko: row.name_ko,
    width: metadata.width,
    height: metadata.height,
    alpha_min: alpha.min,
    alpha_max: alpha.max,
    alpha_mean: Number(alpha.mean.toFixed(2)),
  })
}

clearFiles(ORIGINALS_DIR)
clearFiles(NOBG_DIR)
console.log(JSON.stringify({ completed: completed.length, outputs: completed, output: path.join(OUTPUT, '03-누끼-WebP') }, null, 2))
