/**
 * 신화 인물 대표 사진·각성 후보를 읽어 메타데이터/해시 목록과 문화권별 검수 시트를 만든다.
 * 후보 파일과 DB/R2는 변경하지 않는다.
 *
 * 실행: node scripts/photo/myth-image-review.mjs [배치 루트]
 */
import crypto from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const batchRoot = path.resolve(process.argv[2] ?? 'D:\\remotion-assets\\celeb-mythology-batch')
const manifestPath = path.join(batchRoot, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const SLOTS = {
  portrait: { pathKey: 'portrait_candidate_path', width: 220, height: 275, aspect: 4 / 5, minLongSide: 1200 },
  awakened: { pathKey: 'awakened_candidate_path', width: 250, height: 250, aspect: 1, minLongSide: 1000 },
}
const LABEL_HEIGHT = 42
const COLUMNS = 5
const IDENTITY_TILE_WIDTH = 540
const IDENTITY_IMAGE_HEIGHT = 200
const IDENTITY_COLUMNS = 2

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

async function inspectFile(file, spec) {
  const bytes = readFileSync(file)
  const metadata = await sharp(bytes).metadata()
  if (!metadata.width || !metadata.height) throw new Error('이미지 크기를 읽지 못했습니다.')
  const actualAspect = metadata.width / metadata.height
  const aspectError = Math.abs(actualAspect - spec.aspect) / spec.aspect
  const geometryValid = aspectError <= 0.02 && Math.max(metadata.width, metadata.height) >= spec.minLongSide
  return {
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    actual_aspect: Number(actualAspect.toFixed(5)),
    aspect_error_percent: Number((aspectError * 100).toFixed(3)),
    geometry_valid: geometryValid,
  }
}

async function makeTile(row, slot, spec) {
  const file = row[spec.pathKey]
  const image = await sharp(file)
    .rotate()
    .resize(spec.width, spec.height, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 88 })
    .toBuffer()
  const label = Buffer.from(`
    <svg width="${spec.width}" height="${LABEL_HEIGHT}">
      <rect width="100%" height="100%" fill="#111318"/>
      <text x="10" y="27" fill="#f4f4f5" font-family="Arial, sans-serif" font-size="18">${escapeXml(row.slug)}</text>
    </svg>
  `)
  return sharp({
    create: {
      width: spec.width,
      height: spec.height + LABEL_HEIGHT,
      channels: 3,
      background: '#111318',
    },
  }).composite([
    { input: image, left: 0, top: 0 },
    { input: label, left: 0, top: spec.height },
  ]).jpeg({ quality: 90 }).toBuffer()
}

async function makeSheet(rows, slot, spec, target) {
  if (!rows.length) return null
  const tileHeight = spec.height + LABEL_HEIGHT
  const rowCount = Math.ceil(rows.length / COLUMNS)
  const tiles = []
  for (let index = 0; index < rows.length; index += 1) {
    tiles.push({
      input: await makeTile(rows[index], slot, spec),
      left: (index % COLUMNS) * spec.width,
      top: Math.floor(index / COLUMNS) * tileHeight,
    })
  }
  await sharp({
    create: {
      width: COLUMNS * spec.width,
      height: rowCount * tileHeight,
      channels: 3,
      background: '#24262b',
    },
  }).composite(tiles).jpeg({ quality: 90 }).toFile(target)
  return target
}

async function makeIdentityPanel(file, width, height, label) {
  const background = {
    create: { width, height, channels: 3, background: '#181a1f' },
  }
  const composites = []
  if (file && existsSync(file)) {
    composites.push({
      input: await sharp(file).rotate().resize(width, height, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer(),
      left: 0,
      top: 0,
    })
  }
  composites.push({
    input: Buffer.from(`
      <svg width="${width}" height="26">
        <rect width="100%" height="100%" fill="#111318" fill-opacity="0.86"/>
        <text x="8" y="19" fill="#f4f4f5" font-family="Arial, sans-serif" font-size="14">${label}</text>
      </svg>
    `),
    left: 0,
    top: height - 26,
  })
  return sharp(background).composite(composites).jpeg({ quality: 88 }).toBuffer()
}

async function makeIdentityTile(row) {
  const panelWidths = [160, 160, 220]
  const panels = await Promise.all([
    makeIdentityPanel(row.ref_path, panelWidths[0], IDENTITY_IMAGE_HEIGHT, 'REF'),
    makeIdentityPanel(
      existsSync(row.portrait_candidate_path) ? row.portrait_candidate_path : row.portrait_reference_path,
      panelWidths[1],
      IDENTITY_IMAGE_HEIGHT,
      'PORTRAIT',
    ),
    makeIdentityPanel(
      existsSync(row.awakened_candidate_path) ? row.awakened_candidate_path : row.awakened_reference_path,
      panelWidths[2],
      IDENTITY_IMAGE_HEIGHT,
      'AWAKENED',
    ),
  ])
  const label = Buffer.from(`
    <svg width="${IDENTITY_TILE_WIDTH}" height="${LABEL_HEIGHT}">
      <rect width="100%" height="100%" fill="#111318"/>
      <text x="10" y="27" fill="#f4f4f5" font-family="Arial, sans-serif" font-size="18">${escapeXml(row.slug)}</text>
    </svg>
  `)
  return sharp({
    create: {
      width: IDENTITY_TILE_WIDTH,
      height: IDENTITY_IMAGE_HEIGHT + LABEL_HEIGHT,
      channels: 3,
      background: '#111318',
    },
  }).composite([
    { input: panels[0], left: 0, top: 0 },
    { input: panels[1], left: panelWidths[0], top: 0 },
    { input: panels[2], left: panelWidths[0] + panelWidths[1], top: 0 },
    { input: label, left: 0, top: IDENTITY_IMAGE_HEIGHT },
  ]).jpeg({ quality: 90 }).toBuffer()
}

async function makeIdentitySheet(rows, target) {
  if (!rows.length) return null
  const tileHeight = IDENTITY_IMAGE_HEIGHT + LABEL_HEIGHT
  const tiles = []
  for (let index = 0; index < rows.length; index += 1) {
    tiles.push({
      input: await makeIdentityTile(rows[index]),
      left: (index % IDENTITY_COLUMNS) * IDENTITY_TILE_WIDTH,
      top: Math.floor(index / IDENTITY_COLUMNS) * tileHeight,
    })
  }
  await sharp({
    create: {
      width: IDENTITY_COLUMNS * IDENTITY_TILE_WIDTH,
      height: Math.ceil(rows.length / IDENTITY_COLUMNS) * tileHeight,
      channels: 3,
      background: '#24262b',
    },
  }).composite(tiles).jpeg({ quality: 90 }).toFile(target)
  return target
}

async function main() {
  const inventory = []
  for (const row of manifest) {
    for (const [slot, spec] of Object.entries(SLOTS)) {
      const file = row[spec.pathKey]
      if (!existsSync(file)) continue
      try {
        const details = await inspectFile(file, spec)
        inventory.push({
          id: row.id,
          slug: row.slug,
          nickname: row.nickname,
          primary_group: row.primary_group,
          slot,
          file,
          valid: details.geometry_valid,
          ...details,
        })
      } catch (error) {
        inventory.push({
          id: row.id,
          slug: row.slug,
          nickname: row.nickname,
          primary_group: row.primary_group,
          slot,
          file,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  const sheets = []
  const groups = [...new Set(manifest.map((row) => row.primary_group))].sort()
  for (const group of groups) {
    const groupRows = manifest.filter((row) => row.primary_group === group)
    const reviewDir = path.join(batchRoot, group, '_review')
    mkdirSync(reviewDir, { recursive: true })
    for (const [slot, spec] of Object.entries(SLOTS)) {
      const presentRows = groupRows.filter((row) => existsSync(row[spec.pathKey]))
      const target = path.join(reviewDir, `${slot}-contact-sheet.jpg`)
      const sheet = await makeSheet(presentRows, slot, spec, target)
      if (sheet) sheets.push({ group, slot, count: presentRows.length, file: sheet })
    }
    const identityRows = groupRows.filter(
      (row) => existsSync(row.portrait_candidate_path) || existsSync(row.awakened_candidate_path),
    )
    const identityTarget = path.join(reviewDir, 'identity-contact-sheet.jpg')
    const identitySheet = await makeIdentitySheet(identityRows, identityTarget)
    if (identitySheet) sheets.push({ group, slot: 'identity', count: identityRows.length, file: identitySheet })
  }

  const report = {
    generated_at: new Date().toISOString(),
    candidate_count: inventory.length,
    valid_count: inventory.filter((row) => row.valid).length,
    invalid_count: inventory.filter((row) => !row.valid).length,
    portrait_count: inventory.filter((row) => row.slot === 'portrait').length,
    awakened_count: inventory.filter((row) => row.slot === 'awakened').length,
    sheets,
    inventory,
  }
  const reportPath = path.join(batchRoot, '_audit', 'candidate-inventory.json')
  mkdirSync(path.dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ...report, inventory: undefined }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
