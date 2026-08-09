#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { validateDraft, validateManifest } from './lib/timeline-draft-schema.mjs'

export function parseArgs(argv) {
  const positional = []
  const options = {}
  for (const arg of argv) {
    if (arg.startsWith('--manifest=')) options.manifest = arg.slice('--manifest='.length)
    else if (arg.startsWith('--drafts=')) options.draftRoot = arg.slice('--drafts='.length)
    else if (arg.startsWith('--draft-root=')) options.draftRoot = arg.slice('--draft-root='.length)
    else if (arg.startsWith('--report=')) options.report = arg.slice('--report='.length)
    else if (arg === '--allow-blocked') options.allowBlocked = true
    else if (arg === '--help') options.help = true
    else if (arg.startsWith('--')) throw new Error(`알 수 없는 옵션: ${arg}`)
    else positional.push(arg)
  }
  return { positionalManifest: positional[0], ...options, manifest: options.manifest ?? positional[0] }
}

function usage() {
  return [
    'usage: node scripts/timeline-draft-validate.mjs --manifest=<file> --drafts=<dir> [options]',
    '  --manifest=<file>  모집단 manifest JSON (첫 번째 위치 인자도 호환)',
    '  --drafts=<dir>     snapshot draft root (--draft-root 별칭도 호환)',
    '  --report=<file>    JSON report를 파일에도 저장',
    '  --allow-blocked    계약이 유효한 blocked 초안이 있어도 blocked만으로 실패하지 않음',
    '',
    '이 명령은 파일 시스템의 JSON만 읽으며 DB와 네트워크에 접근하지 않습니다.',
  ].join('\n')
}

async function readJson(file) {
  try {
    return { value: JSON.parse(await readFile(file, 'utf8')), issues: [] }
  } catch (error) {
    return {
      value: null,
      issues: [{ severity: 'error', code: 'JSON_PARSE', path: '$', message: String(error?.message ?? error), file }],
    }
  }
}

async function listJsonFiles(root) {
  const found = []
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
      else if (entry.isFile() && entry.name.endsWith('.json')) found.push(path.resolve(target))
    }
  }
  await visit(root)
  return found.sort((a, b) => a.localeCompare(b, 'en'))
}

function annotate(issues, file, celebId = null, slug = null) {
  return issues.map((item) => ({ ...item, file, celebId, slug }))
}

export function shouldExitNonZero(report, { allowBlocked = false } = {}) {
  return !report?.summary?.valid || (!allowBlocked && report?.summary?.blocked > 0)
}

export async function validateDraftDirectory({ manifestPath, draftRoot }) {
  const startedAt = new Date().toISOString()
  const manifestRead = await readJson(manifestPath)
  const allIssues = [...manifestRead.issues]
  if (!manifestRead.value) return buildReport(startedAt, manifestPath, draftRoot, null, [], allIssues)

  const manifestResult = validateManifest(manifestRead.value)
  allIssues.push(...annotate(manifestResult.issues, manifestPath))
  const expectedByPath = new Map()
  for (const person of manifestResult.people) {
    if (!person || typeof person.slug !== 'string' || !['life', 'fiction'].includes(person.timelineMode)) continue
    const file = path.resolve(draftRoot, 'people', person.timelineMode, `${person.slug}.json`)
    if (expectedByPath.has(file)) {
      allIssues.push(...annotate([{
        severity: 'error', code: 'MANIFEST_DUPLICATE_PATH', path: 'people', message: `여러 manifest 인물이 같은 파일을 요구합니다: ${file}`,
      }], manifestPath, person.celebId, person.slug))
    }
    expectedByPath.set(file, person)
  }

  const actualFiles = await listJsonFiles(path.resolve(draftRoot, 'people'))
  const actualSet = new Set(actualFiles)
  const draftRecords = []
  const seenDraftIds = new Map()
  const seenDraftSlugs = new Map()

  for (const [file, person] of expectedByPath) {
    if (!actualSet.has(file)) {
      allIssues.push(...annotate([{
        severity: 'error', code: 'DRAFT_MISSING', path: '$', message: 'manifest 인물의 초안 파일이 없습니다.',
      }], file, person.celebId, person.slug))
    }
  }
  for (const file of actualFiles) {
    const expected = expectedByPath.get(file) ?? null
    if (!expected) {
      allIssues.push(...annotate([{
        severity: 'error', code: 'DRAFT_EXTRA', path: '$', message: 'manifest에 없는 초안 파일입니다.',
      }], file))
    }
    const parsed = await readJson(file)
    allIssues.push(...annotate(parsed.issues, file, expected?.celebId, expected?.slug))
    if (!parsed.value) continue
    const result = validateDraft(parsed.value, expected)
    allIssues.push(...annotate(result.issues, file, parsed.value.celebId ?? expected?.celebId, parsed.value.slug ?? expected?.slug))
    draftRecords.push({
      file,
      celebId: parsed.value.celebId ?? null,
      slug: parsed.value.slug ?? null,
      researchStatus: parsed.value.researchStatus ?? null,
      expected: expected != null,
    })
    if (seenDraftIds.has(parsed.value.celebId)) {
      allIssues.push(...annotate([{
        severity: 'error', code: 'DRAFT_DUPLICATE_ID', path: 'celebId', message: `다른 초안과 celebId가 중복됩니다: ${seenDraftIds.get(parsed.value.celebId)}`,
      }], file, parsed.value.celebId, parsed.value.slug))
    } else if (parsed.value.celebId != null) seenDraftIds.set(parsed.value.celebId, file)
    if (seenDraftSlugs.has(parsed.value.slug)) {
      allIssues.push(...annotate([{
        severity: 'error', code: 'DRAFT_DUPLICATE_SLUG', path: 'slug', message: `다른 초안과 slug가 중복됩니다: ${seenDraftSlugs.get(parsed.value.slug)}`,
      }], file, parsed.value.celebId, parsed.value.slug))
    } else if (parsed.value.slug != null) seenDraftSlugs.set(parsed.value.slug, file)
  }
  return buildReport(startedAt, manifestPath, draftRoot, manifestRead.value, draftRecords, allIssues)
}

function buildReport(startedAt, manifestPath, draftRoot, manifest, drafts, issues) {
  const errors = issues.filter((item) => item.severity === 'error')
  const warnings = issues.filter((item) => item.severity === 'warning')
  const missing = issues.filter((item) => item.code === 'DRAFT_MISSING').length
  const extra = issues.filter((item) => item.code === 'DRAFT_EXTRA').length
  const expectedPeople = Array.isArray(manifest?.people) ? manifest.people.length : 0
  const coveredPeople = Math.max(0, expectedPeople - missing)
  const expectedDrafts = drafts.filter((draft) => draft.expected)
  const complete = expectedDrafts.filter((draft) => draft.researchStatus === 'complete').length
  const blocked = expectedDrafts.filter((draft) => draft.researchStatus === 'blocked').length
  return {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    startedAt,
    offline: true,
    manifestPath: path.resolve(manifestPath),
    draftRoot: path.resolve(draftRoot),
    snapshotId: manifest?.snapshotId ?? null,
    summary: {
      expectedPeople,
      coveredPeople,
      draftFiles: drafts.length,
      complete,
      blocked,
      otherStatus: Math.max(0, coveredPeople - complete - blocked),
      missing,
      extra,
      errors: errors.length,
      warnings: warnings.length,
      valid: errors.length === 0,
      ready: errors.length === 0 && blocked === 0,
    },
    issues,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.manifest) {
    console.log(usage())
    process.exitCode = args.help ? 0 : 2
    return
  }
  const manifestPath = path.resolve(args.manifest)
  const preview = await readJson(manifestPath)
  if (!preview.value && preview.issues.length) {
    const report = buildReport(new Date().toISOString(), manifestPath, args.draftRoot ?? '.', null, [], preview.issues)
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = 1
    return
  }
  const draftRoot = path.resolve(args.draftRoot ?? await inferDraftRoot(manifestPath, preview.value.snapshotId))
  const report = await validateDraftDirectory({ manifestPath, draftRoot })
  const output = `${JSON.stringify(report, null, 2)}\n`
  console.log(output.trimEnd())
  if (args.report) await writeFile(path.resolve(args.report), output, 'utf8')
  if (shouldExitNonZero(report, { allowBlocked: args.allowBlocked })) process.exitCode = 1
}

async function inferDraftRoot(manifestPath, snapshotId) {
  const draftsDirectory = path.resolve(path.dirname(manifestPath), '..', 'drafts')
  const exact = path.join(draftsDirectory, snapshotId ?? '')
  if (snapshotId) {
    try {
      const entries = await readdir(exact)
      if (entries) return exact
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  const candidates = (await readdir(draftsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(draftsDirectory, entry.name))
  if (candidates.length === 1) return candidates[0]
  throw new Error(`draft root를 자동 결정할 수 없습니다. --draft-root를 지정하세요: ${draftsDirectory}`)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
