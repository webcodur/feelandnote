/** Build one labeled original-versus-redo sheet for the severe mythology set. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본'
const ORIGINAL = path.join(ROOT, '전체-v2')
const REDO = path.join(ROOT, '전체-v2-redo-selected')
const OUTPUT = path.join(REDO, '_comparison')
const IMAGE = 300
const LABEL = 70
const PAIR_WIDTH = IMAGE * 2
const PAIRS_PER_ROW = 2

const ROWS = [
  ['igraine', '이그레인', '폐기된 얼굴 REF를 버리고 새 얼굴로 캐스팅'],
  ['boyi-kao', '백읍고', '폐기된 AI 얼굴 REF를 버리고 새 얼굴로 캐스팅'],
  ['huang-feihu', '황비호', '폐기된 AI 얼굴 REF를 버리고 새 얼굴로 캐스팅'],
  ['shen-gongbao', '신공표', '폐기된 AI 얼굴 REF를 버리고 새 얼굴로 캐스팅'],
  ['hoori', '호오리', '현대 미용실형 머리를 고대 야마토 도상형 머리로 교체'],
  ['futodama', '후토다마', '얼굴 REF에서 복제된 현대 안경 제거'],
  ['ugayafukiaezu', '우가야후키아에즈', '현대식 레이어드 머리를 목덜미 결속형 고대식 장발로 교체'],
  ['ningishzida', '닌기쉬지다', '현대 안경 제거 후 정면 중심축까지 재교정'],
]

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function labelSvg(number, nameKo, slug, reason) {
  return Buffer.from(`<svg width="${PAIR_WIDTH}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${PAIR_WIDTH}" height="${LABEL}" fill="#171a20"/>
    <text x="10" y="24" font-family="Malgun Gothic, Noto Sans CJK KR, Arial" font-size="17" font-weight="700" fill="#ffffff">${number}. ${escapeXml(nameKo)} · ${escapeXml(slug)}</text>
    <text x="10" y="50" font-family="Malgun Gothic, Noto Sans CJK KR, Arial" font-size="14" fill="#cbd5e1">${escapeXml(reason)}</text>
    <text x="235" y="66" font-family="Malgun Gothic, Arial" font-size="13" fill="#94a3b8">기존</text>
    <text x="523" y="66" font-family="Malgun Gothic, Arial" font-size="13" fill="#86efac">재생성</text>
  </svg>`)
}

mkdirSync(OUTPUT, { recursive: true })
const overlays = []
const index = []

for (const [offset, [slug, nameKo, reason]] of ROWS.entries()) {
  const col = offset % PAIRS_PER_ROW
  const row = Math.floor(offset / PAIRS_PER_ROW)
  const left = col * PAIR_WIDTH
  const top = row * (LABEL + IMAGE)
  const original = path.join(ORIGINAL, `${slug}.png`)
  const redo = path.join(REDO, `${slug}.png`)
  if (!existsSync(original) || !existsSync(redo)) throw new Error(`Missing comparison input: ${slug}`)
  overlays.push({ input: labelSvg(offset + 1, nameKo, slug, reason), left, top })
  overlays.push({ input: await sharp(original).resize(IMAGE, IMAGE, { fit: 'cover' }).png().toBuffer(), left, top: top + LABEL })
  overlays.push({ input: await sharp(redo).resize(IMAGE, IMAGE, { fit: 'cover' }).png().toBuffer(), left: left + IMAGE, top: top + LABEL })
  index.push({ number: offset + 1, slug, name_ko: nameKo, reason, original, redo })
}

const file = path.join(OUTPUT, 'severe-redo-comparison.jpg')
await sharp({
  create: {
    width: PAIR_WIDTH * PAIRS_PER_ROW,
    height: Math.ceil(ROWS.length / PAIRS_PER_ROW) * (LABEL + IMAGE),
    channels: 3,
    background: '#101217',
  },
})
  .composite(overlays)
  .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
  .toFile(file)

const smallCell = 128
const smallLabel = 24
const smallCols = 4
const smallOverlays = []
for (const [offset, [slug]] of ROWS.entries()) {
  const left = (offset % smallCols) * smallCell
  const top = Math.floor(offset / smallCols) * (smallCell + smallLabel)
  const preview = await sharp(path.join(REDO, `${slug}.png`))
    .resize(32, 32, { fit: 'cover' })
    .resize(smallCell, smallCell, { kernel: 'nearest' })
    .png()
    .toBuffer()
  const label = Buffer.from(`<svg width="${smallCell}" height="${smallLabel}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${smallCell}" height="${smallLabel}" fill="#171a20"/>
    <text x="5" y="17" font-family="Arial" font-size="12" fill="#ffffff">${escapeXml(slug)}</text>
  </svg>`)
  smallOverlays.push({ input: label, left, top })
  smallOverlays.push({ input: preview, left, top: top + smallLabel })
}
const smallFile = path.join(OUTPUT, 'selected-32px-check.png')
await sharp({
  create: {
    width: smallCols * smallCell,
    height: Math.ceil(ROWS.length / smallCols) * (smallCell + smallLabel),
    channels: 3,
    background: '#101217',
  },
})
  .composite(smallOverlays)
  .png()
  .toFile(smallFile)

writeFileSync(path.join(OUTPUT, 'comparison-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ comparisons: index.length, file, smallFile, output: OUTPUT }, null, 2))
