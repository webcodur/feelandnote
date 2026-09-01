/** Build one labeled original/dark/light review sheet for the extra three mythology avatars. */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const OUTPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-추가-3명-업로드본'
const manifest = JSON.parse(readFileSync(path.join(OUTPUT, 'manifest.json'), 'utf8'))
const rows = manifest.rows
const IMAGE = 300
const LABEL = 76
const CELL_WIDTH = IMAGE * 3

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

const composites = []
for (const [index, row] of rows.entries()) {
  const top = index * (LABEL + IMAGE)
  const label = Buffer.from(`<svg width="${CELL_WIDTH}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CELL_WIDTH}" height="${LABEL}" fill="#171a20"/>
    <text x="12" y="27" font-family="Malgun Gothic, Noto Sans CJK KR, Arial" font-size="22" font-weight="700" fill="#ffffff">${index + 1}. ${escapeXml(row.name_ko)}</text>
    <text x="12" y="52" font-family="Arial" font-size="15" fill="#cbd5e1">${escapeXml(row.slug)}</text>
    <text x="116" y="73" font-family="Malgun Gothic, Arial" font-size="13" fill="#94a3b8">생성본</text>
    <text x="408" y="73" font-family="Malgun Gothic, Arial" font-size="13" fill="#86efac">검은 배경</text>
    <text x="708" y="73" font-family="Malgun Gothic, Arial" font-size="13" fill="#0f172a">밝은 배경</text>
  </svg>`)
  const original = await sharp(row.korean_original_file).resize(IMAGE, IMAGE, { fit: 'contain' }).png().toBuffer()
  const dark = await sharp(row.nobg_output_file)
    .resize(IMAGE, IMAGE, { fit: 'contain' })
    .flatten({ background: '#0a0a0a' })
    .png()
    .toBuffer()
  const light = await sharp(row.nobg_output_file)
    .resize(IMAGE, IMAGE, { fit: 'contain' })
    .flatten({ background: '#e5e7eb' })
    .png()
    .toBuffer()
  composites.push({ input: label, left: 0, top })
  composites.push({ input: original, left: 0, top: top + LABEL })
  composites.push({ input: dark, left: IMAGE, top: top + LABEL })
  composites.push({ input: light, left: IMAGE * 2, top: top + LABEL })
}

const file = path.join(OUTPUT, '04-검수', '추가-3명-누끼-검수표.jpg')
await sharp({
  create: {
    width: CELL_WIDTH,
    height: rows.length * (LABEL + IMAGE),
    channels: 3,
    background: '#101217',
  },
})
  .composite(composites)
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(file)

console.log(JSON.stringify({ rows: rows.length, file }, null, 2))
