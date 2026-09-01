/** Build labeled before/after sheets for the Priam-scale mythology avatar correction. */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프리아모스-동일크기-재업로드본'
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const rows = manifest.rows
const REVIEW_DIR = path.join(ROOT, '02-검수')
const OLD_MAIN =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름\\05-업로드-800-WebP'
const OLD_EXTRA =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-추가-3명-업로드본\\05-업로드-800-WebP'
const COLS = 4
const ROWS = 5
const PER_SHEET = COLS * ROWS
const IMAGE = 230
const LABEL = 54
const CELL_WIDTH = IMAGE * 2
const CELL_HEIGHT = LABEL + IMAGE

const escapeXml = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

for (let start = 0; start < rows.length; start += PER_SHEET) {
  const page = rows.slice(start, start + PER_SHEET)
  const composites = []
  for (const [offset, row] of page.entries()) {
    const x = (offset % COLS) * CELL_WIDTH
    const y = Math.floor(offset / COLS) * CELL_HEIGHT
    const label = Buffer.from(`<svg width="${CELL_WIDTH}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CELL_WIDTH}" height="${LABEL}" fill="#171a20"/>
      <text x="8" y="22" font-family="Malgun Gothic,Arial" font-size="16" font-weight="700" fill="#fff">${start + offset + 1}. ${escapeXml(row.name_ko)}</text>
      <text x="8" y="44" font-family="Arial" font-size="12" fill="#94a3b8">이전</text>
      <text x="${IMAGE + 8}" y="44" font-family="Arial" font-size="12" fill="#86efac">46 / 81 교정</text>
    </svg>`)
    const oldPreview =
      row.old_preview_file ??
      path.join(row.batch === 'main-198' ? OLD_MAIN : OLD_EXTRA, `${row.name_ko}.webp`)
    const before = await sharp(oldPreview)
      .resize(IMAGE, IMAGE, { fit: 'contain' })
      .flatten({ background: '#090a0d' })
      .png()
      .toBuffer()
    const after = await sharp(row.corrected_file)
      .resize(IMAGE, IMAGE, { fit: 'contain' })
      .flatten({ background: '#090a0d' })
      .png()
      .toBuffer()
    composites.push({ input: label, left: x, top: y })
    composites.push({ input: before, left: x, top: y + LABEL })
    composites.push({ input: after, left: x + IMAGE, top: y + LABEL })
  }
  const pageNo = String(Math.floor(start / PER_SHEET) + 1).padStart(2, '0')
  await sharp({
    create: {
      width: COLS * CELL_WIDTH,
      height: ROWS * CELL_HEIGHT,
      channels: 3,
      background: '#101217',
    },
  })
    .composite(composites)
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toFile(path.join(REVIEW_DIR, `이전-교정-비교-${pageNo}.jpg`))
}

console.log(JSON.stringify({ rows: rows.length, sheets: Math.ceil(rows.length / PER_SHEET), review: REVIEW_DIR }, null, 2))
