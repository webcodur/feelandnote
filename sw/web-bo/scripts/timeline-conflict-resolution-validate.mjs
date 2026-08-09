#!/usr/bin/env node

import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  resolutionConflictKey,
  resolutionScopeFor,
  validateResolutionDocument,
} from './lib/timeline-conflict-resolution-schema.mjs'

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

export const RESOLUTION_FILENAMES = {
  date: 'date-conflicts.json',
  identity: 'identity-and-blocked.json',
  other: 'other-conflicts.json',
}

function issue(code, pathValue, message, severity = 'error', details = {}) {
  return { severity, code, path: pathValue, message, ...details }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field)
}

function annotate(issues, file) {
  return issues.map((item) => ({ ...item, file }))
}

export function parseArgs(argv) {
  const options = {}
  for (const arg of argv) {
    if (arg.startsWith('--drafts=')) options.draftRoot = arg.slice('--drafts='.length)
    else if (arg.startsWith('--draft-root=')) options.draftRoot = arg.slice('--draft-root='.length)
    else if (arg.startsWith('--resolutions=')) options.resolutionDir = arg.slice('--resolutions='.length)
    else if (arg.startsWith('--resolution-dir=')) options.resolutionDir = arg.slice('--resolution-dir='.length)
    else if (arg.startsWith('--date=')) options.date = arg.slice('--date='.length)
    else if (arg.startsWith('--identity=')) options.identity = arg.slice('--identity='.length)
    else if (arg.startsWith('--other=')) options.other = arg.slice('--other='.length)
    else if (arg.startsWith('--report=')) options.report = arg.slice('--report='.length)
    else if (arg === '--help') options.help = true
    else throw new Error(`알 수 없는 인자: ${arg}`)
  }
  return options
}

function usage() {
  return [
    'usage: node scripts/timeline-conflict-resolution-validate.mjs [options]',
    '  --drafts=<dir>       snapshot draft root 또는 people 디렉터리',
    '  --resolutions=<dir>  세 resolution JSON이 있는 디렉터리',
    '  --date=<file>        date-conflicts.json 경로 재정의',
    '  --identity=<file>    identity-and-blocked.json 경로 재정의',
    '  --other=<file>       other-conflicts.json 경로 재정의',
    '  --report=<file>      동일 JSON report를 파일에도 저장',
    '',
    '파일 시스템의 JSON만 읽는 오프라인 검증기이며 DB와 네트워크에 접근하지 않습니다.',
    'resolution 파일이 아직 없으면 오류 대신 pending으로 보고하고 exit code 2를 반환합니다.',
  ].join('\n')
}

async function pathExists(target) {
  try {
    await access(target)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function readJson(file) {
  try {
    return { state: 'ok', value: JSON.parse(await readFile(file, 'utf8')) }
  } catch (error) {
    if (error?.code === 'ENOENT') return { state: 'missing', value: null }
    return {
      state: 'error',
      value: null,
      issue: issue('JSON_PARSE', '$', String(error?.message ?? error), 'error', { file }),
    }
  }
}

async function listJsonFiles(root) {
  const files = []
  async function visit(directory) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (error?.code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(target)
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(path.resolve(target))
    }
  }
  await visit(root)
  return files.sort((left, right) => left.localeCompare(right, 'en'))
}

function buildExpectedConflict(draft, file, field, currentValue, kind) {
  const conflict = {
    celebId: draft.celebId ?? null,
    slug: draft.slug ?? null,
    field,
    currentValue,
    kind,
    scope: resolutionScopeFor(field),
    sourceDraft: file,
  }
  return { ...conflict, key: resolutionConflictKey(conflict) }
}

export async function inventoryDraftConflicts(draftRoot) {
  const peopleRoot = path.basename(path.resolve(draftRoot)).toLowerCase() === 'people'
    ? path.resolve(draftRoot)
    : path.resolve(draftRoot, 'people')
  const files = await listJsonFiles(peopleRoot)
  const issues = []
  const expected = []
  const seen = new Map()

  for (const file of files) {
    const parsed = await readJson(file)
    if (parsed.state !== 'ok') {
      issues.push(parsed.issue ?? issue('DRAFT_JSON_MISSING', '$', 'draft JSON을 읽을 수 없습니다.', 'error', { file }))
      continue
    }
    const draft = parsed.value
    if (!isObject(draft)) {
      issues.push(issue('DRAFT_OBJECT', '$', 'draft JSON은 객체여야 합니다.', 'error', { file }))
      continue
    }
    if (draft.profileConflicts != null && !Array.isArray(draft.profileConflicts)) {
      issues.push(issue('DRAFT_PROFILE_CONFLICTS', 'profileConflicts', 'profileConflicts는 배열이어야 합니다.', 'error', { file }))
    }
    for (const [index, conflict] of (Array.isArray(draft.profileConflicts) ? draft.profileConflicts : []).entries()) {
      if (!isObject(conflict) || typeof conflict.field !== 'string' || !hasOwn(conflict, 'manifestValue')) {
        issues.push(issue('DRAFT_PROFILE_CONFLICT', `profileConflicts[${index}]`, 'field와 manifestValue가 있는 객체여야 합니다.', 'error', { file }))
        continue
      }
      const record = buildExpectedConflict(draft, file, conflict.field, conflict.manifestValue, 'profileConflict')
      if (seen.has(record.key)) {
        issues.push(issue('DRAFT_CONFLICT_DUPLICATE', `profileConflicts[${index}]`, `중복 conflict key입니다. 최초 파일: ${seen.get(record.key)}`, 'error', {
          file,
          celebId: record.celebId,
          slug: record.slug,
          field: record.field,
        }))
      } else {
        seen.set(record.key, file)
        expected.push(record)
      }
    }
    if (draft.researchStatus === 'blocked') {
      const record = buildExpectedConflict(draft, file, 'researchStatus', 'blocked', 'blocked')
      if (seen.has(record.key)) {
        issues.push(issue('DRAFT_CONFLICT_DUPLICATE', 'researchStatus', `중복 blocked conflict key입니다. 최초 파일: ${seen.get(record.key)}`, 'error', { file }))
      } else {
        seen.set(record.key, file)
        expected.push(record)
      }
    }
  }

  const counts = { date: 0, identity: 0, other: 0, profileConflicts: 0, blocked: 0 }
  for (const record of expected) {
    counts[record.scope] += 1
    if (record.kind === 'blocked') counts.blocked += 1
    else counts.profileConflicts += 1
  }
  return { peopleRoot, files, expected, issues, counts }
}

function resolutionPaths({ resolutionDir, date, identity, other }) {
  const directory = path.resolve(resolutionDir ?? DEFAULT_RESOLUTION_DIR)
  return {
    date: path.resolve(date ?? path.join(directory, RESOLUTION_FILENAMES.date)),
    identity: path.resolve(identity ?? path.join(directory, RESOLUTION_FILENAMES.identity)),
    other: path.resolve(other ?? path.join(directory, RESOLUTION_FILENAMES.other)),
  }
}

export async function validateConflictResolutions({
  draftRoot = DEFAULT_DRAFT_ROOT,
  resolutionDir = DEFAULT_RESOLUTION_DIR,
  date,
  identity,
  other,
} = {}) {
  const startedAt = new Date().toISOString()
  const inventory = await inventoryDraftConflicts(path.resolve(draftRoot))
  const issues = [...inventory.issues]
  const paths = resolutionPaths({ resolutionDir, date, identity, other })
  const expectedByKey = new Map(inventory.expected.map((record) => [record.key, record]))
  const matchedKeys = new Set()
  const resolutionKeys = new Map()
  const pendingFiles = []
  const presentFiles = []

  for (const scope of ['date', 'identity', 'other']) {
    const file = paths[scope]
    const parsed = await readJson(file)
    if (parsed.state === 'missing') {
      const expectedCount = inventory.expected.filter((record) => record.scope === scope).length
      pendingFiles.push({ scope, file, expectedCount })
      issues.push(issue('RESOLUTION_FILE_PENDING', '$', `resolution 파일이 아직 없습니다. ${expectedCount}건 판정 대기 중입니다.`, 'pending', { file, scope }))
      continue
    }
    presentFiles.push({ scope, file })
    if (parsed.state === 'error') {
      issues.push(parsed.issue)
      continue
    }

    const result = validateResolutionDocument(parsed.value, { expectedScope: scope })
    issues.push(...annotate(result.issues, file))
    for (const resolution of result.resolutions) {
      if (!resolution.key) continue
      const item = resolution.item
      if (resolutionKeys.has(resolution.key)) {
        issues.push(issue('RESOLUTION_DUPLICATE', `resolutions[${resolution.index}]`, `중복 conflict key입니다. 최초 resolution: ${resolutionKeys.get(resolution.key)}`, 'error', {
          file,
          celebId: item.celebId,
          slug: item.slug,
          field: item.field,
        }))
        continue
      }
      resolutionKeys.set(resolution.key, `${file}#resolutions[${resolution.index}]`)
      const expected = expectedByKey.get(resolution.key)
      if (!expected) {
        issues.push(issue('RESOLUTION_EXTRA', `resolutions[${resolution.index}]`, '원본 draft conflict 또는 blocked draft와 일치하지 않는 resolution입니다.', 'error', {
          file,
          celebId: item.celebId,
          slug: item.slug,
          field: item.field,
        }))
        continue
      }
      if (expected.scope !== scope) {
        issues.push(issue('RESOLUTION_SCOPE_FILE', `resolutions[${resolution.index}]`, `이 conflict는 ${expected.scope} 파일에서 판정해야 합니다.`, 'error', {
          file,
          celebId: item.celebId,
          slug: item.slug,
          field: item.field,
        }))
        continue
      }
      matchedKeys.add(resolution.key)
    }

    for (const expected of inventory.expected.filter((record) => record.scope === scope)) {
      if (!matchedKeys.has(expected.key)) {
        issues.push(issue('RESOLUTION_MISSING', '$', '원본 draft conflict에 대응하는 resolution이 없습니다.', 'error', {
          file,
          sourceDraft: expected.sourceDraft,
          celebId: expected.celebId,
          slug: expected.slug,
          field: expected.field,
          currentValue: expected.currentValue,
        }))
      }
    }
  }

  const errors = issues.filter((item) => item.severity === 'error')
  const warnings = issues.filter((item) => item.severity === 'warning')
  const pending = issues.filter((item) => item.severity === 'pending')
  const unresolved = Math.max(0, inventory.expected.length - matchedKeys.size)
  return {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    startedAt,
    offline: true,
    draftRoot: path.resolve(draftRoot),
    peopleRoot: inventory.peopleRoot,
    resolutionFiles: paths,
    summary: {
      draftFiles: inventory.files.length,
      profileConflicts: inventory.counts.profileConflicts,
      blockedDrafts: inventory.counts.blocked,
      expectedResolutions: inventory.expected.length,
      expectedByScope: {
        date: inventory.counts.date,
        identity: inventory.counts.identity,
        other: inventory.counts.other,
      },
      matchedResolutions: matchedKeys.size,
      unresolved,
      presentFiles: presentFiles.length,
      pendingFiles: pendingFiles.length,
      errors: errors.length,
      warnings: warnings.length,
      pending: pending.length,
      valid: errors.length === 0,
      ready: errors.length === 0 && pendingFiles.length === 0 && unresolved === 0,
      state: errors.length > 0 ? 'invalid' : pendingFiles.length > 0 ? 'pending' : 'ready',
    },
    pendingFiles,
    issues,
  }
}

export function exitCodeForReport(report) {
  if ((report?.summary?.errors ?? 0) > 0) return 1
  if (!report?.summary?.ready) return 2
  return 0
}

async function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(String(error?.message ?? error))
    console.error(usage())
    process.exitCode = 2
    return
  }
  if (args.help) {
    console.log(usage())
    return
  }
  const draftRoot = path.resolve(args.draftRoot ?? DEFAULT_DRAFT_ROOT)
  if (!await pathExists(draftRoot)) {
    console.error(`draft root가 없습니다: ${draftRoot}`)
    process.exitCode = 1
    return
  }
  const report = await validateConflictResolutions({ ...args, draftRoot })
  const output = `${JSON.stringify(report, null, 2)}\n`
  console.log(output.trimEnd())
  if (args.report) await writeFile(path.resolve(args.report), output, 'utf8')
  process.exitCode = exitCodeForReport(report)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
