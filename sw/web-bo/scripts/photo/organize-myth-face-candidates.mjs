/**
 * 잘못 전수 수집한 신화 인물 얼굴 후보를 수집 시작 당시 portrait 유무로 분리한다.
 *
 * - 01-없던-인물: 수집 시작 당시 portrait_url이 비어 있던 64명
 * - 02-있던-인물: 수집 시작 전부터 portrait_url이 있던 194명
 *
 * 이미지·출처 파일은 삭제하지 않는다. 기존 전승별 폴더를 두 그룹 아래로 이동하고,
 * manifest/person/sources JSON의 절대 경로를 함께 갱신한다.
 *
 * 실행: node scripts/photo/organize-myth-face-candidates.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const OUTPUT_ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const COLLECTION_STARTED_AT = '2026-08-30T17:33:52.000Z'
const COLLECTION_STARTED_MS = Date.parse(COLLECTION_STARTED_AT)
const MISSING_GROUP = '01-없던-인물'
const EXISTING_GROUP = '02-있던-인물'
const EXPECTED_MISSING = 64
const EXPECTED_EXISTING = 194
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

function assertInsideRoot(target) {
  const root = `${path.resolve(OUTPUT_ROOT)}${path.sep}`.toLowerCase()
  const resolved = path.resolve(target).toLowerCase()
  if (!resolved.startsWith(root)) {
    throw new Error(`작업 루트 밖 경로를 거부합니다: ${target}`)
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function imageFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'))
}

function urlVersionTime(url) {
  if (!url) return null
  const value = new URL(url).searchParams.get('v')?.split('-')[0]
  const timestamp = Number(value)
  return Number.isFinite(timestamp) && timestamp > 1_000_000_000_000 ? timestamp : null
}

function collectionGroup(row) {
  if (row.collection_group === 'portrait_missing_at_collection_start') return MISSING_GROUP
  if (row.collection_group === 'portrait_existing_at_collection_start') return EXISTING_GROUP

  const timestamp = urlVersionTime(row.portrait_url)
  if (timestamp == null) {
    throw new Error(`${row.slug}: portrait_url 버전 시각으로 시작 상태를 복원할 수 없습니다.`)
  }
  return timestamp >= COLLECTION_STARTED_MS ? MISSING_GROUP : EXISTING_GROUP
}

function replaceStrings(value, from, to) {
  if (typeof value === 'string') return value.replaceAll(from, to)
  if (Array.isArray(value)) return value.map((item) => replaceStrings(item, from, to))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item, from, to)]))
  }
  return value
}

function rewriteJsonPaths(root, from, to) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) {
      rewriteJsonPaths(target, from, to)
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
      const parsed = readJson(target)
      writeJson(target, replaceStrings(parsed, from, to))
    }
  }
}

function moveDirectory(from, to) {
  assertInsideRoot(from)
  assertInsideRoot(to)
  if (!existsSync(from)) throw new Error(`이동 원본이 없습니다: ${from}`)
  if (existsSync(to)) throw new Error(`이동 대상이 이미 있습니다: ${to}`)
  mkdirSync(path.dirname(to), { recursive: true })
  renameSync(from, to)
  rewriteJsonPaths(to, from, to)
}

function markdownTable(rows) {
  const lines = [
    '| 전승 | 인물 | slug | 수집 후보 |',
    '|---|---|---|---:|',
  ]
  for (const row of rows) {
    lines.push(`| ${row.primary_tradition} | ${row.nickname} | \`${row.slug}\` | ${row.candidate_count ? `${row.candidate_count}장` : '없음'} |`)
  }
  return lines.join('\n')
}

function buildReadme(rows) {
  const withCandidates = rows.filter((row) => row.candidate_count > 0)
  const withoutCandidates = rows.filter((row) => row.candidate_count === 0)
  const candidateFiles = rows.reduce((sum, row) => sum + row.candidate_count, 0)
  const sorted = [...rows].sort((a, b) => {
    const tradition = a.primary_tradition.localeCompare(b.primary_tradition, 'en')
    return tradition || a.slug.localeCompare(b.slug, 'en')
  })

  return `# 수집 시작 당시 이미지가 없던 신화 인물\n\n` +
    `기준 시각은 ${COLLECTION_STARTED_AT}입니다. 이 폴더의 64명은 얼굴 후보 수집을 시작할 당시 \`portrait_url\`이 비어 있었습니다. 현재 서비스 상태가 아니라 작업 시작 당시 상태를 보존한 분류입니다.\n\n` +
    `- 전체: ${rows.length}명\n` +
    `- 얼굴 후보가 남은 인물: ${withCandidates.length}명, ${candidateFiles}장\n` +
    `- 통과 후보가 없는 인물: ${withoutCandidates.length}명 — ${withoutCandidates.map((row) => `${row.nickname}(\`${row.slug}\`)`).join(', ')}\n` +
    `- 후보는 사용자 승인 전 로컬 참고 재료이며 서비스·DB·R2에는 반영되지 않았습니다.\n\n` +
    `${markdownTable(sorted)}\n`
}

function main() {
  const manifestPath = path.join(OUTPUT_ROOT, 'manifest.json')
  const manifest = readJson(manifestPath)
  if (!Array.isArray(manifest) || manifest.length !== EXPECTED_MISSING + EXPECTED_EXISTING) {
    throw new Error(`manifest 인원수가 예상과 다릅니다: ${manifest.length}`)
  }

  const grouped = Map.groupBy(manifest, collectionGroup)
  const missing = grouped.get(MISSING_GROUP) ?? []
  const existing = grouped.get(EXISTING_GROUP) ?? []
  if (missing.length !== EXPECTED_MISSING || existing.length !== EXPECTED_EXISTING) {
    throw new Error(`분리 인원수가 예상과 다릅니다: 없던 ${missing.length}, 있던 ${existing.length}`)
  }

  const moves = manifest.map((row) => {
    const group = collectionGroup(row)
    const from = path.resolve(row.candidate_dir)
    const alreadyGrouped = from.toLowerCase().startsWith(`${path.resolve(OUTPUT_ROOT, group)}${path.sep}`.toLowerCase())
    const to = path.join(OUTPUT_ROOT, group, row.primary_tradition, row.slug)
    return { row, group, from, to, alreadyGrouped }
  })

  const destinations = new Set()
  for (const move of moves) {
    assertInsideRoot(move.from)
    assertInsideRoot(move.to)
    const key = path.resolve(move.to).toLowerCase()
    if (destinations.has(key)) throw new Error(`중복 이동 대상: ${move.to}`)
    destinations.add(key)
    if (!move.alreadyGrouped && !existsSync(move.from)) throw new Error(`인물 폴더가 없습니다: ${move.from}`)
    if (!move.alreadyGrouped && existsSync(move.to)) throw new Error(`이동 대상이 이미 있습니다: ${move.to}`)
  }

  for (const move of moves) {
    if (!move.alreadyGrouped) moveDirectory(move.from, move.to)
    const candidates = imageFiles(move.to)
    Object.assign(move.row, {
      collection_group: move.group === MISSING_GROUP
        ? 'portrait_missing_at_collection_start'
        : 'portrait_existing_at_collection_start',
      portrait_existed_at_collection_start: move.group === EXISTING_GROUP,
      collection_started_at: COLLECTION_STARTED_AT,
      candidate_dir: move.to,
      candidate_files: candidates,
      candidate_count: candidates.length,
      status: candidates.length > 0 ? 'collected_unapproved' : 'no_qualified_candidates',
    })
    writeJson(path.join(move.to, 'person.json'), move.row)
  }

  const legacyMoves = [
    ['greek-roman-myth', 'apollo'],
    ['heracles', 'hera'],
  ]
  for (const [tradition, slug] of legacyMoves) {
    const from = path.join(OUTPUT_ROOT, tradition, slug)
    const to = path.join(OUTPUT_ROOT, EXISTING_GROUP, '_이전-분류-복사본', tradition, slug)
    if (existsSync(from) && !existsSync(to)) moveDirectory(from, to)
  }

  const metadataRoot = path.join(OUTPUT_ROOT, '_metadata', '분리-전-전승별-manifest')
  for (const entry of readdirSync(OUTPUT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name === MISSING_GROUP || entry.name === EXISTING_GROUP) continue
    const traditionDir = path.join(OUTPUT_ROOT, entry.name)
    const oldManifest = path.join(traditionDir, 'manifest.json')
    const leftovers = readdirSync(traditionDir)
    if (leftovers.length === 1 && leftovers[0] === 'manifest.json') {
      const archived = path.join(metadataRoot, `${entry.name}.json`)
      assertInsideRoot(archived)
      mkdirSync(metadataRoot, { recursive: true })
      if (!existsSync(archived)) renameSync(oldManifest, archived)
      else if (existsSync(oldManifest)) throw new Error(`이전 manifest 보관 파일이 이미 있습니다: ${archived}`)
      if (readdirSync(traditionDir).length === 0) rmdirSync(traditionDir)
    } else if (leftovers.length > 0) {
      throw new Error(`분리 뒤 원래 전승 폴더에 예상 밖 파일이 남았습니다: ${traditionDir}`)
    }
  }

  for (const group of [MISSING_GROUP, EXISTING_GROUP]) {
    const rows = manifest.filter((row) => collectionGroup(row) === group)
    writeJson(path.join(OUTPUT_ROOT, group, 'manifest.json'), rows)
    const byTradition = Map.groupBy(rows, (row) => row.primary_tradition)
    for (const [tradition, traditionRows] of byTradition) {
      writeJson(path.join(OUTPUT_ROOT, group, tradition, 'manifest.json'), traditionRows)
    }
  }

  const sortedManifest = [...manifest].sort((a, b) => a.slug.localeCompare(b.slug, 'en'))
  writeJson(manifestPath, sortedManifest)

  const summary = {
    organized_at: new Date().toISOString(),
    collection_started_at: COLLECTION_STARTED_AT,
    service_target_count: manifest.length,
    groups: {
      [MISSING_GROUP]: {
        people: missing.length,
        with_candidates: missing.filter((row) => row.candidate_count > 0).length,
        without_candidates: missing.filter((row) => row.candidate_count === 0).length,
        candidate_files: missing.reduce((sum, row) => sum + row.candidate_count, 0),
      },
      [EXISTING_GROUP]: {
        people: existing.length,
        with_candidates: existing.filter((row) => row.candidate_count > 0).length,
        without_candidates: existing.filter((row) => row.candidate_count === 0).length,
        candidate_files: existing.reduce((sum, row) => sum + row.candidate_count, 0),
      },
    },
    total_candidate_files: manifest.reduce((sum, row) => sum + row.candidate_count, 0),
  }
  writeJson(path.join(OUTPUT_ROOT, 'summary.json'), summary)
  writeFileSync(path.join(OUTPUT_ROOT, MISSING_GROUP, 'README.md'), buildReadme(missing), 'utf8')

  for (const move of moves) {
    if (!existsSync(move.to) || !statSync(move.to).isDirectory()) {
      throw new Error(`분리 후 인물 폴더 검증 실패: ${move.to}`)
    }
  }

  console.log(JSON.stringify(summary, null, 2))
}

main()
