/**
 * 단일 얼굴 재료 503장을 Kiro GPT-5.6 Sol 워커 3대로 분류한다.
 *
 * 결과는 한 건이 끝날 때마다 appearance.jsonl에 append한다. 재실행하면 완료 ID를 건너뛴다.
 * 이미지와 DB/R2/정식 REF는 수정하지 않는다.
 *
 * 실행: node scripts/photo/classify-myth-face-materials-kiro.mjs
 */
import {
  appendFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { runKiro as callKiro } from '../../../../.agents/skills/kiro-gpt/scripts/kiro-call.mjs'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const MATERIALS_PATH = path.join(ROOT, 'materials.json')
const APPEARANCE_JSONL = path.join(ROOT, 'appearance.jsonl')
const APPEARANCES_JSON = path.join(ROOT, 'appearances.json')
const RUN_PATH = path.join(ROOT, 'classification-run.json')
const ERROR_PATH = path.join(ROOT, 'classification-errors.json')
const MODEL = 'gpt-5.6-sol'
const WORKERS = 3
const MAX_ATTEMPTS = 3
const CALL_TIMEOUT_MS = 4 * 60 * 1000
const EXPECTED_MATERIALS = 503
const ALLOWED_PRESENTATIONS = new Set(['masculine', 'feminine', 'androgynous', 'unclear'])
const ALLOWED_ARCHETYPES = new Set([
  'sovereign',
  'warrior',
  'sage',
  'trickster',
  'guardian',
  'youth',
  'mystic',
  'maternal',
  'underworld',
  'courtier',
  'commoner',
])

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

function arrayOfStrings(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label}은 문자열 배열이어야 합니다.`)
  }
}

function validateAppearance(appearance, material) {
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    throw new Error('응답이 JSON 객체가 아닙니다.')
  }
  if (appearance.material_id !== material.material_id) {
    throw new Error(`material_id 불일치: ${appearance.material_id}`)
  }
  if (path.resolve(appearance.file ?? '').toLowerCase() !== path.resolve(material.material_path).toLowerCase()) {
    throw new Error(`file 경로 불일치: ${appearance.file}`)
  }
  if (typeof appearance.face_visible !== 'boolean') throw new Error('face_visible이 boolean이 아닙니다.')
  if (!ALLOWED_PRESENTATIONS.has(appearance.presentation)) {
    throw new Error(`허용하지 않는 presentation: ${appearance.presentation}`)
  }
  for (const key of [
    'apparent_age_band',
    'visible_skin_tone',
    'hair',
    'facial_hair',
    'face_shape',
    'face_structure',
    'expression_energy',
    'mythic_face_potential_reason',
    'uncertainty',
  ]) {
    if (typeof appearance[key] !== 'string' || !appearance[key].trim()) {
      throw new Error(`${key}가 비어 있습니다.`)
    }
  }
  if (!Number.isInteger(appearance.mythic_face_potential_score)
    || appearance.mythic_face_potential_score < 0
    || appearance.mythic_face_potential_score > 5) {
    throw new Error('mythic_face_potential_score가 0~5 정수가 아닙니다.')
  }
  for (const key of [
    'distinctive_visible_features',
    'best_archetypes',
    'weak_fit_archetypes',
    'regeneration_strengths',
    'regeneration_risks',
  ]) arrayOfStrings(appearance[key], key)
  if (appearance.best_archetypes.length > 3) throw new Error('best_archetypes가 3개를 넘습니다.')
  for (const archetype of [...appearance.best_archetypes, ...appearance.weak_fit_archetypes]) {
    if (!ALLOWED_ARCHETYPES.has(archetype)) throw new Error(`허용하지 않는 archetype: ${archetype}`)
  }
  if (!appearance.archetype_reasons || typeof appearance.archetype_reasons !== 'object'
    || Array.isArray(appearance.archetype_reasons)) {
    throw new Error('archetype_reasons가 객체가 아닙니다.')
  }
  for (const archetype of appearance.best_archetypes) {
    if (typeof appearance.archetype_reasons[archetype] !== 'string'
      || !appearance.archetype_reasons[archetype].trim()) {
      throw new Error(`${archetype}의 얼굴 기반 근거가 없습니다.`)
    }
  }
  return appearance
}

function promptFor(material, workerId) {
  return `당신은 세 명 중 ${workerId}번 Kiro-Sol 얼굴 재료 분류 워커다.\n` +
    `로컬 이미지 ${material.material_path} 를 읽어라. 이 이미지는 아직 어느 신화 인물에도 배정되지 않은 얼굴 재료다. ` +
    `폴더명·파일명 외에는 인물 정체 단서가 없으며, 신원 확인이나 민족·국적 추정을 하지 않는다. ` +
    `현재 의상·배경·조명·워터마크·크롭 상태는 합성 또는 GPT 재생성에서 바뀌므로 평가에서 제외하고 얼굴 자체를 본다. ` +
    `mythic_face_potential_score는 이 얼굴을 신화 복식과 조명으로 재생성했을 때 신적·영웅적·왕족적·기이한 전설성이 얼마나 설득력 있게 살아날지를 0~5 정수로 평가한다. ` +
    `현재 사진이 평범하다는 이유로 감점하지 않는다. 얼굴 골격·눈·눈썹·광대·턱·입·나이 인상처럼 실제로 보이는 근거만 쓴다.\n` +
    `설명 문자열은 모두 자연스러운 한국어로 쓴다. 단 presentation과 archetype enum 값만 아래 영문 허용값을 쓴다. ` +
    `best_archetypes는 얼굴 자체에 가장 강하게 맞는 것만 최대 3개 고르고, 선택한 각각에 구체적인 얼굴 기반 근거를 archetype_reasons에 쓴다.\n` +
    `다른 설명, 마크다운, 코드펜스 없이 유효한 minified JSON 객체 하나만 반환하라. 정확한 키는 다음과 같다: ` +
    `material_id, file, face_visible, presentation, apparent_age_band, visible_skin_tone, hair, facial_hair, face_shape, face_structure, distinctive_visible_features, expression_energy, mythic_face_potential_score, mythic_face_potential_reason, best_archetypes, archetype_reasons, weak_fit_archetypes, regeneration_strengths, regeneration_risks, uncertainty. ` +
    `material_id는 ${material.material_id}, file은 정확히 ${material.material_path}. ` +
    `presentation 허용값: masculine, feminine, androgynous, unclear. ` +
    `archetype 허용값: sovereign, warrior, sage, trickster, guardian, youth, mystic, maternal, underworld, courtier, commoner. ` +
    `distinctive_visible_features, best_archetypes, weak_fit_archetypes, regeneration_strengths, regeneration_risks는 문자열 배열이다. ` +
    `파일을 쓰거나 수정하지 말고 이미지 읽기만 하라.`
}

async function classifyWithKiro(material, workerId) {
  const result = await callKiro(promptFor(material, workerId), {
    cwd: path.resolve('C:\\project\\feelandnote'),
    model: MODEL,
    effort: 'high',
    agentEngine: 'v3',
    trustTools: ['read'],
    timeoutMs: CALL_TIMEOUT_MS,
    maxOutputBytes: 5_000_000,
  })
  if (result.code !== 0 || result.timedOut) {
    throw new Error(`Kiro exit ${result.code}: ${stripAnsi(result.stderr || result.stdout).slice(-2_000)}`)
  }
  try {
    const clean = stripAnsi(result.stdout)
    const candidates = jsonObjectsFromText(clean)
    const appearance = candidates.find((row) => row?.material_id === material.material_id)
    if (!appearance) throw new Error(`응답에서 ${material.material_id} JSON을 찾지 못했습니다.`)
    const credits = [...clean.matchAll(/Credits:\s*([0-9.]+)/g)].at(-1)?.[1]
    return {
      appearance: validateAppearance(appearance, material),
      credits: credits == null ? null : Number.parseFloat(credits),
      duration_ms: result.elapsedMs,
    }
  } catch (error) {
    throw new Error(`${error.message}\n출력 끝: ${stripAnsi(result.stdout).slice(-2_000)}`)
  }
}

function completedRecords() {
  const records = []
  if (!existsSync(APPEARANCE_JSONL)) return records
  const lines = readFileSync(APPEARANCE_JSONL, 'utf8').split(/\r?\n/).filter(Boolean)
  for (const [index, line] of lines.entries()) {
    try {
      records.push(JSON.parse(line))
    } catch (error) {
      throw new Error(`appearance.jsonl ${index + 1}행 파싱 실패: ${error.message}`)
    }
  }
  const ids = records.map((row) => row.material_id)
  if (new Set(ids).size !== ids.length) throw new Error('appearance.jsonl에 중복 material_id가 있습니다.')
  return records
}

async function main() {
  const materialRoot = readJson(MATERIALS_PATH)
  const materials = materialRoot.materials ?? materialRoot
  if (!Array.isArray(materials) || materials.length !== EXPECTED_MATERIALS) {
    throw new Error(`materials.json 재료 수가 예상과 다릅니다: ${materials?.length}`)
  }
  for (const material of materials) {
    if (!existsSync(material.material_path)) throw new Error(`재료 이미지가 없습니다: ${material.material_path}`)
  }

  const initialRecords = completedRecords()
  const completed = new Map(initialRecords.map((row) => [row.material_id, row]))
  const pending = materials.filter((row) => !completed.has(row.material_id))
  const errors = []
  let nextIndex = 0
  let completedNow = 0
  let creditsNow = 0
  const startedAt = new Date().toISOString()

  function writeRunState(status) {
    writeJson(RUN_PATH, {
      status,
      model: MODEL,
      workers: WORKERS,
      started_at: startedAt,
      updated_at: new Date().toISOString(),
      total: materials.length,
      completed_before_run: initialRecords.length,
      completed_this_run: completedNow,
      completed_total: completed.size,
      pending: materials.length - completed.size,
      failures: errors.length,
      credits_this_run: Number(creditsNow.toFixed(2)),
    })
  }

  writeRunState(pending.length === 0 ? 'already_complete' : 'running')
  console.log(JSON.stringify({
    event: 'start',
    model: MODEL,
    workers: WORKERS,
    total: materials.length,
    completed: completed.size,
    pending: pending.length,
  }))

  async function worker(workerId) {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= pending.length) return
      const material = pending[index]
      let lastError
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const result = await classifyWithKiro(material, workerId)
          const record = {
            ...result.appearance,
            classifier: {
              provider: 'kiro-cli',
              model: MODEL,
              worker: workerId,
              attempt,
              credits: result.credits,
              duration_ms: result.duration_ms,
              completed_at: new Date().toISOString(),
            },
          }
          appendFileSync(APPEARANCE_JSONL, `${JSON.stringify(record)}\n`, 'utf8')
          completed.set(material.material_id, record)
          completedNow += 1
          creditsNow += result.credits ?? 0
          writeRunState('running')
          console.log(JSON.stringify({
            event: 'completed',
            worker: workerId,
            material_id: material.material_id,
            attempt,
            completed: completed.size,
            total: materials.length,
            credits: result.credits,
            duration_ms: result.duration_ms,
          }))
          lastError = null
          break
        } catch (error) {
          lastError = error
          console.error(JSON.stringify({
            event: 'retry',
            worker: workerId,
            material_id: material.material_id,
            attempt,
            error: error.message.slice(0, 1_000),
          }))
        }
      }
      if (lastError) {
        errors.push({
          material_id: material.material_id,
          file: material.material_path,
          error: lastError.message,
        })
        writeJson(ERROR_PATH, errors)
        writeRunState('running_with_failures')
      }
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, (_, index) => worker(index + 1)))

  const finalRecords = [...completed.values()].sort((left, right) => left.material_id.localeCompare(right.material_id, 'en'))
  writeJson(APPEARANCES_JSON, {
    generated_at: new Date().toISOString(),
    classifier: { provider: 'kiro-cli', model: MODEL, workers: WORKERS },
    material_count: materials.length,
    classified_count: finalRecords.length,
    appearances: finalRecords,
  })
  if (errors.length === 0 && existsSync(ERROR_PATH)) unlinkSync(ERROR_PATH)
  writeRunState(errors.length === 0 && finalRecords.length === materials.length ? 'complete' : 'incomplete')
  console.log(JSON.stringify({
    event: 'finish',
    total: materials.length,
    classified: finalRecords.length,
    failures: errors.length,
    credits_this_run: Number(creditsNow.toFixed(2)),
  }))
  if (errors.length > 0 || finalRecords.length !== materials.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
