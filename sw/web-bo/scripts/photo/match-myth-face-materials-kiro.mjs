/**
 * Kiro GPT-5.6 Sol 워커 3대가 얼굴 외형 원장과 avatar NULL 신화 인물을 비교한다.
 * 결과는 검토용 제안만 만들며 이미지, DB, R2, 정식 REF는 수정하지 않는다.
 *
 * 실행: node scripts/photo/match-myth-face-materials-kiro.mjs
 */
import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const APPEARANCES_PATH = path.join(ROOT, 'appearances.json')
const TARGETS_PATH = path.join(ROOT, 'avatar-null-targets.json')
const WORK_ROOT = path.join(ROOT, '_matching-work')
const RAW_PATH = path.join(ROOT, 'matching-candidates.json')
const PROPOSAL_PATH = path.join(ROOT, 'matching-proposal.json')
const MARKDOWN_PATH = path.join(ROOT, 'MATCHING.md')
const KIRO_EXE = 'C:\\Users\\webco\\AppData\\Local\\Kiro-Cli\\kiro-cli.exe'
const MODEL = 'gpt-5.6-sol'
const WORKERS = 3
const MAX_ATTEMPTS = 3
const CALL_TIMEOUT_MS = 12 * 60 * 1000
const EXPECTED_MATERIALS = 503
const EXPECTED_TARGETS = 198
const MIN_MATCH_SCORE = 72
const MIN_MYTHIC_POTENTIAL = 4

const MAX_TARGETS_PER_LANE = 30
const CASTING_GROUPS = [
  {
    id: 'greco-roman',
    traditions: new Set([
      'argonauts',
      'greek-roman-myth',
      'heracles',
      'homer-iliad',
      'homer-odyssey',
      'house-of-atreus',
      'virgil-aeneid',
    ]),
  },
  { id: 'arthur', traditions: new Set(['arthur-round-table']) },
  { id: 'china', traditions: new Set(['myth-china-fengshen', 'myth-china-xiyou']) },
  { id: 'egypt', traditions: new Set(['myth-egypt']) },
  { id: 'hindu', traditions: new Set(['myth-hindu-mahabharata', 'myth-hindu-ramayana']) },
  { id: 'japan', traditions: new Set(['myth-japan']) },
  { id: 'korea', traditions: new Set(['myth-korea']) },
  { id: 'mesopotamia', traditions: new Set(['myth-mesopotamia']) },
  { id: 'norse', traditions: new Set(['myth-norse']) },
]

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function stripAnsi(value) {
  return value.replace(/\u001B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g, '')
}

function jsonObjectsFromText(text) {
  const objects = []
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false
    for (let index = start; index < text.length; index += 1) {
      const character = text[index]
      if (inString) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === '"') inString = false
        continue
      }
      if (character === '"') inString = true
      else if (character === '{') depth += 1
      else if (character === '}') {
        depth -= 1
        if (depth === 0) {
          try {
            objects.push(JSON.parse(text.slice(start, index + 1)))
          } catch {
            // 다음 여는 중괄호에서 다시 시도한다.
          }
          start = index
          break
        }
      }
    }
  }
  return objects
}

function compactMaterial(row) {
  return {
    id: row.material_id,
    presentation: row.presentation,
    age: row.apparent_age_band,
    skin: row.visible_skin_tone,
    hair: row.hair,
    facial_hair: row.facial_hair,
    face_shape: row.face_shape,
    face_structure: row.face_structure,
    energy: row.expression_energy,
    potential: row.mythic_face_potential_score,
    archetypes: row.best_archetypes,
  }
}

function compactTarget(row) {
  const target = {
    id: row.id,
    slug: row.slug,
    name: row.nickname,
    name_en: row.nickname_en,
    gender: row.gender_label,
    title: row.title,
    bio: row.bio,
    traditions: row.traditions.map((tradition) => ({
      slug: tradition.slug,
      name: tradition.name,
      role: tradition.short_desc,
    })),
  }
  if (row.slug === 'pan') {
    target.casting_note = '판은 인간형 수염 얼굴에 염소뿔·귀·하체를 더하는 표준 도상이므로 인간 얼굴 재료를 기초로 쓸 수 있다.'
  }
  return target
}

function castingGroupForTarget(target) {
  return CASTING_GROUPS.find((group) =>
    target.traditions.some((tradition) => group.traditions.has(tradition.slug)))
}

function buildLanes(targets, sourceMaterials, appearances) {
  const appearanceById = new Map(appearances.map((row) => [row.material_id, row]))
  const lanes = []
  let laneId = 1
  for (const group of CASTING_GROUPS) {
    const groupTargets = targets.filter((target) => castingGroupForTarget(target)?.id === group.id)
    const groupAppearances = sourceMaterials
      .filter((material) => group.traditions.has(material.collection_provenance.primary_tradition))
      .map((material) => appearanceById.get(material.material_id))
      .filter(Boolean)
    for (let offset = 0; offset < groupTargets.length; offset += MAX_TARGETS_PER_LANE) {
      lanes.push({
        laneId,
        groupId: group.id,
        targets: groupTargets.slice(offset, offset + MAX_TARGETS_PER_LANE),
        appearances: groupAppearances,
      })
      laneId += 1
    }
  }
  const assignedTargetIds = lanes.flatMap((lane) => lane.targets.map((target) => target.id))
  if (assignedTargetIds.length !== targets.length || new Set(assignedTargetIds).size !== targets.length) {
    throw new Error('전승별 캐스팅 그룹에 모든 대상을 정확히 한 번 배정하지 못했습니다.')
  }
  return lanes
}

function writeLaneInput(laneId, targets, appearances) {
  const genders = new Set(targets.map((row) => row.gender_label))
  const allowedPresentations = genders.size === 1 && genders.has('female')
    ? new Set(['feminine', 'androgynous', 'unclear'])
    : genders.size === 1 && genders.has('male')
      ? new Set(['masculine', 'androgynous', 'unclear'])
      : new Set(['masculine', 'feminine', 'androgynous', 'unclear'])
  const eligibleAppearances = appearances
    .filter((row) => row.face_visible
      && row.mythic_face_potential_score >= MIN_MYTHIC_POTENTIAL
      && allowedPresentations.has(row.presentation))
  const materials = eligibleAppearances.map(compactMaterial)
  const inputPath = path.join(WORK_ROOT, `lane-${laneId}-input.jsonl`)
  const lines = [
    JSON.stringify({ type: 'meta', lane_id: laneId, target_count: targets.length, material_count: materials.length }),
    ...targets.map((row) => JSON.stringify({ type: 'target', ...compactTarget(row) })),
    ...materials.map((row) => JSON.stringify({ type: 'material', ...row })),
  ]
  writeFileSync(inputPath, `${lines.join('\n')}\n`, 'utf8')
  return {
    inputPath,
    appearances: eligibleAppearances,
    materialIds: new Set(eligibleAppearances.map((row) => row.material_id)),
  }
}

function promptFor(laneId, workerId, inputPath, targetCount) {
  return `당신은 세 대의 Kiro-Sol 신화 인물 얼굴 캐스팅 워커 중 ${workerId}번이며 지금 ${laneId}번 레인을 맡았다. ` +
    `로컬 파일 ${inputPath} 를 read 도구로 처음부터 끝까지 읽어라. 파일에는 이 레인의 avatar 없는 신화 인물 ${targetCount}명과, 아직 누구에게도 배정되지 않은 얼굴 재료 외형 요약이 있다. ` +
    `입력 얼굴 재료는 대상과 같거나 시각적으로 호환되는 전승권에서 수집한 후보로 이미 좁혀져 있다. 원래 수집 당시의 특정 인물명은 무시하되, 최종 캐릭터가 속한 전승의 시각적 맥락에서 어색하지 않은 얼굴을 골라라. ` +
    `현재 사진의 원래 인물·폴더 provenance·의상·배경·조명·워터마크는 배정 근거가 아니다. GPT 재생성에서도 유지해야 하는 얼굴 골격, 눈, 코, 입, 나이 인상, 표정 에너지와 신화적 잠재력만 비교한다. ` +
    `각 신화 인물마다 서로 다른 얼굴 재료 중 최선의 후보를 최대 2개 순위로 제안하라. 후보 score는 얼굴 자체가 그 인물의 역할과 위계, 나이, 성별 표현, 정서, 신적·영웅적 인상에 맞는 정도를 0~100 정수로 매긴다. ` +
    `각 target의 1순위 material_id는 이 레인 안에서 가능한 한 겹치지 않게 전체 배치를 조정하라. 한 후보를 여러 인물의 후보로 올리는 것은 정말 강한 적합성이 있을 때만 허용하며, 실제 최종 중복 해소는 전체 원장에서 한다. ` +
    `사람 얼굴을 기초로 신화 복식, 머리 장식, 신성한 조명, 뿔 같은 부가 요소를 재생성할 수 있다. 그러나 동물 머리·동물 몸 자체가 정체성의 핵심인 존재에게 평범한 인간 얼굴을 억지로 배정하지 말고 no_safe_match로 둔다. ` +
    `target에 casting_note가 있으면 그 도상 판단을 우선 적용한다. ` +
    `재료 속 사람의 실제 민족·국적·정체를 추정하거나 단정하지 않는다. 보이는 외형과 신화 인물 설정 및 전승의 시각적 맥락 사이의 합만 판단한다. ` +
    `ranked_candidates에는 72점 이상인 후보만 최대 2개 넣고 높은 점수 순으로 정렬한다. 각 후보는 material_id, score, reason, regeneration_direction, risk 키를 가진다. reason은 어떤 얼굴 특징이 왜 이 인물에 맞는지 한국어 한 문장으로 구체적으로 쓴다. ` +
    `regeneration_direction은 얼굴 정체성을 보존하며 무엇을 신화적으로 더할지 짧게 쓰고, risk는 어긋날 수 있는 핵심 한 가지를 쓴다. ` +
    `적합한 얼굴이 없으면 ranked_candidates를 빈 배열로 하고 no_match_reason에 이유를 쓴다. ` +
    `응답은 다른 설명, 마크다운, 코드펜스 없이 minified JSON 객체 하나만 반환한다. 최상위 키는 lane_id와 results다. ` +
    `results는 입력 target 순서 그대로 ${targetCount}건이어야 하며 각 항목의 정확한 키는 target_id, target_slug, ranked_candidates, no_match_reason이다. ` +
    `파일을 쓰거나 수정하지 말고 읽기만 하라.`
}

function validateLane(result, laneId, targets, materialIds) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('응답이 객체가 아닙니다.')
  if (result.lane_id !== laneId) throw new Error(`lane_id 불일치: ${result.lane_id}`)
  if (!Array.isArray(result.results) || result.results.length !== targets.length) {
    throw new Error(`results 건수 불일치: ${result.results?.length}`)
  }
  const targetById = new Map(targets.map((row) => [row.id, row]))
  const seenTargets = new Set()
  for (const row of result.results) {
    const target = targetById.get(row.target_id)
    if (!target || target.slug !== row.target_slug) throw new Error(`대상 불일치: ${row.target_slug}`)
    if (seenTargets.has(row.target_id)) throw new Error(`대상 중복: ${row.target_slug}`)
    seenTargets.add(row.target_id)
    if (!Array.isArray(row.ranked_candidates) || row.ranked_candidates.length > 2) {
      throw new Error(`후보 배열 오류: ${row.target_slug}`)
    }
    const seenMaterials = new Set()
    for (const candidate of row.ranked_candidates) {
      if (!materialIds.has(candidate.material_id)) throw new Error(`없는 재료: ${candidate.material_id}`)
      if (seenMaterials.has(candidate.material_id)) throw new Error(`후보 중복: ${row.target_slug}`)
      seenMaterials.add(candidate.material_id)
      if (!Number.isInteger(candidate.score) || candidate.score < MIN_MATCH_SCORE || candidate.score > 100) {
        throw new Error(`점수 오류: ${row.target_slug} ${candidate.score}`)
      }
      for (const key of ['reason', 'regeneration_direction', 'risk']) {
        if (typeof candidate[key] !== 'string' || !candidate[key].trim()) {
          throw new Error(`${row.target_slug} ${key} 누락`)
        }
      }
    }
    if (row.no_match_reason == null) row.no_match_reason = ''
    if (typeof row.no_match_reason !== 'string') throw new Error(`no_match_reason 형식 오류: ${row.target_slug}`)
  }
  return result
}

function runLane(laneId, workerId, inputPath, targets, materialIds) {
  return new Promise((resolve, reject) => {
    const args = [
      'chat',
      '--model', MODEL,
      '--effort', 'medium',
      '--no-interactive',
      '--trust-tools=read',
      '--output-format', 'text',
      promptFor(laneId, workerId, inputPath, targets.length),
    ]
    const child = spawn(KIRO_EXE, args, {
      cwd: path.resolve('C:\\project\\feelandnote'),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`Kiro lane ${laneId} 호출 시간 초과`))
    }, CALL_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(new Error(`Kiro lane ${laneId} exit ${code}: ${stripAnsi(stderr || stdout).slice(-4_000)}`))
        return
      }
      try {
        const candidates = jsonObjectsFromText(stripAnsi(stdout))
        const result = candidates.find((row) => row?.lane_id === laneId && Array.isArray(row?.results))
        if (!result) throw new Error(`lane ${laneId} JSON을 찾지 못했습니다.`)
        resolve(validateLane(result, laneId, targets, materialIds))
      } catch (error) {
        reject(new Error(`${error.message}\n출력 끝: ${stripAnsi(stdout).slice(-4_000)}`))
      }
    })
  })
}

async function runLaneWithRetry(laneId, workerId, inputPath, targets, materialIds) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await runLane(laneId, workerId, inputPath, targets, materialIds)
      console.log(JSON.stringify({ event: 'lane_completed', lane_id: laneId, worker: workerId, attempt, targets: targets.length }))
      return { ...result, worker: workerId, attempt }
    } catch (error) {
      lastError = error
      console.error(JSON.stringify({ event: 'lane_retry', lane_id: laneId, worker: workerId, attempt, error: error.message.slice(0, 2_000) }))
    }
  }
  throw lastError
}

// n <= m인 최소 비용 할당. 각 대상에는 전용 dummy 열도 하나씩 둔다.
function hungarian(cost) {
  const n = cost.length
  const m = cost[0].length
  const u = Array(n + 1).fill(0)
  const v = Array(m + 1).fill(0)
  const p = Array(m + 1).fill(0)
  const way = Array(m + 1).fill(0)
  for (let i = 1; i <= n; i += 1) {
    p[0] = i
    let j0 = 0
    const minv = Array(m + 1).fill(Number.POSITIVE_INFINITY)
    const used = Array(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = Number.POSITIVE_INFINITY
      let j1 = 0
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue
        const current = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (current < minv[j]) {
          minv[j] = current
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }
  const assignment = Array(n).fill(-1)
  for (let j = 1; j <= m; j += 1) {
    if (p[j] !== 0) assignment[p[j] - 1] = j - 1
  }
  return assignment
}

function resolveMatches(targets, laneResults, materials) {
  const resultByTarget = new Map(laneResults.flatMap((lane) => lane.results).map((row) => [row.target_id, row]))
  const materialIds = materials.map((row) => row.material_id)
  const materialIndex = new Map(materialIds.map((id, index) => [id, index]))
  const dummyOffset = materialIds.length
  const forbidden = 100_000
  const cost = targets.map((target, targetIndex) => {
    const row = Array(materialIds.length + targets.length).fill(forbidden)
    const raw = resultByTarget.get(target.id)
    for (const candidate of raw?.ranked_candidates ?? []) {
      const index = materialIndex.get(candidate.material_id)
      if (index != null && candidate.score >= MIN_MATCH_SCORE) row[index] = 100 - candidate.score
    }
    row[dummyOffset + targetIndex] = 100
    return row
  })
  const assignment = hungarian(cost)
  return targets.map((target, index) => {
    const raw = resultByTarget.get(target.id)
    const assignedColumn = assignment[index]
    const materialId = assignedColumn >= 0 && assignedColumn < materialIds.length
      ? materialIds[assignedColumn]
      : null
    const candidate = raw?.ranked_candidates?.find((row) => row.material_id === materialId) ?? null
    const base = {
      target_id: target.id,
      target_slug: target.slug,
      target_name: target.nickname,
      target_name_en: target.nickname_en,
      gender: target.gender_label,
      traditions: target.traditions.map((row) => row.slug),
    }
    if (candidate) {
      return {
        ...base,
        status: 'matched',
        material_id: candidate.material_id,
        fit_score: candidate.score,
        reason: candidate.reason,
        regeneration_direction: candidate.regeneration_direction,
        risk: candidate.risk,
      }
    }
    return {
      ...base,
      status: 'no_safe_match',
      material_id: null,
      fit_score: null,
      reason: raw?.ranked_candidates?.length
        ? '기준을 통과한 후보가 다른 인물과 충돌해 고유 배정으로 남지 않았다.'
        : raw?.no_match_reason || '기준을 통과한 얼굴 재료가 없다.',
      regeneration_direction: null,
      risk: null,
    }
  })
}

function markdownText(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ').trim()
}

function buildMarkdown(matches, materialById, targetById) {
  const lines = [
    '# avatar 없는 신화 인물 얼굴 재료 매칭안',
    '',
    'DB·R2·정식 REF에는 반영하지 않은 검토용 제안이다. 한 얼굴 재료는 한 인물에게만 배정했다.',
    '',
  ]
  const traditionSlugs = [...new Set(matches.flatMap((row) => row.traditions))].sort()
  for (const traditionSlug of traditionSlugs) {
    const rows = matches.filter((row) => row.traditions.includes(traditionSlug))
    lines.push(`## ${traditionSlug}`, '', '| 인물 | 결과 | 얼굴 | 점수 | 근거 |', '|---|---|---|---:|---|')
    for (const row of rows) {
      const target = targetById.get(row.target_id)
      const name = `${markdownText(target?.nickname)} (${markdownText(target?.nickname_en)})`
      if (row.status === 'matched') {
        const material = materialById.get(row.material_id)
        const imageLink = `./재료/${encodeURIComponent(material.filename)}`
        lines.push(`| ${name} | 매칭 | [${row.material_id}](${imageLink}) | ${row.fit_score} | ${markdownText(row.reason)} |`)
      } else {
        lines.push(`| ${name} | 보류 | — | — | ${markdownText(row.reason)} |`)
      }
    }
    lines.push('')
  }
  writeFileSync(MARKDOWN_PATH, `${lines.join('\n')}\n`, 'utf8')
}

async function main() {
  if (!existsSync(KIRO_EXE)) throw new Error(`Kiro CLI가 없습니다: ${KIRO_EXE}`)
  const appearanceRoot = readJson(APPEARANCES_PATH)
  const targetRoot = readJson(TARGETS_PATH)
  const materialRoot = readJson(path.join(ROOT, 'materials.json'))
  const appearances = appearanceRoot.appearances ?? appearanceRoot
  const targets = targetRoot.targets ?? targetRoot
  const sourceMaterials = materialRoot.materials ?? materialRoot
  if (appearances.length !== EXPECTED_MATERIALS) throw new Error(`외형 분류가 503건이 아닙니다: ${appearances.length}`)
  if (targets.length !== EXPECTED_TARGETS) throw new Error(`avatar NULL 대상이 198명이 아닙니다: ${targets.length}`)
  mkdirSync(WORK_ROOT, { recursive: true })

  const lanes = buildLanes(targets, sourceMaterials, appearances).map((lane) => {
    const input = writeLaneInput(lane.laneId, lane.targets, lane.appearances)
    return { ...lane, ...input }
  })
  console.log(JSON.stringify({
    event: 'start',
    model: MODEL,
    workers: WORKERS,
    lanes: lanes.map((lane) => ({
      lane_id: lane.laneId,
      group: lane.groupId,
      targets: lane.targets.length,
      materials: lane.appearances.length,
    })),
  }))
  let laneResults
  let reusedExistingCandidates = false
  if (existsSync(RAW_PATH)) {
    try {
      const existing = readJson(RAW_PATH)
      if (existing.classifier?.model !== MODEL
        || existing.casting_scope !== 'tradition-group-v1'
        || existing.lanes?.length !== lanes.length) {
        throw new Error('기존 후보 원장의 모델 또는 레인 수가 다릅니다.')
      }
      laneResults = lanes.map((lane, index) => ({
        ...validateLane(existing.lanes[index], lane.laneId, lane.targets, lane.materialIds),
        worker: existing.lanes[index].worker,
        attempt: existing.lanes[index].attempt,
      }))
      reusedExistingCandidates = true
      console.log(JSON.stringify({ event: 'reused_existing_candidates', lanes: laneResults.length }))
    } catch (error) {
      console.error(JSON.stringify({ event: 'candidate_reuse_skipped', error: error.message }))
    }
  }
  if (!laneResults) {
    laneResults = Array(lanes.length)
    let nextLaneIndex = 0
    async function worker(workerId) {
      while (true) {
        const laneIndex = nextLaneIndex
        nextLaneIndex += 1
        if (laneIndex >= lanes.length) return
        const lane = lanes[laneIndex]
        laneResults[laneIndex] = await runLaneWithRetry(
          lane.laneId,
          workerId,
          lane.inputPath,
          lane.targets,
          lane.materialIds,
        )
      }
    }
    await Promise.all(Array.from({ length: WORKERS }, (_, index) => worker(index + 1)))
  }

  let matches = resolveMatches(targets, laneResults, appearances)
  let repairLanes = []
  const appearanceByIdForRepair = new Map(appearances.map((row) => [row.material_id, row]))
  const conflicted = matches.filter((row) => row.status === 'no_safe_match'
    && (row.reason === '기준을 통과한 후보가 다른 인물과 충돌해 고유 배정으로 남지 않았다.'
      || row.target_slug === 'pan'))
  const lowPotentialMatches = matches.filter((row) => row.status === 'matched'
    && appearanceByIdForRepair.get(row.material_id)?.mythic_face_potential_score < MIN_MYTHIC_POTENTIAL)
  const reconsideredIds = new Set([
    ...conflicted.map((row) => row.target_id),
    ...lowPotentialMatches.map((row) => row.target_id),
  ])
  if (reconsideredIds.size > 0) {
    const usedIds = new Set(matches.filter((row) => row.status === 'matched').map((row) => row.material_id))
    const appearanceById = new Map(appearances.map((row) => [row.material_id, row]))
    const repairJobs = []
    let repairLaneId = lanes.length + 1
    for (const group of CASTING_GROUPS) {
      const repairTargets = targets.filter((target) =>
        reconsideredIds.has(target.id) && castingGroupForTarget(target)?.id === group.id)
      if (repairTargets.length === 0) continue
      const unusedGroupAppearances = sourceMaterials
        .filter((material) => group.traditions.has(material.collection_provenance.primary_tradition)
          && !usedIds.has(material.material_id))
        .map((material) => appearanceById.get(material.material_id))
        .filter(Boolean)
      const input = writeLaneInput(repairLaneId, repairTargets, unusedGroupAppearances)
      repairJobs.push({
        laneId: repairLaneId,
        groupId: group.id,
        targets: repairTargets,
        ...input,
      })
      repairLaneId += 1
    }
    repairLanes = Array(repairJobs.length)
    let nextRepairIndex = 0
    async function repairWorker(workerId) {
      while (true) {
        const repairIndex = nextRepairIndex
        nextRepairIndex += 1
        if (repairIndex >= repairJobs.length) return
        const job = repairJobs[repairIndex]
        repairLanes[repairIndex] = await runLaneWithRetry(
          job.laneId,
          workerId,
          job.inputPath,
          job.targets,
          job.materialIds,
        )
      }
    }
    await Promise.all(Array.from(
      { length: Math.min(WORKERS, repairJobs.length) },
      (_, index) => repairWorker(index + 1),
    ))
    const repairedByTarget = new Map()
    for (const [index, job] of repairJobs.entries()) {
      const repairedRows = resolveMatches(job.targets, [repairLanes[index]], job.appearances)
      for (const row of repairedRows) repairedByTarget.set(row.target_id, row)
    }
    matches = matches.map((row) => repairedByTarget.get(row.target_id) ?? row)
  }

  writeJson(RAW_PATH, {
    generated_at: new Date().toISOString(),
    classifier: { provider: 'kiro-cli', model: MODEL, workers: WORKERS },
    casting_scope: 'tradition-group-v1',
    min_match_score: MIN_MATCH_SCORE,
    reused_existing_candidates: reusedExistingCandidates,
    lanes: laneResults,
    repair_lanes: repairLanes,
  })
  const matched = matches.filter((row) => row.status === 'matched')
  const noSafeMatch = matches.filter((row) => row.status === 'no_safe_match')
  if (new Set(matched.map((row) => row.material_id)).size !== matched.length) {
    throw new Error('최종 매칭에 material_id 중복이 있습니다.')
  }
  writeJson(PROPOSAL_PATH, {
    generated_at: new Date().toISOString(),
    status: 'proposal_only',
    applied_to_db_or_storage: false,
    target_count: targets.length,
    matched_count: matched.length,
    no_safe_match_count: noSafeMatch.length,
    min_match_score: MIN_MATCH_SCORE,
    matches,
  })

  buildMarkdown(
    matches,
    new Map(sourceMaterials.map((row) => [row.material_id, row])),
    new Map(targets.map((row) => [row.id, row])),
  )
  if (path.dirname(WORK_ROOT) !== ROOT || path.basename(WORK_ROOT) !== '_matching-work') {
    throw new Error(`임시 작업 폴더 안전 검사 실패: ${WORK_ROOT}`)
  }
  rmSync(WORK_ROOT, { recursive: true, force: true })
  console.log(JSON.stringify({
    event: 'finish',
    targets: targets.length,
    matched: matched.length,
    no_safe_match: noSafeMatch.length,
    unique_materials: new Set(matched.map((row) => row.material_id)).size,
    proposal: PROPOSAL_PATH,
    markdown: MARKDOWN_PATH,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
