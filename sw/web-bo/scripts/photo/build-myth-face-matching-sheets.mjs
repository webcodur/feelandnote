/**
 * 신화 인물 ↔ 얼굴 재료 매칭안을 얼굴 crop이 들어간 표 이미지로 만든다.
 * DB·R2·정식 REF는 수정하지 않는다.
 *
 * 실행: node scripts/photo/build-myth-face-matching-sheets.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const CROPS = path.join(ROOT, 'matching-crops')
const OUT = path.join(ROOT, '매칭표')
const PROPOSAL_PATH = path.join(ROOT, 'matching-proposal.json')
const TARGETS_PATH = path.join(ROOT, 'avatar-null-targets.json')
const WIDTH = 2160
const HEADER_HEIGHT = 180
const ROW_HEIGHT = 190
const CROP_SIZE = 160

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function short(value, max) {
  const text = String(value ?? '').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function primaryTradition(target) {
  return target.traditions[0]
}

function tableSvg(title, rows, targetById) {
  const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + 30
  const body = []
  body.push(`<rect width="${WIDTH}" height="${height}" fill="#f4f2ed"/>`)
  body.push(`<text x="64" y="66" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="44" font-weight="700" fill="#171717">${xml(title)}</text>`)
  body.push(`<text x="64" y="108" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="23" fill="#67635c">얼굴 재료는 검토용이며 DB·R2·정식 REF에는 미반영</text>`)
  body.push(`<rect x="40" y="132" width="2080" height="48" rx="8" fill="#252525"/>`)
  const headers = [
    [64, '신화 전승'],
    [610, '인물'],
    [1210, '재료 ID'],
    [1535, '얼굴 crop'],
    [1875, '적합도'],
  ]
  for (const [x, label] of headers) {
    body.push(`<text x="${x}" y="165" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${label}</text>`)
  }

  rows.forEach((row, index) => {
    const target = targetById.get(row.target_id)
    const tradition = primaryTradition(target)
    const y = HEADER_HEIGHT + index * ROW_HEIGHT
    const fill = index % 2 === 0 ? '#ffffff' : '#ebe8e1'
    body.push(`<rect x="40" y="${y}" width="2080" height="${ROW_HEIGHT}" fill="${fill}"/>`)
    body.push(`<line x1="40" y1="${y + ROW_HEIGHT}" x2="2120" y2="${y + ROW_HEIGHT}" stroke="#d2cec4" stroke-width="2"/>`)
    body.push(`<text x="64" y="${y + 78}" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="28" font-weight="700" fill="#202020">${xml(short(tradition.name, 22))}</text>`)
    body.push(`<text x="64" y="${y + 116}" font-family="Arial, sans-serif" font-size="19" fill="#77726a">${xml(short(tradition.name_en, 34))}</text>`)
    body.push(`<text x="610" y="${y + 76}" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="31" font-weight="700" fill="#161616">${xml(short(target.nickname, 24))}</text>`)
    body.push(`<text x="610" y="${y + 118}" font-family="Arial, sans-serif" font-size="21" fill="#68645d">${xml(short(target.nickname_en, 38))}</text>`)
    body.push(`<text x="1210" y="${y + 101}" font-family="Consolas, monospace" font-size="25" fill="#303030">${xml(row.material_id)}</text>`)
    body.push(`<text x="1880" y="${y + 102}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#202020">${row.fit_score}</text>`)
  })

  for (const x of [580, 1180, 1510, 1840]) {
    body.push(`<line x1="${x}" y1="132" x2="${x}" y2="${height - 30}" stroke="#c8c3b9" stroke-width="2"/>`)
  }
  return Buffer.from(`<svg width="${WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">${body.join('')}</svg>`)
}

async function buildTable(file, title, rows, targetById, format = 'png') {
  const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + 30
  const overlays = [{ input: tableSvg(title, rows, targetById), left: 0, top: 0 }]
  for (const [index, row] of rows.entries()) {
    const cropPath = row.preview_path
      ? path.resolve(row.preview_path)
      : path.join(CROPS, `${row.material_id}_face.png`)
    if (!existsSync(cropPath)) throw new Error(`crop 누락: ${row.material_id}`)
    const image = await sharp(cropPath)
      .resize(CROP_SIZE, CROP_SIZE, { fit: 'cover' })
      .png()
      .toBuffer()
    overlays.push({
      input: image,
      left: 1560,
      top: HEADER_HEIGHT + index * ROW_HEIGHT + 15,
    })
  }
  const output = sharp({
    create: { width: WIDTH, height, channels: 3, background: '#f4f2ed' },
  }).composite(overlays)
  if (format === 'jpg') await output.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(file)
  else await output.png({ compressionLevel: 9 }).toFile(file)
}

function holdSvg(rows, targetById) {
  const width = 2600
  const header = 180
  const rowHeight = 170
  const height = header + rows.length * rowHeight + 30
  const body = [
    `<rect width="${width}" height="${height}" fill="#f4f2ed"/>`,
    '<text x="64" y="66" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="44" font-weight="700" fill="#171717">인간 얼굴 재료 매칭 보류</text>',
    '<text x="64" y="108" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="23" fill="#67635c">아동 또는 동물형 얼굴이 정체성의 핵심인 대상</text>',
    '<rect x="40" y="132" width="2520" height="48" rx="8" fill="#252525"/>',
    '<text x="64" y="165" font-family="Malgun Gothic, sans-serif" font-size="24" font-weight="700" fill="#fff">신화 전승</text>',
    '<text x="520" y="165" font-family="Malgun Gothic, sans-serif" font-size="24" font-weight="700" fill="#fff">인물</text>',
    '<text x="1020" y="165" font-family="Malgun Gothic, sans-serif" font-size="24" font-weight="700" fill="#fff">보류 사유</text>',
  ]
  rows.forEach((row, index) => {
    const target = targetById.get(row.target_id)
    const tradition = primaryTradition(target)
    const y = header + index * rowHeight
    body.push(`<rect x="40" y="${y}" width="2520" height="${rowHeight}" fill="${index % 2 === 0 ? '#fff' : '#ebe8e1'}"/>`)
    body.push(`<text x="64" y="${y + 90}" font-family="Malgun Gothic, sans-serif" font-size="27" font-weight="700" fill="#202020">${xml(short(tradition.name, 18))}</text>`)
    body.push(`<text x="520" y="${y + 70}" font-family="Malgun Gothic, sans-serif" font-size="30" font-weight="700" fill="#161616">${xml(short(target.nickname, 22))}</text>`)
    body.push(`<text x="520" y="${y + 111}" font-family="Arial, sans-serif" font-size="20" fill="#68645d">${xml(short(target.nickname_en, 34))}</text>`)
    body.push(`<text x="1020" y="${y + 91}" font-family="Malgun Gothic, sans-serif" font-size="24" fill="#303030">${xml(short(row.reason, 78))}</text>`)
    body.push(`<line x1="40" y1="${y + rowHeight}" x2="2560" y2="${y + rowHeight}" stroke="#d2cec4" stroke-width="2"/>`)
  })
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${body.join('')}</svg>`)
}

async function main() {
  const proposal = readJson(PROPOSAL_PATH)
  const targetRoot = readJson(TARGETS_PATH)
  const targets = targetRoot.targets ?? targetRoot
  const targetById = new Map(targets.map((row) => [row.id, row]))
  const matched = proposal.matches.filter((row) => row.status === 'matched')
  const held = proposal.matches.filter((row) => row.status !== 'matched')
  if (matched.length !== proposal.matched_count) throw new Error('매칭 건수 불일치')
  if (new Set(matched.map((row) => row.material_id)).size !== matched.length) throw new Error('재료 ID 중복')
  mkdirSync(OUT, { recursive: true })

  const order = new Map(targets.map((row, index) => [row.id, index]))
  matched.sort((left, right) => (order.get(left.target_id) ?? 0) - (order.get(right.target_id) ?? 0))
  await buildTable(
    path.join(OUT, '00-전체-매칭표.jpg'),
    `신화 인물 얼굴 재료 매칭 — ${matched.length}명`,
    matched,
    targetById,
    'jpg',
  )

  const traditions = []
  for (const target of targets) {
    const tradition = primaryTradition(target)
    if (!traditions.some((row) => row.slug === tradition.slug)) traditions.push(tradition)
  }
  const sheets = []
  let sheetNumber = 1
  for (const tradition of traditions) {
    const rows = matched.filter((row) => primaryTradition(targetById.get(row.target_id)).slug === tradition.slug)
    if (rows.length === 0) continue
    const number = String(sheetNumber).padStart(2, '0')
    const filename = `${number}-${tradition.slug}.png`
    await buildTable(
      path.join(OUT, filename),
      `${tradition.name} — 얼굴 재료 매칭 ${rows.length}명`,
      rows,
      targetById,
    )
    sheets.push({ file: filename, tradition: tradition.slug, rows: rows.length })
    sheetNumber += 1
  }

  const holdFile = `${String(sheetNumber).padStart(2, '0')}-보류.png`
  await sharp(holdSvg(held, targetById)).png({ compressionLevel: 9 }).toFile(path.join(OUT, holdFile))
  sheets.push({ file: holdFile, tradition: null, rows: held.length, status: 'held' })
  writeFileSync(path.join(OUT, 'index.json'), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    matched: matched.length,
    held: held.length,
    master: '00-전체-매칭표.jpg',
    sheets,
  }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ output: OUT, matched: matched.length, held: held.length, images: sheets.length + 1 }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
