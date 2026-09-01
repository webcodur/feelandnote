/**
 * 신화 얼굴 후보를 인물 배정과 분리된 단일 재료 라이브러리로 이관한다.
 *
 * - accepted 이미지만 `재료/MF-YYYYMMDD-NNNN.ext`로 이동한다.
 * - 수집 당시 인물명은 검색·수집 provenance로만 보존한다.
 * - DB/R2/정식 REF에는 쓰지 않는다.
 *
 * 실행: node scripts/photo/build-myth-face-material-library.mjs
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const MATERIAL_DIR = path.join(ROOT, '재료')
const RECORD_ROOT = path.join(ROOT, '_수집기록')
const PERSON_RECORD_ROOT = path.join(RECORD_ROOT, '인물별')
const LEGACY_ROOT = path.join(RECORD_ROOT, '이전-분류-메타')
const PLAN_PATH = path.join(ROOT, '_material-library-plan.json')
const MATERIALS_PATH = path.join(ROOT, 'materials.json')
const ID_DATE = '20260831'
const EXPECTED_MATERIALS = 503
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function assertInsideRoot(target) {
  const resolved = path.resolve(target)
  const rootPrefix = `${ROOT}${path.sep}`.toLowerCase()
  if (resolved !== ROOT && !resolved.toLowerCase().startsWith(rootPrefix)) {
    throw new Error(`작업 루트 밖 경로입니다: ${resolved}`)
  }
  return resolved
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  assertInsideRoot(file)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function sha256(file) {
  const hash = createHash('sha256')
  hash.update(readFileSync(file))
  return hash.digest('hex')
}

function imageFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'))
}

function verifyFile(file, expectedSha) {
  if (!existsSync(file) || !statSync(file).isFile()) {
    throw new Error(`파일이 없습니다: ${file}`)
  }
  const actualSha = sha256(file)
  if (actualSha !== expectedSha) {
    throw new Error(`SHA256 불일치: ${file}\n예상 ${expectedSha}\n실제 ${actualSha}`)
  }
}

function renameWithRetry(from, to) {
  let lastError
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      renameSync(from, to)
      return
    } catch (error) {
      lastError = error
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error?.code) || attempt === 5) throw error
      const delayMs = 100 * (2 ** attempt)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
    }
  }
  throw lastError
}

function buildPlan() {
  const manifestPath = path.join(ROOT, 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error(`이전 manifest가 없습니다: ${manifestPath}`)
  const people = readJson(manifestPath)
  if (!Array.isArray(people)) throw new Error('이전 manifest가 배열이 아닙니다.')

  const rawMaterials = []
  for (const person of people) {
    const personDir = assertInsideRoot(person.candidate_dir)
    const sourcesPath = path.join(personDir, 'sources.json')
    const sources = readJson(sourcesPath)
    const acceptedByFilename = new Map(
      (sources.accepted ?? []).filter((row) => row?.filename).map((row) => [row.filename, row]),
    )

    for (const filename of [...(person.candidate_files ?? [])].sort((a, b) => a.localeCompare(b, 'en'))) {
      const extension = path.extname(filename).toLowerCase()
      if (!IMAGE_EXTENSIONS.has(extension)) throw new Error(`지원하지 않는 확장자: ${filename}`)
      const sourcePath = assertInsideRoot(path.join(personDir, filename))
      if (!existsSync(sourcePath)) throw new Error(`후보 파일이 없습니다: ${sourcePath}`)
      const source = acceptedByFilename.get(filename)
      if (!source) throw new Error(`${person.slug}/${filename}: accepted 출처 기록이 없습니다.`)
      const actualSha = sha256(sourcePath)
      if (source.sha256 && source.sha256 !== actualSha) {
        throw new Error(`${person.slug}/${filename}: sources.json SHA256이 실제 파일과 다릅니다.`)
      }
      const stats = statSync(sourcePath)
      rawMaterials.push({
        source_path: sourcePath,
        source_relative_path: path.relative(ROOT, sourcePath),
        original_filename: filename,
        extension,
        sha256: actualSha,
        bytes: stats.size,
        width: source.width ?? null,
        height: source.height ?? null,
        collection_person_dir: personDir,
        collection_record_dir: path.join(
          PERSON_RECORD_ROOT,
          person.primary_tradition,
          person.slug,
        ),
        collection_provenance: {
          note: '수집 당시 검색 맥락이며 이 얼굴 재료의 인물 배정을 뜻하지 않습니다.',
          celeb_id: person.id,
          slug: person.slug,
          nickname: person.nickname,
          nickname_en: person.nickname_en,
          primary_tradition: person.primary_tradition,
          gender_label_at_collection: person.gender_label,
          query: source.query ?? null,
          pin_url: source.pin_url ?? null,
          pin_title: source.pin_title ?? null,
          image_url: source.image_url ?? null,
          identity_check: source.identity_check ?? null,
          identity_risk: source.identity_risk ?? source.public_identity_risk ?? null,
          quality_note: source.quality_note ?? null,
          divine_presence_at_collection: source.divine_presence ?? null,
          face_audit: source.face_audit ?? null,
        },
      })
    }
  }

  rawMaterials.sort((left, right) => {
    const tradition = left.collection_provenance.primary_tradition.localeCompare(
      right.collection_provenance.primary_tradition,
      'en',
    )
    const slug = left.collection_provenance.slug.localeCompare(right.collection_provenance.slug, 'en')
    return tradition || slug || left.original_filename.localeCompare(right.original_filename, 'en')
  })

  if (rawMaterials.length !== EXPECTED_MATERIALS) {
    throw new Error(`재료 수가 예상과 다릅니다: ${rawMaterials.length}`)
  }
  if (new Set(rawMaterials.map((row) => row.source_path.toLowerCase())).size !== rawMaterials.length) {
    throw new Error('이전 후보 경로가 중복됐습니다.')
  }
  if (new Set(rawMaterials.map((row) => row.sha256)).size !== rawMaterials.length) {
    throw new Error('서로 같은 이미지 SHA256이 재료 풀에 남아 있습니다.')
  }

  const materials = rawMaterials.map((row, index) => {
    const materialId = `MF-${ID_DATE}-${String(index + 1).padStart(4, '0')}`
    const filename = `${materialId}${row.extension}`
    return {
      material_id: materialId,
      filename,
      material_path: path.join(MATERIAL_DIR, filename),
      material_relative_path: path.join('재료', filename),
      ...row,
    }
  })

  const plan = {
    created_at: new Date().toISOString(),
    root: ROOT,
    material_count: materials.length,
    materials,
  }
  writeJson(PLAN_PATH, plan)
  return plan
}

function loadOrBuildPlan() {
  return existsSync(PLAN_PATH) ? readJson(PLAN_PATH) : buildPlan()
}

function moveMaterials(plan) {
  mkdirSync(MATERIAL_DIR, { recursive: true })
  for (const material of plan.materials) {
    const sourcePath = assertInsideRoot(material.source_path)
    const materialPath = assertInsideRoot(material.material_path)
    const sourceExists = existsSync(sourcePath)
    const materialExists = existsSync(materialPath)
    if (sourceExists && materialExists) {
      throw new Error(`원본과 대상이 동시에 존재합니다: ${material.material_id}`)
    }
    if (sourceExists) {
      verifyFile(sourcePath, material.sha256)
      renameWithRetry(sourcePath, materialPath)
    } else if (!materialExists) {
      throw new Error(`원본과 대상이 모두 없습니다: ${material.material_id}`)
    }
    verifyFile(materialPath, material.sha256)
  }
}

function rewriteCollectionRecords(plan) {
  const byPersonDir = Map.groupBy(plan.materials, (row) => row.collection_person_dir)
  for (const [personDir, materials] of byPersonDir) {
    const targetDir = assertInsideRoot(materials[0].collection_record_dir)
    const sourceDir = assertInsideRoot(personDir)
    const sourceExists = existsSync(sourceDir)
    const targetExists = existsSync(targetDir)

    if (sourceExists && targetExists) {
      throw new Error(`수집 기록 원본과 대상이 동시에 존재합니다: ${sourceDir}`)
    }
    if (sourceExists) {
      const sourcesPath = path.join(sourceDir, 'sources.json')
      const sources = readJson(sourcesPath)
      const materialByOriginal = new Map(materials.map((row) => [row.original_filename, row]))
      sources.accepted = (sources.accepted ?? []).map((row) => {
        const material = materialByOriginal.get(row.filename)
        return material ? {
          ...row,
          material_id: material.material_id,
          material_path: material.material_path,
        } : row
      })
      writeJson(sourcesPath, sources)

      const personPath = path.join(sourceDir, 'person.json')
      const previousPerson = existsSync(personPath) ? readJson(personPath) : {}
      const neutralPersonRecord = {
        collection_subject: {
          id: previousPerson.id ?? materials[0].collection_provenance.celeb_id,
          slug: previousPerson.slug ?? materials[0].collection_provenance.slug,
          nickname: previousPerson.nickname ?? materials[0].collection_provenance.nickname,
          nickname_en: previousPerson.nickname_en ?? materials[0].collection_provenance.nickname_en,
          primary_tradition: previousPerson.primary_tradition ?? materials[0].collection_provenance.primary_tradition,
        },
        note: '이 인물 정보는 얼굴을 처음 수집한 검색 맥락이며 현재 재료 배정을 뜻하지 않습니다.',
        material_ids: materials.map((row) => row.material_id),
        material_paths: materials.map((row) => row.material_path),
      }
      writeJson(personPath, neutralPersonRecord)
      mkdirSync(path.dirname(targetDir), { recursive: true })
      renameWithRetry(sourceDir, targetDir)
    } else if (!targetExists) {
      throw new Error(`수집 기록 원본과 대상이 모두 없습니다: ${sourceDir}`)
    }
  }
}

function moveIfPresent(from, to) {
  from = assertInsideRoot(from)
  to = assertInsideRoot(to)
  if (!existsSync(from)) return false
  if (existsSync(to)) throw new Error(`이관 대상이 이미 있습니다: ${to}`)
  mkdirSync(path.dirname(to), { recursive: true })
  renameWithRetry(from, to)
  return true
}

function archiveLegacyLayout() {
  moveIfPresent(path.join(ROOT, '01-없던-인물'), path.join(LEGACY_ROOT, 'batch-a'))
  moveIfPresent(path.join(ROOT, '02-있던-인물'), path.join(LEGACY_ROOT, 'batch-b'))
  moveIfPresent(path.join(ROOT, '_audit-sheets'), path.join(RECORD_ROOT, '검수시트'))
  moveIfPresent(path.join(ROOT, '_metadata'), path.join(RECORD_ROOT, '메타데이터'))

  const rootLegacy = path.join(LEGACY_ROOT, 'root')
  const legacyFiles = readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name === 'manifest.json' || name === 'summary.json' || /^run-.*\.json$/i.test(name))
  for (const name of legacyFiles) moveIfPresent(path.join(ROOT, name), path.join(rootLegacy, name))
}

function finalMaterials(plan) {
  return plan.materials.map((material) => ({
    material_id: material.material_id,
    filename: material.filename,
    material_path: material.material_path,
    material_relative_path: material.material_relative_path,
    extension: material.extension,
    sha256: material.sha256,
    bytes: material.bytes,
    width: material.width,
    height: material.height,
    collection_record_path: material.collection_record_dir,
    collection_provenance: material.collection_provenance,
  }))
}

function writeReadme(materials) {
  const readme = `# 얼굴 재료\n\n` +
    `${materials.length}장의 미배정 얼굴 재료다. 이미지는 \`재료/\` 한 폴더에 있으며 ` +
    `\`MF-${ID_DATE}-NNNN\`이 안정 ID다.\n\n` +
    `\`materials.json\`은 파일·SHA256·출처를 연결한다. 수집 당시 인물명은 검색 provenance일 뿐 ` +
    `현재 인물 배정을 뜻하지 않는다. 서비스 DB·R2·정식 REF에는 아직 반영하지 않았다.\n`
  writeFileSync(path.join(ROOT, 'README.md'), readme, 'utf8')
}

function verifyLibrary(materials) {
  const files = imageFiles(MATERIAL_DIR)
  if (files.length !== EXPECTED_MATERIALS) {
    throw new Error(`재료 폴더 이미지 수가 예상과 다릅니다: ${files.length}`)
  }
  if (materials.length !== EXPECTED_MATERIALS) {
    throw new Error(`materials.json 행 수가 예상과 다릅니다: ${materials.length}`)
  }
  const ids = new Set()
  const hashes = new Set()
  for (const material of materials) {
    if (ids.has(material.material_id)) throw new Error(`중복 재료 ID: ${material.material_id}`)
    if (hashes.has(material.sha256)) throw new Error(`중복 SHA256: ${material.material_id}`)
    ids.add(material.material_id)
    hashes.add(material.sha256)
    verifyFile(material.material_path, material.sha256)
  }
  for (const legacyName of ['01-없던-인물', '02-있던-인물']) {
    if (existsSync(path.join(ROOT, legacyName))) throw new Error(`옛 분류 폴더가 남았습니다: ${legacyName}`)
  }
}

function main() {
  if (existsSync(MATERIALS_PATH)) {
    const existing = readJson(MATERIALS_PATH)
    verifyLibrary(existing.materials ?? existing)
    console.log(JSON.stringify({ status: 'already_built', materials: EXPECTED_MATERIALS }, null, 2))
    return
  }

  const plan = loadOrBuildPlan()
  if (plan.material_count !== EXPECTED_MATERIALS) {
    throw new Error(`이관 계획 재료 수가 예상과 다릅니다: ${plan.material_count}`)
  }
  moveMaterials(plan)
  rewriteCollectionRecords(plan)
  archiveLegacyLayout()

  const materials = finalMaterials(plan)
  writeJson(MATERIALS_PATH, {
    generated_at: new Date().toISOString(),
    id_scheme: `MF-${ID_DATE}-NNNN`,
    assignment_status: 'unassigned',
    material_count: materials.length,
    materials,
  })
  writeReadme(materials)
  verifyLibrary(materials)
  moveIfPresent(PLAN_PATH, path.join(RECORD_ROOT, 'material-library-migration-plan.json'))

  const extensions = Object.fromEntries(
    [...Map.groupBy(materials, (row) => row.extension).entries()].map(([extension, rows]) => [extension, rows.length]),
  )
  console.log(JSON.stringify({
    status: 'built',
    root: ROOT,
    material_dir: MATERIAL_DIR,
    materials: materials.length,
    unique_sha256: new Set(materials.map((row) => row.sha256)).size,
    extensions,
  }, null, 2))
}

main()
