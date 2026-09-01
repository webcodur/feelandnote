/** Prepare Korean-named original and lossless WebP inputs for the extra three mythology avatars. */
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PROMPTS =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\추가-3명-초상화-프롬프트.json'
const GENERATED =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\추가-3명-후보-v2'
const OUTPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-추가-3명-업로드본'
const ORIGINAL_DIR = path.join(OUTPUT, '01-원본-PNG')
const NOBG_INPUT_DIR = path.join(OUTPUT, '02-누끼-입력-WebP')
const NOBG_OUTPUT_DIR = path.join(OUTPUT, '03-누끼-WebP')
const REVIEW_DIR = path.join(OUTPUT, '04-검수')
const UPLOAD_DIR = path.join(OUTPUT, '05-업로드-800-WebP')

const document = JSON.parse(readFileSync(PROMPTS, 'utf8'))
const rows = document.prompts
if (!Array.isArray(rows) || rows.length !== 3) throw new Error(`Expected 3 prompt rows, got ${rows?.length}`)
if (new Set(rows.map((row) => row.name_ko)).size !== rows.length) throw new Error('Duplicate Korean filenames')

for (const directory of [ORIGINAL_DIR, NOBG_INPUT_DIR, NOBG_OUTPUT_DIR, REVIEW_DIR, UPLOAD_DIR]) {
  mkdirSync(directory, { recursive: true })
}

const manifestRows = []
for (const [index, row] of rows.entries()) {
  const source = path.join(GENERATED, `${row.slug}.png`)
  const original = path.join(ORIGINAL_DIR, `${row.name_ko}.png`)
  const nobgInput = path.join(NOBG_INPUT_DIR, `${row.name_ko}.webp`)
  const nobgOutput = path.join(NOBG_OUTPUT_DIR, `${row.name_ko}.webp`)
  const metadata = await sharp(source).metadata()
  if (!metadata.width || metadata.width !== metadata.height || metadata.width < 1024) {
    throw new Error(`Invalid generated geometry: ${row.slug} ${metadata.width}x${metadata.height}`)
  }
  copyFileSync(source, original)
  await sharp(source).webp({ lossless: true, effort: 6 }).toFile(nobgInput)
  manifestRows.push({
    order: index + 1,
    target_id: row.target_id,
    slug: row.slug,
    name_ko: row.name_ko,
    name_en: row.name_en,
    source_file: source,
    source_bytes: statSync(source).size,
    source_width: metadata.width,
    source_height: metadata.height,
    korean_original_file: original,
    nobg_input_file: nobgInput,
    nobg_output_file: nobgOutput,
    upload_preview_file: path.join(UPLOAD_DIR, `${row.name_ko}.webp`),
  })
}

const manifest = {
  generated_at: new Date().toISOString(),
  applied_to_db_or_storage: false,
  source_count: manifestRows.length,
  original_sources_untouched: true,
  output_directory: OUTPUT,
  rows: manifestRows,
}
writeFileSync(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ prepared: manifestRows.length, output: OUTPUT }, null, 2))
