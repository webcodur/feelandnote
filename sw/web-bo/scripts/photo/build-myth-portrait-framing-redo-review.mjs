/** Build a single labeled original-versus-redo review sheet for framing repairs. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PROMPTS =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\framing-severe-redo-prompts.json'
const REDO =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\전체-v2-framing-redo-candidates'
const ORIGINAL =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\전체-v2'
const OUTPUT = path.join(REDO, '_검수')
const CUTOUT = path.join(REDO, '_누끼-통과본')

const IMAGE = 240
const LABEL = 70
const PAIR_WIDTH = IMAGE * 2
const COLUMNS = 4

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function labelSvg(number, nameKo, slug) {
  return Buffer.from(`<svg width="${PAIR_WIDTH}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${PAIR_WIDTH}" height="${LABEL}" fill="#171a20"/>
    <text x="10" y="25" font-family="Malgun Gothic, Noto Sans CJK KR, Arial" font-size="18" font-weight="700" fill="#ffffff">${number}. ${escapeXml(nameKo)}</text>
    <text x="10" y="50" font-family="Arial" font-size="14" fill="#cbd5e1">${escapeXml(slug)}</text>
    <text x="96" y="67" font-family="Malgun Gothic, Arial" font-size="13" fill="#94a3b8">기존</text>
    <text x="326" y="67" font-family="Malgun Gothic, Arial" font-size="13" fill="#86efac">재생성</text>
  </svg>`)
}

const document = JSON.parse(readFileSync(PROMPTS, 'utf8'))
const rows = document.prompts
if (!Array.isArray(rows) || rows.length === 0) throw new Error('No redo prompts found')

mkdirSync(OUTPUT, { recursive: true })
const composites = []
const index = []

for (const [offset, row] of rows.entries()) {
  const left = (offset % COLUMNS) * PAIR_WIDTH
  const top = Math.floor(offset / COLUMNS) * (LABEL + IMAGE)
  const original = path.join(ORIGINAL, `${row.slug}.png`)
  const redo = path.join(REDO, `${row.slug}.png`)
  if (!existsSync(original) || !existsSync(redo)) throw new Error(`Missing comparison input: ${row.slug}`)

  composites.push({ input: labelSvg(offset + 1, row.name_ko, row.slug), left, top })
  composites.push({
    input: await sharp(original).resize(IMAGE, IMAGE, { fit: 'contain', background: '#0a0a0a' }).png().toBuffer(),
    left,
    top: top + LABEL,
  })
  composites.push({
    input: await sharp(redo).resize(IMAGE, IMAGE, { fit: 'contain', background: '#0a0a0a' }).png().toBuffer(),
    left: left + IMAGE,
    top: top + LABEL,
  })
  index.push({ number: offset + 1, slug: row.slug, name_ko: row.name_ko, original, redo })
}

const reviewFile = path.join(OUTPUT, '프레이밍-재생성-비교표.jpg')
await sharp({
  create: {
    width: COLUMNS * PAIR_WIDTH,
    height: Math.ceil(rows.length / COLUMNS) * (LABEL + IMAGE),
    channels: 3,
    background: '#101217',
  },
})
  .composite(composites)
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(reviewFile)

writeFileSync(path.join(OUTPUT, '프레이밍-재생성-비교표.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')

const CUTOUT_IMAGE = 160
const CUTOUT_LABEL = 60
const CUTOUT_CELL_WIDTH = CUTOUT_IMAGE * 3
const cutoutComposites = []

for (const [offset, row] of rows.entries()) {
  const left = (offset % COLUMNS) * CUTOUT_CELL_WIDTH
  const top = Math.floor(offset / COLUMNS) * (CUTOUT_LABEL + CUTOUT_IMAGE)
  const redo = path.join(REDO, `${row.slug}.png`)
  const cutout = path.join(CUTOUT, `${row.name_ko}.webp`)
  if (!existsSync(cutout)) throw new Error(`Missing cutout input: ${row.name_ko}`)

  const label = Buffer.from(`<svg width="${CUTOUT_CELL_WIDTH}" height="${CUTOUT_LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CUTOUT_CELL_WIDTH}" height="${CUTOUT_LABEL}" fill="#171a20"/>
    <text x="8" y="23" font-family="Malgun Gothic, Noto Sans CJK KR, Arial" font-size="17" font-weight="700" fill="#ffffff">${offset + 1}. ${escapeXml(row.name_ko)}</text>
    <text x="8" y="45" font-family="Arial" font-size="12" fill="#cbd5e1">${escapeXml(row.slug)}</text>
    <text x="58" y="58" font-family="Malgun Gothic, Arial" font-size="11" fill="#94a3b8">생성본</text>
    <text x="212" y="58" font-family="Malgun Gothic, Arial" font-size="11" fill="#86efac">검은 배경</text>
    <text x="378" y="58" font-family="Malgun Gothic, Arial" font-size="11" fill="#0f172a">밝은 배경</text>
  </svg>`)
  const generatedPreview = await sharp(redo).resize(CUTOUT_IMAGE, CUTOUT_IMAGE, { fit: 'contain' }).png().toBuffer()
  const darkPreview = await sharp(cutout)
    .resize(CUTOUT_IMAGE, CUTOUT_IMAGE, { fit: 'contain' })
    .flatten({ background: '#0a0a0a' })
    .png()
    .toBuffer()
  const lightPreview = await sharp(cutout)
    .resize(CUTOUT_IMAGE, CUTOUT_IMAGE, { fit: 'contain' })
    .flatten({ background: '#e5e7eb' })
    .png()
    .toBuffer()

  cutoutComposites.push({ input: label, left, top })
  cutoutComposites.push({ input: generatedPreview, left, top: top + CUTOUT_LABEL })
  cutoutComposites.push({ input: darkPreview, left: left + CUTOUT_IMAGE, top: top + CUTOUT_LABEL })
  cutoutComposites.push({ input: lightPreview, left: left + CUTOUT_IMAGE * 2, top: top + CUTOUT_LABEL })
}

const cutoutReviewFile = path.join(OUTPUT, '프레이밍-재생성-누끼-검수표.jpg')
await sharp({
  create: {
    width: COLUMNS * CUTOUT_CELL_WIDTH,
    height: Math.ceil(rows.length / COLUMNS) * (CUTOUT_LABEL + CUTOUT_IMAGE),
    channels: 3,
    background: '#101217',
  },
})
  .composite(cutoutComposites)
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(cutoutReviewFile)

console.log(
  JSON.stringify(
    { comparisons: index.length, review_file: reviewFile, cutout_review_file: cutoutReviewFile, output: OUTPUT },
    null,
    2,
  ),
)
