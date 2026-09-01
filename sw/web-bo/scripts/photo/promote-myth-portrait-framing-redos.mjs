/** Promote the 19 accepted framing redos into the separate Korean upload-preparation set. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PROMPTS =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\framing-severe-redo-prompts.json'
const REDO =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\전체-v2-framing-redo-candidates'
const SET =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름'
const MANIFEST_FILE = path.join(SET, 'manifest.json')
const ORIGINAL_DIR = path.join(SET, '01-원본-PNG')
const NOBG_INPUT_DIR = path.join(SET, '02-누끼-입력-WebP')
const NOBG_OUTPUT_DIR = path.join(SET, '03-누끼-WebP')
const BACKUP_ROOT = path.join(SET, '_backup', '프레이밍-재생성-교체전')

function ensureCopy(source, destination) {
  if (!existsSync(source)) throw new Error(`Missing source file: ${source}`)
  mkdirSync(path.dirname(destination), { recursive: true })
  copyFileSync(source, destination)
}

function backupOnce(source, relativePath) {
  const destination = path.join(BACKUP_ROOT, relativePath)
  if (!existsSync(destination)) ensureCopy(source, destination)
}

const document = JSON.parse(readFileSync(PROMPTS, 'utf8'))
const rows = document.prompts
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
if (!Array.isArray(rows) || rows.length !== 19) throw new Error(`Expected 19 redo rows, got ${rows?.length}`)
if (!Array.isArray(manifest.rows) || manifest.rows.length !== 198) {
  throw new Error(`Expected 198 manifest rows, got ${manifest.rows?.length}`)
}

const manifestBySlug = new Map(manifest.rows.map((row) => [row.slug, row]))
for (const row of rows) {
  const target = manifestBySlug.get(row.slug)
  if (!target || target.name_ko !== row.name_ko) throw new Error(`Manifest identity mismatch: ${row.slug}`)

  const redoPng = path.join(REDO, `${row.slug}.png`)
  const redoInputWebp = path.join(REDO, '_누끼-입력', `${row.name_ko}.webp`)
  const redoCutoutWebp = path.join(REDO, '_누끼-통과본', `${row.name_ko}.webp`)
  const targetPng = path.join(ORIGINAL_DIR, `${row.name_ko}.png`)
  const targetInputWebp = path.join(NOBG_INPUT_DIR, `${row.name_ko}.webp`)
  const targetCutoutWebp = path.join(NOBG_OUTPUT_DIR, `${row.name_ko}.webp`)

  backupOnce(targetPng, path.join('01-원본-PNG', `${row.name_ko}.png`))
  backupOnce(targetInputWebp, path.join('02-누끼-입력-WebP', `${row.name_ko}.webp`))
  backupOnce(targetCutoutWebp, path.join('03-누끼-WebP', `${row.name_ko}.webp`))

  ensureCopy(redoPng, targetPng)
  ensureCopy(redoInputWebp, targetInputWebp)
  ensureCopy(redoCutoutWebp, targetCutoutWebp)

  const metadata = await sharp(targetPng).metadata()
  if (!metadata.width || metadata.width !== metadata.height || metadata.width < 1024) {
    throw new Error(`Unexpected promoted size: ${row.slug} (${metadata.width}x${metadata.height})`)
  }

  target.pre_framing_redo_source_file ??= target.source_file
  target.source_file = redoPng
  target.source_bytes = statSync(redoPng).size
  target.source_width = metadata.width
  target.source_height = metadata.height
  target.selected_framing_redo = true
  target.korean_original_file = targetPng
  target.nobg_input_file = targetInputWebp
  target.nobg_output_file = targetCutoutWebp
}

const promotedAt = new Date().toISOString()
manifest.generated_at = promotedAt
manifest.framing_redo = {
  promoted_at: promotedAt,
  selected_count: rows.length,
  source_directory: REDO,
  backup_directory: BACKUP_ROOT,
  original_sources_untouched: true,
  slugs: rows.map((row) => row.slug),
}
writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

for (const [label, directory] of [
  ['originals', ORIGINAL_DIR],
  ['nobg_inputs', NOBG_INPUT_DIR],
  ['cutouts', NOBG_OUTPUT_DIR],
]) {
  const count = readdirSync(directory).filter((name) => /\.(png|webp)$/i.test(name)).length
  if (count !== 198) throw new Error(`${label} count mismatch: ${count}`)
}

console.log(
  JSON.stringify(
    {
      event: 'framing_redos_promoted',
      promoted: rows.length,
      total: 198,
      upload_or_db_changes: 0,
      output: SET,
      backup: BACKUP_ROOT,
    },
    null,
    2,
  ),
)
