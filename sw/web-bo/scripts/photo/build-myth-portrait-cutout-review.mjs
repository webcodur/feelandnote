/**
 * 신화 초상화 원본과 누끼 결과를 서비스 배경/밝은 배경에 나란히 놓아 전수 검수표를 만든다.
 * DB와 R2는 건드리지 않는다.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름'
const MANIFEST_FILE = path.join(ROOT, 'manifest.json')
const REVIEW_DIR = path.join(ROOT, '04-검수')
const PANEL = 180
const LABEL = 34
const COLS = 4
const ROWS = 5
const PER_SHEET = COLS * ROWS
const CELL_WIDTH = PANEL * 3
const CELL_HEIGHT = PANEL + LABEL

function labelSvg(text) {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return Buffer.from(`<svg width="${CELL_WIDTH}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CELL_WIDTH}" height="${LABEL}" fill="#171a20"/>
    <text x="8" y="23" font-family="Segoe UI, Malgun Gothic, sans-serif" font-size="16" fill="#f3f4f6">${escaped}</text>
    <text x="${PANEL + 8}" y="23" font-family="Segoe UI, sans-serif" font-size="12" fill="#aab2c0">service #0a0a0a</text>
    <text x="${PANEL * 2 + 8}" y="23" font-family="Segoe UI, sans-serif" font-size="12" fill="#aab2c0">light edge check</text>
  </svg>`)
}

async function renderSquare(file, background) {
  return sharp(file)
    .resize(PANEL, PANEL, { fit: 'contain' })
    .flatten({ background })
    .png()
    .toBuffer()
}

async function alphaGeometry(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  let pixels = 0
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3]
      if (alpha <= 10) continue
      pixels += 1
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (!pixels) throw new Error(`전부 투명한 누끼 결과: ${file}`)
  return {
    alpha_bbox: { min_x: minX, min_y: minY, max_x: maxX, max_y: maxY },
    alpha_area_ratio: Number((pixels / (info.width * info.height)).toFixed(4)),
    touches_top: minY === 0,
    touches_left: minX === 0,
    touches_right: maxX === info.width - 1,
    touches_bottom: maxY === info.height - 1,
  }
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
  if (!Array.isArray(manifest.rows) || manifest.rows.length !== 198) throw new Error('매니페스트 198명 확인 실패')
  const outputCount = readdirSync(path.join(ROOT, '03-누끼-WebP')).filter((name) => name.endsWith('.webp')).length
  if (outputCount !== 198) throw new Error(`누끼 결과가 아직 198장이 아님: ${outputCount}`)
  mkdirSync(REVIEW_DIR, { recursive: true })

  const reviewRows = []
  for (let start = 0, sheetNumber = 1; start < manifest.rows.length; start += PER_SHEET, sheetNumber += 1) {
    const rows = manifest.rows.slice(start, start + PER_SHEET)
    const overlays = []
    for (const [offset, row] of rows.entries()) {
      if (!existsSync(row.korean_original_file) || !existsSync(row.nobg_output_file)) {
        throw new Error(`검수 입력 누락: ${row.name_ko}`)
      }
      const left = (offset % COLS) * CELL_WIDTH
      const top = Math.floor(offset / COLS) * CELL_HEIGHT
      overlays.push({ input: labelSvg(`${start + offset + 1}. ${row.name_ko} · ${row.slug}`), left, top })
      overlays.push({ input: await renderSquare(row.korean_original_file, '#30343b'), left, top: top + LABEL })
      overlays.push({ input: await renderSquare(row.nobg_output_file, '#0a0a0a'), left: left + PANEL, top: top + LABEL })
      overlays.push({ input: await renderSquare(row.nobg_output_file, '#e2e5e9'), left: left + PANEL * 2, top: top + LABEL })
      reviewRows.push({
        order: row.order,
        target_id: row.target_id,
        slug: row.slug,
        name_ko: row.name_ko,
        sheet: `누끼-검수-${String(sheetNumber).padStart(2, '0')}.jpg`,
        cell: offset + 1,
        ...(await alphaGeometry(row.nobg_output_file)),
      })
    }
    const usedRows = Math.ceil(rows.length / COLS)
    await sharp({
      create: {
        width: CELL_WIDTH * COLS,
        height: CELL_HEIGHT * usedRows,
        channels: 3,
        background: '#101217',
      },
    })
      .composite(overlays)
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
      .toFile(path.join(REVIEW_DIR, `누끼-검수-${String(sheetNumber).padStart(2, '0')}.jpg`))
  }

  const report = {
    generated_at: new Date().toISOString(),
    rows: reviewRows.length,
    sheets: Math.ceil(reviewRows.length / PER_SHEET),
    columns_per_cell: ['original', 'cutout_on_service_background', 'cutout_on_light_background'],
    top_edge_contact_count: reviewRows.filter((row) => row.touches_top).length,
    rows_detail: reviewRows,
  }
  writeFileSync(path.join(REVIEW_DIR, '누끼-검수-지표.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ event: 'cutout_review_built', rows: report.rows, sheets: report.sheets, top_edge_contact_count: report.top_edge_contact_count, output: REVIEW_DIR }))
}

await main()
