#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolutionConflictKey } from './lib/timeline-conflict-resolution-schema.mjs'
import {
  RESOLUTION_FILENAMES,
  validateConflictResolutions,
} from './timeline-conflict-resolution-validate.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, '..', '..', '..')
const DEFAULT_DRAFT_ROOT = path.join(
  REPOSITORY_ROOT,
  'docs',
  'celeb-data',
  'timeline',
  'drafts',
  '2026-08-09-all-celebs-2115',
)
const DEFAULT_RESOLUTION_DIR = path.join(
  REPOSITORY_ROOT,
  'docs',
  'celeb-data',
  'timeline',
  'reports',
  'resolutions',
)

const SCOPES = ['date', 'identity', 'other']
const ACTION_MAP = Object.freeze({
  UPDATE_PROFILE: 'SET_VALUE',
  KEEP_PROFILE: 'NO_CHANGE',
  REDUCE_PRECISION: 'REDUCE_PRECISION',
  IDENTITY_REVIEW: 'REVIEW_IDENTITY',
  QUARANTINE_PROFILE: 'QUARANTINE',
  RESUME_TIMELINE: 'RESUME_TIMELINE',
})
const PATCH_ACTIONS = new Set(Object.values(ACTION_MAP))
const DATE_FIELD_STORAGE = Object.freeze({
  birthDate: { column: 'birth_date', type: 'text | null' },
  deathDate: { column: 'death_date', type: 'text | null' },
})

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field)
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function usage() {
  return [
    'usage: node scripts/timeline-profile-patches-export.mjs [options]',
    '  --drafts=<dir>       snapshot draft root 또는 people 디렉터리',
    '  --resolutions=<dir>  세 resolution JSON이 있는 디렉터리',
    '  --date=<file>        date-conflicts.json 경로 재정의',
    '  --identity=<file>    identity-and-blocked.json 경로 재정의',
    '  --other=<file>       other-conflicts.json 경로 재정의',
    '  --output=<file>      staging JSON을 원자적으로 저장',
    '  --check-only         검증·생성 결과만 출력하고 파일은 쓰지 않음(기본값)',
    '  --help               도움말 출력',
    '',
    'DB, Supabase, 네트워크에 접근하지 않는 오프라인 staging 도구입니다.',
    '--output을 주지 않으면 항상 check-only이며, 이 JSON 자체는 DB 변경 명령이 아닙니다.',
  ].join('\n')
}

export function parseArgs(argv) {
  const options = { help: false, checkOnly: true }
  let explicitCheckOnly = false
  for (const arg of argv) {
    if (arg.startsWith('--drafts=')) options.draftRoot = arg.slice('--drafts='.length)
    else if (arg.startsWith('--draft-root=')) options.draftRoot = arg.slice('--draft-root='.length)
    else if (arg.startsWith('--resolutions=')) options.resolutionDir = arg.slice('--resolutions='.length)
    else if (arg.startsWith('--resolution-dir=')) options.resolutionDir = arg.slice('--resolution-dir='.length)
    else if (arg.startsWith('--date=')) options.date = arg.slice('--date='.length)
    else if (arg.startsWith('--identity=')) options.identity = arg.slice('--identity='.length)
    else if (arg.startsWith('--other=')) options.other = arg.slice('--other='.length)
    else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length)
      options.checkOnly = false
    } else if (arg === '--check-only') {
      options.checkOnly = true
      explicitCheckOnly = true
    }
    else if (arg === '--help') options.help = true
    else throw new Error(`알 수 없는 인자: ${arg}`)
  }
  if (explicitCheckOnly && options.output) {
    throw new Error('--check-only와 --output은 함께 사용할 수 없습니다.')
  }
  return options
}

function resolutionPaths({ resolutionDir, date, identity, other }) {
  const directory = path.resolve(resolutionDir ?? DEFAULT_RESOLUTION_DIR)
  return {
    date: path.resolve(date ?? path.join(directory, RESOLUTION_FILENAMES.date)),
    identity: path.resolve(identity ?? path.join(directory, RESOLUTION_FILENAMES.identity)),
    other: path.resolve(other ?? path.join(directory, RESOLUTION_FILENAMES.other)),
  }
}

async function readResolutionDocuments(paths) {
  const documents = {}
  for (const scope of SCOPES) {
    documents[scope] = {
      file: paths[scope],
      document: JSON.parse(await readFile(paths[scope], 'utf8')),
    }
  }
  return documents
}

function directDbApplication(item) {
  if (item.action !== 'REDUCE_PRECISION') return null
  const storage = DATE_FIELD_STORAGE[item.field]
  if (!storage) {
    return {
      column: null,
      storageType: null,
      directlyApplicable: false,
      reason: 'REDUCE_PRECISION 대상 필드의 DB 저장 타입을 이 도구가 확인할 수 없습니다.',
    }
  }
  const supportedValue = item.proposedValue === null || typeof item.proposedValue === 'string'
  return {
    column: storage.column,
    storageType: storage.type,
    directlyApplicable: supportedValue,
    reason: supportedValue
      ? `${storage.column}은 text | null이므로 이 proposedValue를 그대로 저장할 수 있습니다. precision은 별도 검토 메타데이터이며 DB 쓰기는 이 도구가 수행하지 않습니다.`
      : `${storage.column}은 text | null이지만 proposedValue가 문자열 또는 null이 아닙니다.`,
  }
}

function sourceGeneratedAt(documents) {
  const candidates = SCOPES.map((scope) => documents[scope].document.generatedAt)
  const maximum = Math.max(...candidates.map((value) => Date.parse(value)))
  if (!Number.isFinite(maximum)) throw new Error('resolution generatedAt에서 결정적 생성 시각을 계산할 수 없습니다.')
  return new Date(maximum).toISOString()
}

function actionCounts(patches) {
  const byAction = Object.fromEntries([...PATCH_ACTIONS].sort(compareText).map((action) => [action, 0]))
  for (const patch of patches) byAction[patch.action] += 1
  return byAction
}

export function buildProfilePatchDocument(documents, validationSummary) {
  const patches = []
  const seen = new Set()

  for (const scope of SCOPES) {
    const { document } = documents[scope]
    for (const item of document.resolutions) {
      const sourceResolutionKey = resolutionConflictKey(item)
      if (seen.has(sourceResolutionKey)) {
        throw new Error(`중복 sourceResolutionKey: ${sourceResolutionKey}`)
      }
      seen.add(sourceResolutionKey)
      const mappedAction = ACTION_MAP[item.action]
      if (!mappedAction) throw new Error(`지원하지 않는 resolution action: ${item.action}`)
      patches.push({
        celebId: item.celebId,
        slug: item.slug,
        field: item.field,
        currentValue: item.currentValue,
        proposedValue: item.proposedValue,
        action: mappedAction,
        precision: item.precision,
        directDbApplication: directDbApplication(item),
        evidenceUrls: [...item.evidenceUrls],
        rationale: item.rationale,
        confidence: item.confidence,
        sourceResolutionKey,
      })
    }
  }

  patches.sort((left, right) => compareText(left.slug, right.slug)
    || compareText(left.celebId, right.celebId)
    || compareText(left.field, right.field)
    || compareText(left.sourceResolutionKey, right.sourceResolutionKey))

  const profileActions = patches.filter((patch) => patch.field !== 'researchStatus').length
  const blockedActions = patches.length - profileActions
  const expected = validationSummary.expectedResolutions
  if (patches.length !== expected || seen.size !== expected) {
    throw new Error(`resolution 추적 수가 다릅니다: patches=${patches.length}, unique=${seen.size}, expected=${expected}`)
  }
  if (profileActions !== validationSummary.profileConflicts
      || blockedActions !== validationSummary.blockedDrafts) {
    throw new Error('프로필 조치 또는 blocked 조치 수가 원본 draft inventory와 다릅니다.')
  }

  const canonicalPayload = JSON.stringify(patches)
  const canonicalHash = createHash('sha256').update(canonicalPayload, 'utf8').digest('hex')
  return {
    schemaVersion: '1.0',
    kind: 'timeline-profile-patch-staging',
    generatedAt: sourceGeneratedAt(documents),
    offline: true,
    mutatesDatabase: false,
    sourceResolutions: Object.fromEntries(SCOPES.map((scope) => [scope, {
      file: path.basename(documents[scope].file),
      generatedAt: documents[scope].document.generatedAt,
      count: documents[scope].document.resolutions.length,
    }])),
    counts: {
      total: patches.length,
      uniqueSourceResolutionKeys: seen.size,
      profileActions,
      blockedActions,
      byAction: actionCounts(patches),
    },
    canonicalHashAlgorithm: 'sha256(JSON.stringify(patches), utf8)',
    canonicalHash,
    patches,
  }
}

export function validateProfilePatchDocument(document, { expectedTotal = null } = {}) {
  const issues = []
  if (!isObject(document)) return { valid: false, issues: ['문서는 객체여야 합니다.'] }
  if (document.schemaVersion !== '1.0') issues.push("schemaVersion은 '1.0'이어야 합니다.")
  if (!Array.isArray(document.patches)) issues.push('patches는 배열이어야 합니다.')
  const patches = Array.isArray(document.patches) ? document.patches : []
  const seen = new Set()
  for (const [index, patch] of patches.entries()) {
    const base = `patches[${index}]`
    for (const field of ['celebId', 'slug', 'field', 'action', 'evidenceUrls', 'rationale', 'confidence', 'sourceResolutionKey']) {
      if (!hasOwn(patch, field)) issues.push(`${base}.${field}가 없습니다.`)
    }
    if (!hasOwn(patch, 'currentValue')) issues.push(`${base}.currentValue가 없습니다.`)
    if (!hasOwn(patch, 'proposedValue')) issues.push(`${base}.proposedValue가 없습니다.`)
    if (!PATCH_ACTIONS.has(patch.action)) issues.push(`${base}.action이 유효하지 않습니다.`)
    if (seen.has(patch.sourceResolutionKey)) issues.push(`${base}.sourceResolutionKey가 중복입니다.`)
    seen.add(patch.sourceResolutionKey)
    if (patch.action === 'REDUCE_PRECISION') {
      if (!hasOwn(patch, 'precision')) issues.push(`${base}.precision이 없습니다.`)
      if (!isObject(patch.directDbApplication)
          || typeof patch.directDbApplication.directlyApplicable !== 'boolean') {
        issues.push(`${base}.directDbApplication에 직접 적용 가능 여부가 없습니다.`)
      }
    }
  }
  if (expectedTotal != null && patches.length !== expectedTotal) {
    issues.push(`patch 수 ${patches.length}가 기대값 ${expectedTotal}과 다릅니다.`)
  }
  if (document.counts?.total !== patches.length
      || document.counts?.uniqueSourceResolutionKeys !== seen.size) {
    issues.push('counts가 patches 실측과 다릅니다.')
  }
  const expectedHash = createHash('sha256').update(JSON.stringify(patches), 'utf8').digest('hex')
  if (document.canonicalHash !== expectedHash) issues.push('canonicalHash가 patches와 다릅니다.')
  return { valid: issues.length === 0, issues }
}

export async function writeJsonAtomically(file, document) {
  const target = path.resolve(file)
  await mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
  const payload = `${JSON.stringify(document, null, 2)}\n`
  try {
    await writeFile(temporary, payload, { encoding: 'utf8', flag: 'wx' })
    const staged = JSON.parse(await readFile(temporary, 'utf8'))
    if (!sameJson(staged, document)) throw new Error(`임시 profile patch 검증 실패: ${target}`)
    await rename(temporary, target)
    const persisted = JSON.parse(await readFile(target, 'utf8'))
    if (!sameJson(persisted, document)) throw new Error(`저장된 profile patch 검증 실패: ${target}`)
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function exportProfilePatches({
  draftRoot = DEFAULT_DRAFT_ROOT,
  resolutionDir = DEFAULT_RESOLUTION_DIR,
  date,
  identity,
  other,
  output,
  checkOnly = output == null,
  writer = writeJsonAtomically,
} = {}) {
  if (checkOnly && output) throw new Error('--check-only에서는 output을 쓸 수 없습니다.')
  const paths = resolutionPaths({ resolutionDir, date, identity, other })
  const validation = await validateConflictResolutions({
    draftRoot,
    resolutionDir,
    date: paths.date,
    identity: paths.identity,
    other: paths.other,
  })
  if (!validation.summary.ready) {
    throw new Error(`resolution 3종이 valid/coverage complete가 아닙니다: ${JSON.stringify(validation.summary)}`)
  }
  const documents = await readResolutionDocuments(paths)
  const document = buildProfilePatchDocument(documents, validation.summary)
  const result = validateProfilePatchDocument(document, {
    expectedTotal: validation.summary.expectedResolutions,
  })
  if (!result.valid) throw new Error(`profile patch 자체 검증 실패: ${result.issues.join(' | ')}`)
  if (!checkOnly) {
    if (!output) throw new Error('파일을 쓰려면 --output 경로가 필요합니다.')
    await writer(output, document)
  }
  return {
    mode: checkOnly ? 'check-only' : 'write',
    output: checkOnly ? null : path.resolve(output),
    wrote: !checkOnly,
    resolutionValidation: validation.summary,
    patchValidation: result,
    document,
  }
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(String(error?.message ?? error))
    console.error(usage())
    process.exitCode = 2
    return
  }
  if (options.help) {
    console.log(usage())
    return
  }
  try {
    const result = await exportProfilePatches(options)
    console.log(`${JSON.stringify({
      mode: result.mode,
      output: result.output,
      wrote: result.wrote,
      resolutionValidation: result.resolutionValidation,
      patchValidation: result.patchValidation,
      counts: result.document.counts,
      canonicalHash: result.document.canonicalHash,
    }, null, 2)}\n`)
  } catch (error) {
    console.error(String(error?.message ?? error))
    process.exitCode = 1
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
