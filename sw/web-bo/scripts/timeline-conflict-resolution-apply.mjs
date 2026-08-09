#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { access, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  resolutionConflictKey,
  validateResolutionDocument,
} from './lib/timeline-conflict-resolution-schema.mjs'
import {
  inventoryDraftConflicts,
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

function issue(code, message, details = {}) {
  return { severity: 'error', code, message, ...details }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
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
  return JSON.parse(await readFile(file, 'utf8'))
}

function usage() {
  return [
    'usage: node scripts/timeline-conflict-resolution-apply.mjs [options]',
    '  --drafts=<dir>       snapshot draft root 또는 people 디렉터리',
    '  --resolutions=<dir>  세 resolution JSON이 있는 디렉터리',
    '  --date=<file>        date-conflicts.json 경로 재정의',
    '  --identity=<file>    identity-and-blocked.json 경로 재정의',
    '  --other=<file>       other-conflicts.json 경로 재정의',
    '  --check-only         검증·적용 계획만 출력 (기본값)',
    '  --apply              원본 draft JSON을 파일별 원자 교체',
    '',
    '세 resolution 파일이 모두 유효하고 원본 conflict를 100% 덮을 때만 계획하거나 적용합니다.',
    'DB, Supabase, 네트워크에는 접근하지 않는 오프라인 로컬 JSON 도구입니다.',
  ].join('\n')
}

export function parseArgs(argv) {
  const options = { apply: false, help: false }
  let explicitCheckOnly = false
  for (const arg of argv) {
    if (arg.startsWith('--drafts=')) options.draftRoot = arg.slice('--drafts='.length)
    else if (arg.startsWith('--draft-root=')) options.draftRoot = arg.slice('--draft-root='.length)
    else if (arg.startsWith('--resolutions=')) options.resolutionDir = arg.slice('--resolutions='.length)
    else if (arg.startsWith('--resolution-dir=')) options.resolutionDir = arg.slice('--resolution-dir='.length)
    else if (arg.startsWith('--date=')) options.date = arg.slice('--date='.length)
    else if (arg.startsWith('--identity=')) options.identity = arg.slice('--identity='.length)
    else if (arg.startsWith('--other=')) options.other = arg.slice('--other='.length)
    else if (arg === '--apply') options.apply = true
    else if (arg === '--check-only') explicitCheckOnly = true
    else if (arg === '--help') options.help = true
    else throw new Error(`알 수 없는 인자: ${arg}`)
  }
  if (options.apply && explicitCheckOnly) {
    throw new Error('--apply와 --check-only는 함께 사용할 수 없습니다.')
  }
  return options
}

function appliedResolution(item, resolvedAt) {
  return {
    status: item.status,
    action: item.action,
    proposedValue: item.proposedValue,
    precision: item.precision,
    rationale: item.rationale,
    rationaleEn: item.rationaleEn,
    evidenceUrls: [...item.evidenceUrls],
    confidence: item.confidence,
    resolvedAt,
  }
}

function resolutionEntries(documents) {
  const byKey = new Map()
  const issues = []
  for (const scope of SCOPES) {
    const { document, file } = documents[scope]
    const snapshotValidation = validateResolutionDocument(document, { expectedScope: scope })
    for (const snapshotIssue of snapshotValidation.issues) {
      if (snapshotIssue.severity === 'error') {
        issues.push({ ...snapshotIssue, file, scope })
      }
    }
    const items = Array.isArray(document.resolutions) ? document.resolutions : []
    for (const [index, item] of items.entries()) {
      const key = resolutionConflictKey(item)
      const resolvedAt = document.generatedAt
      if (Number.isNaN(Date.parse(resolvedAt))) {
        issues.push(issue('APPLICATION_RESOLVED_AT', 'resolution 문서의 generatedAt을 resolvedAt으로 사용할 수 없습니다.', {
          file,
          scope,
          index,
        }))
        continue
      }
      if (byKey.has(key)) {
        issues.push(issue('APPLICATION_RESOLUTION_DUPLICATE', '적용 단계에서 중복 conflict key를 발견했습니다.', {
          file,
          scope,
          index,
        }))
        continue
      }
      byKey.set(key, {
        item,
        scope,
        file,
        resolvedAt,
        value: appliedResolution(item, resolvedAt),
      })
    }
  }
  return { byKey, issues }
}

function applyProfileConflictResolutions(draft, entriesByKey) {
  const applied = []
  const conflicts = Array.isArray(draft.profileConflicts) ? draft.profileConflicts : []
  for (const [index, conflict] of conflicts.entries()) {
    if (!isObject(conflict) || typeof conflict.field !== 'string'
        || !Object.prototype.hasOwnProperty.call(conflict, 'manifestValue')) continue
    const key = resolutionConflictKey({
      celebId: draft.celebId,
      slug: draft.slug,
      field: conflict.field,
      currentValue: conflict.manifestValue,
    })
    const entry = entriesByKey.get(key)
    if (!entry) continue
    conflict.resolution = cloneJson(entry.value)
    applied.push({ key, index, action: entry.item.action })
  }
  return applied
}

function applyBlockedResolution(draft, entriesByKey, file) {
  if (draft.researchStatus !== 'blocked') return { applied: [], issues: [] }
  const key = resolutionConflictKey({
    celebId: draft.celebId,
    slug: draft.slug,
    field: 'researchStatus',
    currentValue: 'blocked',
  })
  const entry = entriesByKey.get(key)
  if (!entry) return { applied: [], issues: [] }

  const blockingIssues = Array.isArray(draft.blockingIssues) ? draft.blockingIssues : []
  const triggerCode = typeof entry.item.trigger?.code === 'string' && entry.item.trigger.code.trim()
    ? entry.item.trigger.code.trim()
    : null
  if (!triggerCode) {
    return {
      applied: [],
      issues: [issue('APPLICATION_BLOCKING_TRIGGER_CODE', 'blocked resolution은 단일 blockingIssues 항목과 대조할 trigger.code가 필요합니다.', {
        file,
        celebId: draft.celebId,
        slug: draft.slug,
      })],
    }
  }
  const indexes = blockingIssues
    .map((blockingIssue, index) => ({ blockingIssue, index }))
    .filter(({ blockingIssue }) => isObject(blockingIssue) && blockingIssue.code === triggerCode)
    .map(({ index }) => index)

  if (indexes.length === 0) {
    return {
      applied: [],
      issues: [issue('APPLICATION_BLOCKING_ISSUE_MISSING', 'blocked resolution과 일치하는 blockingIssues 항목이 없습니다.', {
        file,
        celebId: draft.celebId,
        slug: draft.slug,
        triggerCode,
      })],
    }
  }

  for (const index of indexes) blockingIssues[index].resolution = cloneJson(entry.value)
  draft.researchStatus = 'blocked'
  draft.applicationStatus = entry.item.action === 'RESUME_TIMELINE'
    ? 'timeline_required'
    : 'quarantined'

  return {
    applied: indexes.map((index) => ({ key, index, action: entry.item.action })),
    issues: [],
  }
}

function groupExpectedByFile(expected) {
  const grouped = new Map()
  for (const record of expected) {
    const records = grouped.get(record.sourceDraft) ?? []
    records.push(record)
    grouped.set(record.sourceDraft, records)
  }
  return grouped
}

function verifyFileApplications({ file, draft, expectedRecords, profileApplications, blockedApplications }) {
  const issues = []
  const identity = expectedRecords[0]
  if (identity && (draft.celebId !== identity.celebId || draft.slug !== identity.slug)) {
    issues.push(issue('APPLICATION_DRAFT_IDENTITY_CHANGED', '검증한 draft와 실제 적용 직전 draft의 신원이 다릅니다.', {
      file,
      expectedCelebId: identity.celebId,
      actualCelebId: draft.celebId ?? null,
      expectedSlug: identity.slug,
      actualSlug: draft.slug ?? null,
    }))
  }

  const expectedCounts = new Map()
  for (const record of expectedRecords) {
    expectedCounts.set(record.key, (expectedCounts.get(record.key) ?? 0) + 1)
  }
  const actualCounts = new Map()
  for (const application of [...profileApplications, ...blockedApplications]) {
    actualCounts.set(application.key, (actualCounts.get(application.key) ?? 0) + 1)
  }
  const keys = new Set([...expectedCounts.keys(), ...actualCounts.keys()])
  for (const key of keys) {
    const expectedCount = expectedCounts.get(key) ?? 0
    const actualCount = actualCounts.get(key) ?? 0
    if (expectedCount !== actualCount) {
      issues.push(issue('APPLICATION_FILE_COVERAGE_MISMATCH', '실제 draft에 삽입할 resolution 수가 검증된 1:1 계획과 다릅니다.', {
        file,
        key,
        expectedCount,
        actualCount,
      }))
    }
  }
  return issues
}

async function loadResolutionDocuments(resolutionFiles) {
  const documents = {}
  for (const scope of SCOPES) {
    documents[scope] = {
      file: resolutionFiles[scope],
      document: await readJson(resolutionFiles[scope]),
    }
  }
  return documents
}

export async function writeDraftAtomically(file, draft) {
  const payload = `${JSON.stringify(draft, null, 2)}\n`
  const temporaryPath = `${file}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, payload, { encoding: 'utf8', flag: 'wx' })
    const staged = JSON.parse(await readFile(temporaryPath, 'utf8'))
    if (!sameJson(staged, draft)) {
      throw new Error(`staged draft verification failed: ${file}`)
    }
    await rename(temporaryPath, file)
    const persisted = JSON.parse(await readFile(file, 'utf8'))
    if (!sameJson(persisted, draft)) {
      throw new Error(`persisted draft verification failed: ${file}`)
    }
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function rollbackPlans(plans, writer) {
  const issues = []
  const seen = new Set()
  for (const plan of plans) {
    if (seen.has(plan.file)) continue
    seen.add(plan.file)
    try {
      await writer(plan.file, plan.original)
      const restored = await readJson(plan.file)
      if (!sameJson(restored, plan.original)) {
        throw new Error('restored draft verification failed')
      }
    } catch (error) {
      issues.push(issue('APPLICATION_ROLLBACK_FAILED', '쓰기 실패 뒤 원본 draft 복구에 실패했습니다.', {
        file: plan.file,
        error: String(error?.message ?? error),
      }))
    }
  }
  return issues
}

function validationSummary(report) {
  return {
    state: report.summary.state,
    ready: report.summary.ready,
    errors: report.summary.errors,
    pendingFiles: report.summary.pendingFiles,
    unresolved: report.summary.unresolved,
    expectedResolutions: report.summary.expectedResolutions,
    matchedResolutions: report.summary.matchedResolutions,
  }
}

function blockedApplicationReport({ apply, draftRoot, validation }) {
  return {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'check-only',
    offline: true,
    draftRoot: path.resolve(draftRoot),
    resolutionFiles: validation.resolutionFiles,
    validation: validationSummary(validation),
    summary: {
      ready: false,
      applied: false,
      plannedDrafts: 0,
      changedDrafts: 0,
      writtenDrafts: 0,
      profileConflictsResolved: 0,
      blockingIssuesResolved: 0,
      applicationErrors: validation.summary.errors,
    },
    files: [],
    issues: validation.issues,
  }
}

export async function applyConflictResolutions({
  draftRoot = DEFAULT_DRAFT_ROOT,
  resolutionDir = DEFAULT_RESOLUTION_DIR,
  date,
  identity,
  other,
  apply = false,
  validator = validateConflictResolutions,
  writer = writeDraftAtomically,
} = {}) {
  const resolvedDraftRoot = path.resolve(draftRoot)
  const validation = await validator({
    draftRoot: resolvedDraftRoot,
    resolutionDir,
    date,
    identity,
    other,
  })
  if (!validation.summary.ready) {
    return blockedApplicationReport({ apply, draftRoot: resolvedDraftRoot, validation })
  }

  const inventory = await inventoryDraftConflicts(resolvedDraftRoot)
  const documents = await loadResolutionDocuments(validation.resolutionFiles)
  const entries = resolutionEntries(documents)
  const applicationIssues = [...entries.issues]
  const currentExpectedKeys = new Set(inventory.expected.map((record) => record.key))
  for (const record of inventory.expected) {
    if (!entries.byKey.has(record.key)) {
      applicationIssues.push(issue('APPLICATION_COVERAGE_MISSING', '검증 직후 원본 draft가 바뀌어 현재 conflict와 일치하는 resolution이 없습니다.', {
        file: record.sourceDraft,
        celebId: record.celebId,
        slug: record.slug,
        field: record.field,
      }))
    }
  }
  for (const [key, entry] of entries.byKey) {
    if (!currentExpectedKeys.has(key)) {
      applicationIssues.push(issue('APPLICATION_COVERAGE_EXTRA', '검증 직후 원본 draft가 바뀌어 현재 conflict와 일치하지 않는 resolution이 있습니다.', {
        file: entry.file,
        scope: entry.scope,
        key,
      }))
    }
  }
  const expectedByFile = groupExpectedByFile(inventory.expected)
  const plans = []
  let profileConflictsResolved = 0
  let blockingIssuesResolved = 0

  for (const file of [...expectedByFile.keys()].sort((left, right) => left.localeCompare(right, 'en'))) {
    const expectedRecords = expectedByFile.get(file) ?? []
    const original = await readJson(file)
    const next = cloneJson(original)
    const profileApplications = applyProfileConflictResolutions(next, entries.byKey)
    const blockedApplication = applyBlockedResolution(next, entries.byKey, file)
    applicationIssues.push(...blockedApplication.issues)
    applicationIssues.push(...verifyFileApplications({
      file,
      draft: original,
      expectedRecords,
      profileApplications,
      blockedApplications: blockedApplication.applied,
    }))
    profileConflictsResolved += profileApplications.length
    blockingIssuesResolved += blockedApplication.applied.length
    plans.push({
      file,
      celebId: next.celebId,
      slug: next.slug,
      original,
      next,
      changed: !sameJson(original, next),
      profileConflictsResolved: profileApplications.length,
      blockingIssuesResolved: blockedApplication.applied.length,
      applicationStatus: next.applicationStatus ?? null,
    })
  }

  if (applicationIssues.length > 0) {
    return {
      reportVersion: 1,
      generatedAt: new Date().toISOString(),
      mode: apply ? 'apply' : 'check-only',
      offline: true,
      draftRoot: resolvedDraftRoot,
      resolutionFiles: validation.resolutionFiles,
      validation: validationSummary(validation),
      summary: {
        ready: false,
        applied: false,
        plannedDrafts: plans.length,
        changedDrafts: plans.filter((plan) => plan.changed).length,
        writtenDrafts: 0,
        profileConflictsResolved,
        blockingIssuesResolved,
        applicationErrors: applicationIssues.length,
      },
      files: plans.map(({ next: _next, original: _original, ...plan }) => ({ ...plan, written: false })),
      issues: applicationIssues,
    }
  }

  const changedPlans = plans.filter((plan) => plan.changed)
  if (apply) {
    const completed = []
    for (const plan of changedPlans) {
      let writeAttempted = false
      try {
        const current = await readJson(plan.file)
        if (!sameJson(current, plan.original)) {
          const changedError = new Error('draft changed after application planning')
          changedError.code = 'APPLICATION_DRAFT_CHANGED_BEFORE_WRITE'
          throw changedError
        }
        writeAttempted = true
        await writer(plan.file, plan.next)
        completed.push(plan)
      } catch (error) {
        const rollbackTargets = writeAttempted ? [plan, ...completed.reverse()] : [...completed.reverse()]
        const rollbackIssues = await rollbackPlans(rollbackTargets, writer)
        const concurrentChange = error?.code === 'APPLICATION_DRAFT_CHANGED_BEFORE_WRITE'
        const failureCode = concurrentChange
          ? 'APPLICATION_DRAFT_CHANGED_BEFORE_WRITE'
          : rollbackIssues.length === 0 ? 'APPLICATION_WRITE_FAILED_ROLLED_BACK' : 'APPLICATION_WRITE_FAILED'
        const failureMessage = concurrentChange
          ? '계획 뒤 draft가 바뀌어 적용을 중단하고 앞서 쓴 파일을 원본으로 복구했습니다.'
          : rollbackIssues.length === 0
            ? 'draft 쓰기가 실패해 이번 실행에서 쓴 파일을 모두 원본으로 복구했습니다.'
            : 'draft 쓰기가 실패했고 일부 원본 복구도 실패했습니다.'
        const writeIssue = issue(
          failureCode,
          failureMessage,
          { file: plan.file, error: String(error?.message ?? error) },
        )
        const issues = [writeIssue, ...rollbackIssues]
        return {
          reportVersion: 1,
          generatedAt: new Date().toISOString(),
          mode: 'apply',
          offline: true,
          draftRoot: resolvedDraftRoot,
          resolutionFiles: validation.resolutionFiles,
          validation: validationSummary(validation),
          summary: {
            ready: false,
            applied: false,
            plannedDrafts: plans.length,
            changedDrafts: changedPlans.length,
            writtenDrafts: 0,
            profileConflictsResolved,
            blockingIssuesResolved,
            applicationErrors: issues.length,
            rollbackComplete: rollbackIssues.length === 0,
          },
          files: plans.map(({ next: _next, original: _original, ...candidate }) => ({
            ...candidate,
            written: false,
          })),
          issues,
        }
      }
    }
  }

  return {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'check-only',
    offline: true,
    draftRoot: resolvedDraftRoot,
    resolutionFiles: validation.resolutionFiles,
    validation: validationSummary(validation),
    summary: {
      ready: true,
      applied: apply,
      plannedDrafts: plans.length,
      changedDrafts: changedPlans.length,
      writtenDrafts: apply ? changedPlans.length : 0,
      profileConflictsResolved,
      blockingIssuesResolved,
      applicationErrors: 0,
    },
    files: plans.map(({ next: _next, original: _original, ...plan }) => ({
      ...plan,
      written: apply && plan.changed,
    })),
    issues: [],
  }
}

export function exitCodeForApplicationReport(report) {
  return report?.summary?.ready ? 0 : 1
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
  try {
    const report = await applyConflictResolutions({ ...args, draftRoot })
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = exitCodeForApplicationReport(report)
  } catch (error) {
    console.error(JSON.stringify({
      reportVersion: 1,
      mode: args.apply ? 'apply' : 'check-only',
      offline: true,
      error: String(error?.message ?? error),
    }, null, 2))
    process.exitCode = 1
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
