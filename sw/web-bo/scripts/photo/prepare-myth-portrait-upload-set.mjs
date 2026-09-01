/**
 * 신화 인물 초상화 최종본을 한글 파일명으로 합치고 nobg 입력용 무손실 WebP를 만든다.
 * DB, R2, 기존 생성본은 건드리지 않는다.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const PROMPTS_FILE = path.join(ROOT, '개인초상화-프롬프트', 'portrait-prompts.json')
const BASE_DIR = path.join(ROOT, '개인초상화-생성본', '전체-v2')
const REDO_DIR = path.join(ROOT, '개인초상화-생성본', '전체-v2-redo-selected')
const OUTPUT_DIR = path.join(ROOT, '개인초상화-업로드본-한국이름')
const ORIGINAL_DIR = path.join(OUTPUT_DIR, '01-원본-PNG')
const NOBG_INPUT_DIR = path.join(OUTPUT_DIR, '02-누끼-입력-WebP')
const NOBG_OUTPUT_DIR = path.join(OUTPUT_DIR, '03-누끼-WebP')
const REVIEW_DIR = path.join(OUTPUT_DIR, '04-검수')
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'manifest.json')

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function koreanFilename(name) {
  const safe = name.replace(/[<>:"/\\|?*]/gu, '_').replace(/[. ]+$/gu, '').trim()
  if (!safe) throw new Error(`사용할 수 없는 한국어 이름: ${JSON.stringify(name)}`)
  return safe
}

function listPngStems(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => path.parse(entry.name).name)
    .sort()
}

async function main() {
  const envelope = readJson(PROMPTS_FILE)
  const rows = envelope.prompts
  if (!Array.isArray(rows) || rows.length !== 198) {
    throw new Error(`프롬프트 대상 수 오류: ${Array.isArray(rows) ? rows.length : '배열 아님'}`)
  }

  const slugs = rows.map((row) => row.slug)
  const targetIds = rows.map((row) => row.target_id)
  const koNames = rows.map((row) => koreanFilename(row.name_ko))
  for (const [label, values] of [['slug', slugs], ['target_id', targetIds], ['한국어 파일명', koNames]]) {
    const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
    if (duplicates.length) throw new Error(`${label} 중복: ${duplicates.join(', ')}`)
  }

  const redoSlugs = listPngStems(REDO_DIR)
  const unknownRedo = redoSlugs.filter((slug) => !slugs.includes(slug))
  if (unknownRedo.length) throw new Error(`대상에 없는 재생성본: ${unknownRedo.join(', ')}`)
  if (redoSlugs.length !== 8) throw new Error(`재생성 선별본 수 오류: ${redoSlugs.length}`)

  for (const dir of [OUTPUT_DIR, ORIGINAL_DIR, NOBG_INPUT_DIR, NOBG_OUTPUT_DIR, REVIEW_DIR]) {
    mkdirSync(dir, { recursive: true })
  }

  const manifestRows = []
  for (const [index, row] of rows.entries()) {
    const selectedOverride = redoSlugs.includes(row.slug)
    const sourceFile = path.join(selectedOverride ? REDO_DIR : BASE_DIR, `${row.slug}.png`)
    if (!existsSync(sourceFile)) throw new Error(`소스 누락: ${sourceFile}`)

    const name = koreanFilename(row.name_ko)
    const koreanPng = path.join(ORIGINAL_DIR, `${name}.png`)
    const nobgInput = path.join(NOBG_INPUT_DIR, `${name}.webp`)
    copyFileSync(sourceFile, koreanPng)
    await sharp(sourceFile).webp({ lossless: true, effort: 6 }).toFile(nobgInput)

    const metadata = await sharp(sourceFile).metadata()
    if (!metadata.width || !metadata.height || metadata.width !== metadata.height) {
      throw new Error(`정사각형이 아닌 소스: ${sourceFile} (${metadata.width}x${metadata.height})`)
    }

    manifestRows.push({
      order: index + 1,
      target_id: row.target_id,
      slug: row.slug,
      name_ko: row.name_ko,
      tradition: row.tradition,
      source_file: sourceFile,
      source_bytes: statSync(sourceFile).size,
      source_width: metadata.width,
      source_height: metadata.height,
      selected_override: selectedOverride,
      korean_original_file: koreanPng,
      nobg_input_file: nobgInput,
      nobg_output_file: path.join(NOBG_OUTPUT_DIR, `${name}.webp`),
    })
  }

  const pngCount = listPngStems(ORIGINAL_DIR).length
  const webpCount = readdirSync(NOBG_INPUT_DIR).filter((name) => name.toLowerCase().endsWith('.webp')).length
  if (pngCount !== 198 || webpCount !== 198) {
    throw new Error(`출력 수 오류: PNG ${pngCount}, WebP ${webpCount}`)
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    applied_to_db_or_storage: false,
    source_count: rows.length,
    override_count: redoSlugs.length,
    korean_original_count: pngCount,
    nobg_input_count: webpCount,
    output_directory: OUTPUT_DIR,
    rows: manifestRows,
  }
  writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    event: 'myth_portrait_upload_set_prepared',
    rows: manifestRows.length,
    overrides: redoSlugs,
    output: OUTPUT_DIR,
    manifest: MANIFEST_FILE,
  }))
}

await main()
