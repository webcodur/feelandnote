import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  resolutionConflictKey,
  resolutionScopeFor,
  validateResolutionDocument,
} from '../lib/timeline-conflict-resolution-schema.mjs'
import {
  exitCodeForReport,
  parseArgs,
  validateConflictResolutions,
} from '../timeline-conflict-resolution-validate.mjs'

const PERSON_ID = '123e4567-e89b-42d3-a456-426614174000'
const BLOCKED_ID = '223e4567-e89b-42d3-a456-426614174001'
const GENERATED_AT = '2026-08-10T12:00:00.000Z'

function resolution(overrides = {}) {
  const currentValue = overrides.currentValue ?? '1980'
  return {
    celebId: PERSON_ID,
    slug: 'test-person',
    field: 'birthDate',
    currentValue,
    action: 'UPDATE_PROFILE',
    proposedValue: '1981',
    precision: 'year',
    rationale: '기관 원문과 인물 식별자를 대조해 현재 프로필 값을 교정하기로 판정했다.',
    rationaleEn: 'The institutional source and identity record support correcting the current profile value.',
    evidenceUrls: ['https://example.com/record'],
    confidence: 'high',
    status: 'resolved',
    ...overrides,
  }
}

function document(items) {
  return { schemaVersion: '1.0', generatedAt: GENERATED_AT, resolutions: items }
}

function errorCodes(result) {
  return new Set(result.issues.filter((item) => item.severity === 'error').map((item) => item.code))
}

test('scope와 conflict key는 날짜·신원·기타·blocked를 안정적으로 구분한다', () => {
  assert.equal(resolutionScopeFor('birthDate'), 'date')
  assert.equal(resolutionScopeFor('nicknameEn'), 'identity')
  assert.equal(resolutionScopeFor('profession'), 'other')
  assert.equal(resolutionScopeFor('researchStatus'), 'identity')
  assert.equal(
    resolutionConflictKey({ celebId: PERSON_ID, slug: 'test-person', field: 'birthDate', currentValue: null }),
    JSON.stringify([PERSON_ID, 'test-person', 'birthDate', null]),
  )
})

test('공통 resolution 계약은 resolved 판정과 HTTP 근거를 허용한다', () => {
  const result = validateResolutionDocument(document([resolution()]), { expectedScope: 'date' })
  assert.deepEqual(errorCodes(result), new Set())
})

test('broken resolution은 status, URL, action 의미, scope를 함께 거부한다', () => {
  const result = validateResolutionDocument(document([resolution({
    field: 'nicknameEn',
    currentValue: 'Test Person',
    action: 'KEEP_PROFILE',
    proposedValue: 'Different Person',
    precision: 'year',
    evidenceUrls: ['ftp://example.com/record'],
    status: 'pending',
  })]), { expectedScope: 'date' })
  const codes = errorCodes(result)
  assert(codes.has('RESOLUTION_EVIDENCE_URL'))
  assert(codes.has('RESOLUTION_STATUS'))
  assert(codes.has('RESOLUTION_SCOPE'))
  assert(codes.has('RESOLUTION_NON_DATE_PRECISION'))
  assert(codes.has('RESOLUTION_KEEP_VALUE'))
})

test('blocked resolution은 명시적 trigger와 종결 action을 요구한다', () => {
  const valid = resolution({
    celebId: BLOCKED_ID,
    slug: 'blocked-person',
    field: 'researchStatus',
    currentValue: 'blocked',
    action: 'RESUME_TIMELINE',
    proposedValue: 'complete',
    precision: 'not-applicable',
    trigger: { type: 'blocked' },
  })
  assert.deepEqual(errorCodes(validateResolutionDocument(document([valid]), { expectedScope: 'identity' })), new Set())

  const invalid = { ...valid, action: 'KEEP_PROFILE', trigger: undefined }
  const codes = errorCodes(validateResolutionDocument(document([invalid]), { expectedScope: 'identity' }))
  assert(codes.has('BLOCKED_TRIGGER'))
  assert(codes.has('BLOCKED_ACTION'))
})

test('CLI 인자는 명시 경로를 우선한다', () => {
  assert.deepEqual(parseArgs([
    '--drafts=drafts',
    '--resolutions=resolutions',
    '--date=date.json',
    '--identity=identity.json',
    '--other=other.json',
    '--report=report.json',
  ]), {
    draftRoot: 'drafts',
    resolutionDir: 'resolutions',
    date: 'date.json',
    identity: 'identity.json',
    other: 'other.json',
    report: 'report.json',
  })
})

test('directory validator는 missing 파일을 pending으로 두고 현재 파일 계약은 계속 검사한다', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'timeline-resolution-pending-'))
  try {
    const draftRoot = path.join(root, 'drafts')
    const resolutionDir = path.join(root, 'resolutions')
    await mkdir(path.join(draftRoot, 'people', 'life'), { recursive: true })
    await mkdir(resolutionDir, { recursive: true })
    await writeFile(path.join(draftRoot, 'people', 'life', 'test-person.json'), JSON.stringify({
      celebId: PERSON_ID,
      slug: 'test-person',
      researchStatus: 'complete',
      profileConflicts: [{ field: 'birthDate', manifestValue: '1980' }],
    }), 'utf8')
    await writeFile(path.join(resolutionDir, 'other-conflicts.json'), JSON.stringify(document([])), 'utf8')

    const report = await validateConflictResolutions({ draftRoot, resolutionDir })
    assert.equal(report.summary.expectedResolutions, 1)
    assert.equal(report.summary.pendingFiles, 2)
    assert.equal(report.summary.errors, 0)
    assert.equal(report.summary.state, 'pending')
    assert.equal(exitCodeForReport(report), 2)
    assert(report.issues.some((item) => item.code === 'RESOLUTION_FILE_PENDING' && item.scope === 'date'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('directory validator는 profile conflicts와 blocked draft를 세 파일에 1:1 대조한다', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'timeline-resolution-ready-'))
  try {
    const draftRoot = path.join(root, 'drafts')
    const resolutionDir = path.join(root, 'resolutions')
    const people = path.join(draftRoot, 'people', 'life')
    await mkdir(people, { recursive: true })
    await mkdir(resolutionDir, { recursive: true })
    await writeFile(path.join(people, 'test-person.json'), JSON.stringify({
      celebId: PERSON_ID,
      slug: 'test-person',
      researchStatus: 'complete',
      profileConflicts: [
        { field: 'birthDate', manifestValue: '1980' },
        { field: 'nicknameEn', manifestValue: 'Test Person' },
        { field: 'profession', manifestValue: 'writer' },
      ],
    }), 'utf8')
    await writeFile(path.join(people, 'blocked-person.json'), JSON.stringify({
      celebId: BLOCKED_ID,
      slug: 'blocked-person',
      researchStatus: 'blocked',
    }), 'utf8')

    const identity = resolution({
      field: 'nicknameEn',
      currentValue: 'Test Person',
      action: 'KEEP_PROFILE',
      proposedValue: 'Test Person',
      precision: 'not-applicable',
    })
    const blocked = resolution({
      celebId: BLOCKED_ID,
      slug: 'blocked-person',
      field: 'researchStatus',
      currentValue: 'blocked',
      action: 'QUARANTINE_PROFILE',
      proposedValue: null,
      precision: 'not-applicable',
      trigger: { type: 'blocked' },
    })
    const other = resolution({
      field: 'profession',
      currentValue: 'writer',
      action: 'KEEP_PROFILE',
      proposedValue: 'writer',
      precision: 'not-applicable',
    })
    await writeFile(path.join(resolutionDir, 'date-conflicts.json'), JSON.stringify(document([resolution()])), 'utf8')
    await writeFile(path.join(resolutionDir, 'identity-and-blocked.json'), JSON.stringify(document([identity, blocked])), 'utf8')
    await writeFile(path.join(resolutionDir, 'other-conflicts.json'), JSON.stringify(document([other])), 'utf8')

    const report = await validateConflictResolutions({ draftRoot, resolutionDir })
    assert.equal(report.summary.profileConflicts, 3)
    assert.equal(report.summary.blockedDrafts, 1)
    assert.deepEqual(report.summary.expectedByScope, { date: 1, identity: 2, other: 1 })
    assert.equal(report.summary.matchedResolutions, 4)
    assert.equal(report.summary.unresolved, 0)
    assert.equal(report.summary.state, 'ready')
    assert.equal(exitCodeForReport(report), 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('directory validator는 extra와 missing resolution을 모두 검출한다', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'timeline-resolution-invalid-'))
  try {
    const draftRoot = path.join(root, 'drafts')
    const resolutionDir = path.join(root, 'resolutions')
    await mkdir(path.join(draftRoot, 'people', 'life'), { recursive: true })
    await mkdir(resolutionDir, { recursive: true })
    await writeFile(path.join(draftRoot, 'people', 'life', 'test-person.json'), JSON.stringify({
      celebId: PERSON_ID,
      slug: 'test-person',
      researchStatus: 'complete',
      profileConflicts: [{ field: 'birthDate', manifestValue: '1980' }],
    }), 'utf8')
    await writeFile(path.join(resolutionDir, 'date-conflicts.json'), JSON.stringify(document([
      resolution({ currentValue: '1979', proposedValue: '1981' }),
    ])), 'utf8')
    await writeFile(path.join(resolutionDir, 'identity-and-blocked.json'), JSON.stringify(document([])), 'utf8')
    await writeFile(path.join(resolutionDir, 'other-conflicts.json'), JSON.stringify(document([])), 'utf8')

    const report = await validateConflictResolutions({ draftRoot, resolutionDir })
    const codes = new Set(report.issues.map((item) => item.code))
    assert(codes.has('RESOLUTION_EXTRA'))
    assert(codes.has('RESOLUTION_MISSING'))
    assert.equal(report.summary.state, 'invalid')
    assert.equal(exitCodeForReport(report), 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
