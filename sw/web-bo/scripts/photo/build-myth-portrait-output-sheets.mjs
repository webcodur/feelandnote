/** Build labeled local contact sheets for mythology portrait output review. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PROMPTS = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\portrait-prompts.json'
const IMAGES = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\전체-v2'
const OUTPUT = path.join(IMAGES, '_review-sheets')
const CELL = 256
const LABEL = 30
const COLS = 6
const ROWS = 6
const PER_SHEET = COLS * ROWS

function labelSvg(text) {
  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  return Buffer.from(`<svg width="${CELL}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CELL}" height="${LABEL}" fill="#171a20"/>
    <text x="7" y="21" font-family="Arial, sans-serif" font-size="14" fill="#f3f4f6">${escaped}</text>
  </svg>`)
}

const document = JSON.parse(readFileSync(PROMPTS, 'utf8'))
mkdirSync(OUTPUT, { recursive: true })
const index = []

for (let start = 0, sheet = 1; start < document.prompts.length; start += PER_SHEET, sheet += 1) {
  const rows = document.prompts.slice(start, start + PER_SHEET)
  const overlays = []
  for (const [offset, row] of rows.entries()) {
    const source = path.join(IMAGES, `${row.slug}.png`)
    if (!existsSync(source)) throw new Error(`Missing portrait: ${source}`)
    const left = (offset % COLS) * CELL
    const top = Math.floor(offset / COLS) * (CELL + LABEL)
    const image = await sharp(source).resize(CELL, CELL, { fit: 'cover' }).png().toBuffer()
    overlays.push({ input: labelSvg(`${start + offset + 1}. ${row.slug}`), left, top })
    overlays.push({ input: image, left, top: top + LABEL })
    index.push({
      number: start + offset + 1,
      slug: row.slug,
      name_ko: row.name_ko,
      tradition: row.tradition,
      sheet: `sheet-${String(sheet).padStart(2, '0')}.jpg`,
      cell: offset + 1,
      generated_before_framing_fix: start + offset < 105,
      face_model_removed: row.reference_kind === 'no_reference_human',
    })
  }
  const usedRows = Math.ceil(rows.length / COLS)
  const file = path.join(OUTPUT, `sheet-${String(sheet).padStart(2, '0')}.jpg`)
  await sharp({
    create: {
      width: CELL * COLS,
      height: usedRows * (CELL + LABEL),
      channels: 3,
      background: '#101217',
    },
  })
    .composite(overlays)
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(file)
}

writeFileSync(path.join(OUTPUT, 'sheet-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ portraits: index.length, sheets: Math.ceil(index.length / PER_SHEET), output: OUTPUT }, null, 2))
