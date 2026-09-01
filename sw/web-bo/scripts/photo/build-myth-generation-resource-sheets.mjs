/**
 * 신화 인물 생성 입력 리소스 198건을 한 표로 합친다.
 * - 인간형 189명: matching-crops 얼굴 crop
 * - 특수형 8명: 보류-웹검색의 선택 도상에서 검토용 초점 crop
 * - 타라 1명: 검색 포기 상태
 *
 * DB·R2·정식 REF는 수정하지 않는다.
 * 실행: node scripts/photo/build-myth-generation-resource-sheets.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const FACE_CROPS = path.join(ROOT, 'matching-crops')
const WEB_ROOT = path.join(ROOT, '보류-웹검색')
const SPECIAL_CROPS = path.join(ROOT, '생성-입력표', 'special-preview-crops')
const OUT = path.join(ROOT, '생성-입력표')
const PROPOSAL_PATH = path.join(ROOT, 'matching-proposal.json')
const TARGETS_PATH = path.join(ROOT, 'avatar-null-targets.json')
const APPEARANCE_PATH = path.join(ROOT, 'materials-with-appearance.json')

const WIDTH = 3000
const HEADER_HEIGHT = 210
const ROW_HEIGHT = 280
const PREVIEW_SIZE = 220
const ROUND2_REVIEW_SLUGS = new Set([
  'andromache',
  'briseis',
  'meriones',
  'scamander',
  'igraine',
  'hecuba',
  'persephone',
  'boyi-kao',
  'huang-feihu',
  'huang-tianhua',
  'shen-gongbao',
  'yunxiao-niangniang',
  'yellow-robe-demon',
  'ptah',
  'ame-no-tajikarao',
  'hoori',
  'iwanagahime',
])

const specialFocus = {
  astyanax: { x: 0.48, y: 0.39, scale: 0.42 },
  'black-bear-demon': { x: 0.52, y: 0.20, scale: 0.45 },
  'yellow-wind-demon': { x: 0.35, y: 0.29, scale: 0.34 },
  khnum: { x: 0.61, y: 0.39, scale: 0.55 },
  sobek: { x: 0.50, y: 0.59, scale: 0.75 },
  angada: { x: 0.73, y: 0.31, scale: 0.55 },
  jatayu: { x: 0.44, y: 0.10, scale: 0.38 },
  maricha: { x: 0.30, y: 0.33, scale: 0.24 },
}

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

function wrapText(value, maxChars = 52, maxLines = 4) {
  const words = String(value ?? '').trim().split(/\s+/u).filter(Boolean)
  if (words.length === 0) return []
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length <= maxChars) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length > maxLines) lines.length = maxLines
  const source = String(value ?? '').trim()
  const visible = lines.join(' ')
  if (visible.length < source.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/…$/u, '')}…`
  }
  return lines
}

function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/gu, '')
}

function primaryTradition(target) {
  return target.traditions[0]
}

async function makeSpecialPreview(slug, sourcePath) {
  const focus = specialFocus[slug]
  if (!focus) throw new Error(`특수형 초점 정보 누락: ${slug}`)
  const image = sharp(sourcePath)
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) throw new Error(`이미지 치수 확인 실패: ${sourcePath}`)
  const side = Math.max(1, Math.round(Math.min(metadata.width, metadata.height) * focus.scale))
  const centerX = metadata.width * focus.x
  const centerY = metadata.height * focus.y
  const left = Math.max(0, Math.min(metadata.width - side, Math.round(centerX - side / 2)))
  const top = Math.max(0, Math.min(metadata.height - side, Math.round(centerY - side / 2)))
  const output = path.join(SPECIAL_CROPS, `${slug}.png`)
  await sharp(sourcePath)
    .extract({ left, top, width: side, height: side })
    .resize(800, 800, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(output)
  return output
}

function tableSvg(title, subtitle, rows) {
  const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + 30
  const body = [
    `<rect width="${WIDTH}" height="${height}" fill="#f4f2ed"/>`,
    `<text x="64" y="66" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="44" font-weight="700" fill="#171717">${xml(title)}</text>`,
    `<text x="64" y="108" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="23" fill="#67635c">${xml(subtitle)}</text>`,
    '<rect x="40" y="150" width="2920" height="60" rx="8" fill="#252525"/>',
  ]
  const headers = [
    [64, '신화 전승'],
    [520, '인물'],
    [980, '생성 입력'],
    [1360, '이미지'],
    [1650, '외형·매칭 설명'],
    [2780, '상태'],
  ]
  for (const [x, label] of headers) {
    body.push(`<text x="${x}" y="190" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="25" font-weight="700" fill="#ffffff">${label}</text>`)
  }

  rows.forEach((row, index) => {
    const y = HEADER_HEIGHT + index * ROW_HEIGHT
    const fill = index % 2 === 0 ? '#ffffff' : '#ebe8e1'
    body.push(`<rect x="40" y="${y}" width="2920" height="${ROW_HEIGHT}" fill="${fill}"/>`)
    body.push(`<line x1="40" y1="${y + ROW_HEIGHT}" x2="2960" y2="${y + ROW_HEIGHT}" stroke="#d2cec4" stroke-width="2"/>`)
    body.push(`<text x="64" y="${y + 118}" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="28" font-weight="700" fill="#202020">${xml(short(row.tradition.name, 18))}</text>`)
    body.push(`<text x="64" y="${y + 160}" font-family="Arial, sans-serif" font-size="19" fill="#77726a">${xml(short(row.tradition.name_en, 28))}</text>`)
    body.push(`<text x="520" y="${y + 112}" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="31" font-weight="700" fill="#161616">${xml(short(row.target.nickname, 20))}</text>`)
    body.push(`<text x="520" y="${y + 157}" font-family="Arial, sans-serif" font-size="21" fill="#68645d">${xml(short(row.target.nickname_en, 30))}</text>`)
    body.push(`<text x="980" y="${y + 120}" font-family="Consolas, Malgun Gothic, monospace" font-size="23" font-weight="700" fill="#303030">${xml(short(row.inputLabel, 24))}</text>`)
    body.push(`<text x="980" y="${y + 160}" font-family="Malgun Gothic, Arial, sans-serif" font-size="18" fill="#77726a">${xml(short(row.inputNote, 24))}</text>`)
    const descriptionLines = wrapText(row.description, 50, 4)
    descriptionLines.forEach((line, lineIndex) => {
      body.push(`<text x="1650" y="${y + 68 + lineIndex * 48}" font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif" font-size="21" fill="#303030">${xml(line)}</text>`)
    })
    body.push(`<text x="2780" y="${y + 145}" font-family="Malgun Gothic, Arial, sans-serif" font-size="28" font-weight="700" fill="${row.kind === 'give_up' ? '#a43b32' : '#202020'}">${xml(row.statusLabel)}</text>`)
  })

  for (const x of [490, 950, 1330, 1620, 2750]) {
    body.push(`<line x1="${x}" y1="150" x2="${x}" y2="${height - 30}" stroke="#c8c3b9" stroke-width="2"/>`)
  }
  return Buffer.from(`<svg width="${WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">${body.join('')}</svg>`)
}

async function buildTable(file, title, subtitle, rows, format = 'png') {
  const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + 30
  const overlays = [{ input: tableSvg(title, subtitle, rows), left: 0, top: 0 }]
  for (const [index, row] of rows.entries()) {
    if (!row.previewPath) continue
    if (!existsSync(row.previewPath)) throw new Error(`표 이미지 누락: ${row.previewPath}`)
    const image = await sharp(row.previewPath)
      .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'cover' })
      .png()
      .toBuffer()
    overlays.push({
      input: image,
      left: 1410,
      top: HEADER_HEIGHT + index * ROW_HEIGHT + 30,
    })
  }
  const output = sharp({
    create: { width: WIDTH, height, channels: 3, background: '#f4f2ed' },
  }).composite(overlays)
  if (format === 'jpg') await output.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(file)
  else await output.png({ compressionLevel: 9 }).toFile(file)
}

async function main() {
  const proposal = readJson(PROPOSAL_PATH)
  const targetRoot = readJson(TARGETS_PATH)
  const appearanceRoot = readJson(APPEARANCE_PATH)
  const targets = targetRoot.targets ?? targetRoot
  const matchByTarget = new Map(proposal.matches.map((row) => [row.target_id, row]))
  const appearanceByMaterial = new Map(appearanceRoot.materials.map((row) => [row.material_id, row.appearance]))
  const webIndex = readJson(path.join(WEB_ROOT, 'index.json'))
  const webByName = new Map()

  mkdirSync(OUT, { recursive: true })
  mkdirSync(SPECIAL_CROPS, { recursive: true })

  for (const item of webIndex.results) {
    const resultPath = path.join(WEB_ROOT, item.slug, 'result.json')
    const result = readJson(resultPath)
    let previewPath = null
    if (result.status === 'found') {
      const sourcePath = path.join(WEB_ROOT, item.slug, result.selected.file)
      if (!existsSync(sourcePath)) throw new Error(`웹 선택 이미지 누락: ${sourcePath}`)
      previewPath = await makeSpecialPreview(item.slug, sourcePath)
    }
    webByName.set(normalizeName(result.name_en), { ...result, previewPath })
  }

  const rows = targets.map((target) => {
    const match = matchByTarget.get(target.id)
    if (!match) throw new Error(`매칭 원장 대상 누락: ${target.id}`)
    const tradition = primaryTradition(target)
    if (match.status === 'matched') {
      const previewPath = match.preview_path
        ? path.resolve(match.preview_path)
        : path.join(FACE_CROPS, `${match.material_id}_face.png`)
      if (!existsSync(previewPath)) throw new Error(`얼굴 crop 누락: ${match.material_id}`)
      const appearance = match.appearance_override ?? appearanceByMaterial.get(match.material_id)
      if (!appearance) throw new Error(`외형 분류 누락: ${match.material_id}`)
      const distinctive = appearance.distinctive_visible_features?.slice(0, 2).join(', ') ?? ''
      const inputNote = match.source_note
        ?? (match.source_type === 'faction_ref'
          ? '기존 팩션 얼굴 REF'
          : match.source_type === 'user_local'
            ? '사용자 지정 로컬 이미지'
            : `인간형 얼굴 crop · 적합도 ${match.fit_score}`)
      return {
        target,
        tradition,
        kind: 'face',
        inputLabel: match.material_id,
        inputNote,
        statusLabel: match.source_type ? '지정' : String(match.fit_score),
        previewPath,
        revision: match.revision ?? null,
        description: `외형: ${appearance.apparent_age_band}, ${appearance.face_shape}; ${distinctive}. 매칭: ${match.reason} 생성: ${match.regeneration_direction}`,
      }
    }

    const web = webByName.get(normalizeName(target.nickname_en))
    if (!web) throw new Error(`웹 검색 결과와 대상 연결 실패: ${target.nickname_en}`)
    if (web.status === 'found') {
      return {
        target,
        tradition,
        kind: 'web_ref',
        inputLabel: `WEB · ${web.slug}`,
        inputNote: '동물형·아동형 도상 REF',
        statusLabel: 'REF',
        previewPath: web.previewPath,
        description: `외형: ${web.selected.visual_notes} 신원: ${web.selected.identity_evidence}`,
      }
    }
    return {
      target,
      tradition,
      kind: 'give_up',
      inputLabel: 'WEB SEARCH',
      inputNote: '확실한 단독 도상 없음',
      statusLabel: '포기',
      previewPath: null,
      description: `검색 포기: ${web.give_up_reason}`,
    }
  })

  const acquired = rows.filter((row) => row.kind !== 'give_up')
  const faceRows = rows.filter((row) => row.kind === 'face')
  const webRows = rows.filter((row) => row.kind === 'web_ref')
  const giveUpRows = rows.filter((row) => row.kind === 'give_up')
  if (rows.length !== 198 || faceRows.length !== 189 || webRows.length !== 8 || giveUpRows.length !== 1) {
    throw new Error(`수량 불일치: total=${rows.length}, face=${faceRows.length}, web=${webRows.length}, giveUp=${giveUpRows.length}`)
  }

  const subtitle = `얼굴 crop ${faceRows.length} + 웹 도상 REF ${webRows.length} · 검색 포기 ${giveUpRows.length} · DB·R2 미반영`
  await buildTable(
    path.join(OUT, '00-전체-198명.jpg'),
    `신화 인물 생성 입력 리소스 — ${acquired.length}/${rows.length}명 확보`,
    subtitle,
    rows,
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
    const traditionRows = rows.filter((row) => row.tradition.slug === tradition.slug)
    if (traditionRows.length === 0) continue
    const number = String(sheetNumber).padStart(2, '0')
    const filename = `${number}-${tradition.slug}.png`
    await buildTable(
      path.join(OUT, filename),
      `${tradition.name} — 생성 입력 ${traditionRows.length}명`,
      subtitle,
      traditionRows,
    )
    sheets.push({ file: filename, tradition: tradition.slug, rows: traditionRows.length })
    sheetNumber += 1
  }

  const specialRows = rows.filter((row) => row.kind !== 'face')
  const specialFile = `${String(sheetNumber).padStart(2, '0')}-특수형-웹도상.png`
  await buildTable(
    path.join(OUT, specialFile),
    `특수형·아동형 웹 도상 — ${webRows.length}명 확보, ${giveUpRows.length}명 포기`,
    'Kiro 웹 검색 대표 도상을 생성용 검토 crop으로 표시 · 원본과 출처 JSON은 보류-웹검색 폴더에 보존',
    specialRows,
  )
  sheets.push({ file: specialFile, tradition: null, rows: specialRows.length, status: 'special' })

  const revisedRows = rows.filter((row) => row.revision?.startsWith('user_recast'))
  if (revisedRows.length !== 47) throw new Error(`사용자 교체 검토표 수량 불일치: ${revisedRows.length}`)
  const revisedFile = `${String(sheetNumber + 1).padStart(2, '0')}-교체47명-검토표.jpg`
  await buildTable(
    path.join(OUT, revisedFile),
    '사용자 지적 반영 — 교체 얼굴 47명',
    '새 얼굴 재료와 사용자 지정·오디세우스 팩션 원본을 함께 검토 · DB·R2 미반영',
    revisedRows,
    'jpg',
  )
  sheets.push({ file: revisedFile, tradition: null, rows: revisedRows.length, status: 'user_recast' })
  const revisedChunks = []
  for (let offset = 0; offset < revisedRows.length; offset += 12) {
    revisedChunks.push(revisedRows.slice(offset, offset + 12))
  }
  for (const [index, chunk] of revisedChunks.entries()) {
    const filename = `${String(sheetNumber + 2 + index).padStart(2, '0')}-교체47명-${index + 1}.png`
    await buildTable(
      path.join(OUT, filename),
      `교체 얼굴 확대 검토 ${index + 1}/${revisedChunks.length}`,
      `이번 지적 대상 ${index * 12 + 1}~${index * 12 + chunk.length}/${revisedRows.length}명 · 얼굴·외형·매칭 이유·생성 방향`,
      chunk,
    )
    sheets.push({ file: filename, tradition: null, rows: chunk.length, status: 'user_recast_detail' })
  }

  const round2Rows = rows.filter((row) => ROUND2_REVIEW_SLUGS.has(row.target.slug))
  if (round2Rows.length !== 17) throw new Error(`2차 교체 검토표 수량 불일치: ${round2Rows.length}`)
  const round2StartNumber = sheetNumber + 2 + revisedChunks.length
  const round2File = `${String(round2StartNumber).padStart(2, '0')}-교체2차17명-검토표.jpg`
  await buildTable(
    path.join(OUT, round2File),
    '2·3차 사용자 지적 반영 — 현재 얼굴 17명',
    '3차 실사 교체 5명 포함 · 이그레인에서 회수한 얼굴은 헤카베에 유지 · 설명 포함 · DB·R2 미반영',
    round2Rows,
    'jpg',
  )
  sheets.push({ file: round2File, tradition: null, rows: round2Rows.length, status: 'user_recast_round2' })
  const round2Chunks = []
  for (let offset = 0; offset < round2Rows.length; offset += 9) {
    round2Chunks.push(round2Rows.slice(offset, offset + 9))
  }
  for (const [index, chunk] of round2Chunks.entries()) {
    const filename = `${String(round2StartNumber + 1 + index).padStart(2, '0')}-교체2차17명-${index + 1}.png`
    await buildTable(
      path.join(OUT, filename),
      `2차 교체 얼굴 확대 검토 ${index + 1}/${round2Chunks.length}`,
      `이번 지적 대상 ${index * 9 + 1}~${index * 9 + chunk.length}/${round2Rows.length}명 · 얼굴·외형·매칭 이유·생성 방향`,
      chunk,
    )
    sheets.push({ file: filename, tradition: null, rows: chunk.length, status: 'user_recast_round2_detail' })
  }

  const round3Rows = rows.filter((row) => row.revision === 'user_recast_round3_2026-08-31')
  if (round3Rows.length !== 5) throw new Error(`3차 실사 교체 검토표 수량 불일치: ${round3Rows.length}`)
  const round3Number = round2StartNumber + 1 + round2Chunks.length
  const round3File = `${String(round3Number).padStart(2, '0')}-교체3차5명-실사검토표.jpg`
  await buildTable(
    path.join(OUT, round3File),
    '3차 교체 — 실제 촬영 얼굴 5명',
    'AI 생성 얼굴 폐기 · Pexels 개별 사진과 촬영자 확인 · 얼굴·외형·매칭 이유·생성 방향을 한 장에 표시 · DB·R2 미반영',
    round3Rows,
    'jpg',
  )
  sheets.push({ file: round3File, tradition: null, rows: round3Rows.length, status: 'user_recast_round3_real_photo' })

  const index = {
    generated_at: new Date().toISOString(),
    total: rows.length,
    acquired: acquired.length,
    face_crops: faceRows.length,
    web_refs: webRows.length,
    give_up: giveUpRows.length,
    master: '00-전체-198명.jpg',
    sheets,
  }
  writeFileSync(path.join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ output: OUT, images: sheets.length + 1, ...index }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
