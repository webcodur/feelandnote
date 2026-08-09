import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  applyConflictResolutions,
  exitCodeForApplicationReport,
  parseArgs,
  writeDraftAtomically,
} from '../timeline-conflict-resolution-apply.mjs'
import { validateConflictResolutions } from '../timeline-conflict-resolution-validate.mjs'

const PERSON_ID = '123e4567-e89b-42d3-a456-426614174000'
const RESUME_ID = '223e4567-e89b-42d3-a456-426614174001'
const QUARANTINE_ID = '323e4567-e89b-42d3-a456-426614174002'
const GENERATED_AT = '2026-08-10T12:00:00.000Z'

function resolution(overrides = {}) {
  return {
    celebId: PERSON_ID,
    slug: 'test-person',
    field: 'birthDate',
    currentValue: '1980',
    action: 'UPDATE_PROFILE',
    proposedValue: '1981',
    precision: 'year',
    rationale: '기관 원문과 프로필 정본을 대조하여 이 충돌을 확정적으로 판정하고 후속 조치를 기록했다.',
    rationaleEn: 'The institutional record and canonical profile were compared to resolve this conflict and record the follow-up action.',
    evidenceUrls: ['https://example.com/record'],
    confidence: 'high',
    status: 'resolved',
    ...overrides,
  }
}

function document(items) {
  return { schemaVersion: '1.0', generatedAt: GENERATED_AT, resolutions: items }
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function createFixture({ omitOther = false, resumeTriggerCode = 'IDENTITY_UNVERIFIED' } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'timeline-resolution-apply-'))
  const draftRoot = path.join(root, 'drafts')
  const people = path.join(draftRoot, 'people', 'life')
  const resolutionDir = path.join(root, 'resolutions')
  await mkdir(people, { recursive: true })
  await mkdir(resolutionDir, { recursive: true })

  const personFile = path.join(people, 'test-person.json')
  const resumeFile = path.join(people, 'resume-person.json')
  const quarantineFile = path.join(people, 'quarantine-person.json')
  await writeJson(personFile, {
    celebId: PERSON_ID,
    slug: 'test-person',
    researchStatus: 'complete',
    profileConflicts: [
      { field: 'birthDate', manifestValue: '1980', evidenceValue: '1981' },
      { field: 'deathDate', manifestValue: '2020-03-04', evidenceValue: '2020' },
      { field: 'nicknameEn', manifestValue: 'Test Person', evidenceValue: 'Test Person' },
      { field: 'wikidataQid', manifestValue: 'QOLD', evidenceValue: null },
    ],
    events: [{ year: 2000, title: '원본 사건' }],
  })
  await writeJson(resumeFile, {
    celebId: RESUME_ID,
    slug: 'resume-person',
    researchStatus: 'blocked',
    blockingIssues: [{ code: 'IDENTITY_UNVERIFIED', message: '신원 확인이 필요하다.' }],
    events: [],
  })
  await writeJson(quarantineFile, {
    celebId: QUARANTINE_ID,
    slug: 'quarantine-person',
    researchStatus: 'blocked',
    blockingIssues: [{ code: 'IDENTITY_UNVERIFIED', message: '신원 확인이 필요하다.' }],
    events: [],
  })

  await writeJson(path.join(resolutionDir, 'date-conflicts.json'), document([
    resolution(),
    resolution({
      field: 'deathDate',
      currentValue: '2020-03-04',
      action: 'REDUCE_PRECISION',
      proposedValue: '2020',
      precision: 'year',
    }),
  ]))
  await writeJson(path.join(resolutionDir, 'identity-and-blocked.json'), document([
    resolution({
      field: 'nicknameEn',
      currentValue: 'Test Person',
      action: 'KEEP_PROFILE',
      proposedValue: 'Test Person',
      precision: 'not-applicable',
    }),
    resolution({
      field: 'wikidataQid',
      currentValue: 'QOLD',
      action: 'IDENTITY_REVIEW',
      proposedValue: null,
      precision: 'not-applicable',
    }),
    resolution({
      celebId: RESUME_ID,
      slug: 'resume-person',
      field: 'researchStatus',
      currentValue: 'blocked',
      action: 'RESUME_TIMELINE',
      proposedValue: 'complete: identified person',
      precision: 'not-applicable',
      trigger: { type: 'blocked', code: resumeTriggerCode },
    }),
    resolution({
      celebId: QUARANTINE_ID,
      slug: 'quarantine-person',
      field: 'researchStatus',
      currentValue: 'blocked',
      action: 'QUARANTINE_PROFILE',
      proposedValue: null,
      precision: 'not-applicable',
      trigger: { type: 'blocked', code: 'IDENTITY_UNVERIFIED' },
    }),
  ]))
  if (!omitOther) await writeJson(path.join(resolutionDir, 'other-conflicts.json'), document([]))

  return {
    root,
    draftRoot,
    people,
    resolutionDir,
    personFile,
    resumeFile,
    quarantineFile,
  }
}

test('CLI는 check-only가 기본이고 --apply를 명시적으로만 허용한다', () => {
  assert.deepEqual(parseArgs([]), { apply: false, help: false })
  assert.deepEqual(parseArgs(['--check-only']), { apply: false, help: false })
  assert.deepEqual(parseArgs(['--apply', '--drafts=drafts', '--resolutions=resolutions']), {
    apply: true,
    help: false,
    draftRoot: 'drafts',
    resolutionDir: 'resolutions',
  })
  assert.throws(() => parseArgs(['--apply', '--check-only']), /함께 사용할 수 없습니다/)
})

test('check-only는 완전한 세 보고서를 검증하고 writer를 호출하지 않는다', async () => {
  const fixture = await createFixture()
  try {
    const before = await Promise.all([
      readFile(fixture.personFile, 'utf8'),
      readFile(fixture.resumeFile, 'utf8'),
      readFile(fixture.quarantineFile, 'utf8'),
    ])
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      writer: async () => { writes += 1 },
    })

    assert.equal(report.mode, 'check-only')
    assert.equal(report.validation.state, 'ready')
    assert.equal(report.summary.ready, true)
    assert.equal(report.summary.applied, false)
    assert.equal(report.summary.plannedDrafts, 3)
    assert.equal(report.summary.changedDrafts, 3)
    assert.equal(report.summary.writtenDrafts, 0)
    assert.equal(report.summary.profileConflictsResolved, 4)
    assert.equal(report.summary.blockingIssuesResolved, 2)
    assert.equal(writes, 0)
    assert.equal(exitCodeForApplicationReport(report), 0)
    assert.deepEqual(await Promise.all([
      readFile(fixture.personFile, 'utf8'),
      readFile(fixture.resumeFile, 'utf8'),
      readFile(fixture.quarantineFile, 'utf8'),
    ]), before)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('--apply는 resolution을 삽입하되 blocked 상태와 사건을 보존하고 재실행 가능하다', async () => {
  const fixture = await createFixture()
  try {
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
    })
    assert.equal(report.summary.ready, true)
    assert.equal(report.summary.applied, true)
    assert.equal(report.summary.writtenDrafts, 3)

    const person = await readJson(fixture.personFile)
    assert.equal(person.profileConflicts[0].resolution.action, 'UPDATE_PROFILE')
    assert.equal(person.profileConflicts[1].resolution.action, 'REDUCE_PRECISION')
    assert.equal(person.profileConflicts[2].resolution.action, 'KEEP_PROFILE')
    assert.equal(person.profileConflicts[3].resolution.action, 'IDENTITY_REVIEW')
    assert.equal(person.profileConflicts[0].resolution.resolvedAt, GENERATED_AT)
    assert.deepEqual(Object.keys(person.profileConflicts[0].resolution), [
      'status',
      'action',
      'proposedValue',
      'precision',
      'rationale',
      'rationaleEn',
      'evidenceUrls',
      'confidence',
      'resolvedAt',
    ])
    assert.deepEqual(person.events, [{ year: 2000, title: '원본 사건' }])

    const resume = await readJson(fixture.resumeFile)
    assert.equal(resume.researchStatus, 'blocked')
    assert.equal(resume.applicationStatus, 'timeline_required')
    assert.equal(resume.blockingIssues[0].resolution.action, 'RESUME_TIMELINE')
    assert.deepEqual(resume.events, [])

    const quarantine = await readJson(fixture.quarantineFile)
    assert.equal(quarantine.researchStatus, 'blocked')
    assert.equal(quarantine.applicationStatus, 'quarantined')
    assert.equal(quarantine.blockingIssues[0].resolution.action, 'QUARANTINE_PROFILE')
    assert.deepEqual(quarantine.events, [])

    const filenames = await readdir(fixture.people)
    assert(filenames.every((name) => name.endsWith('.json')))

    const second = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
    })
    assert.equal(second.summary.ready, true)
    assert.equal(second.summary.changedDrafts, 0)
    assert.equal(second.summary.writtenDrafts, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('세 보고서 중 하나라도 없으면 apply를 거부하고 쓰지 않는다', async () => {
  const fixture = await createFixture({ omitOther: true })
  try {
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
      writer: async () => { writes += 1 },
    })
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.applied, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert.equal(report.validation.state, 'pending')
    assert(report.issues.some((item) => item.code === 'RESOLUTION_FILE_PENDING' && item.scope === 'other'))
    assert.equal(writes, 0)
    assert.equal(exitCodeForApplicationReport(report), 1)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('coverage가 비거나 blockingIssues trigger가 맞지 않으면 전체 쓰기를 선행 거부한다', async () => {
  const missingCoverage = await createFixture()
  try {
    await writeJson(path.join(missingCoverage.resolutionDir, 'date-conflicts.json'), document([]))
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: missingCoverage.draftRoot,
      resolutionDir: missingCoverage.resolutionDir,
      apply: true,
      writer: async () => { writes += 1 },
    })
    assert.equal(report.validation.state, 'invalid')
    assert.equal(report.summary.ready, false)
    assert(report.issues.some((item) => item.code === 'RESOLUTION_MISSING'))
    assert.equal(writes, 0)
  } finally {
    await rm(missingCoverage.root, { recursive: true, force: true })
  }

  const mismatchedTrigger = await createFixture({ resumeTriggerCode: 'DIFFERENT_ISSUE' })
  try {
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: mismatchedTrigger.draftRoot,
      resolutionDir: mismatchedTrigger.resolutionDir,
      apply: true,
      writer: async () => { writes += 1 },
    })
    assert.equal(report.validation.state, 'ready')
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert(report.issues.some((item) => item.code === 'APPLICATION_BLOCKING_ISSUE_MISSING'))
    assert.equal(writes, 0)
  } finally {
    await rm(mismatchedTrigger.root, { recursive: true, force: true })
  }
})

test('중복 신원·conflict를 가진 다른 draft에는 resolution을 잘못 적용하지 않는다', async () => {
  const fixture = await createFixture()
  try {
    await writeJson(path.join(fixture.people, 'wrong-draft.json'), {
      celebId: PERSON_ID,
      slug: 'test-person',
      researchStatus: 'complete',
      profileConflicts: [{ field: 'birthDate', manifestValue: '1980', evidenceValue: '1981' }],
      events: [],
    })
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
      writer: async () => { writes += 1 },
    })
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert(report.issues.some((item) => item.code === 'DRAFT_CONFLICT_DUPLICATE'))
    assert.equal(writes, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('blocked resolution은 trigger.code 없이 여러 blockingIssues에 넓게 적용되지 않는다', async () => {
  const fixture = await createFixture()
  try {
    const identityFile = path.join(fixture.resolutionDir, 'identity-and-blocked.json')
    const identity = await readJson(identityFile)
    const resume = identity.resolutions.find((item) => item.slug === 'resume-person')
    resume.trigger = { type: 'blocked' }
    await writeJson(identityFile, identity)
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
      writer: async () => { writes += 1 },
    })
    assert.equal(report.validation.state, 'ready')
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert(report.issues.some((item) => item.code === 'APPLICATION_BLOCKING_TRIGGER_CODE'))
    assert(report.issues.some((item) => item.code === 'APPLICATION_FILE_COVERAGE_MISMATCH'))
    assert.equal(writes, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('여러 draft 적용 중 writer가 실패하면 앞서 쓴 파일까지 원본으로 복구한다', async () => {
  const fixture = await createFixture()
  try {
    const files = [fixture.personFile, fixture.resumeFile, fixture.quarantineFile]
    const before = await Promise.all(files.map((file) => readFile(file, 'utf8')))
    let calls = 0
    const writer = async (file, draft) => {
      calls += 1
      if (calls === 2) throw new Error('injected writer failure')
      await writeDraftAtomically(file, draft)
    }
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
      writer,
    })
    assert.equal(report.validation.state, 'ready')
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.applied, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert.equal(report.summary.rollbackComplete, true)
    assert(report.issues.some((item) => item.code === 'APPLICATION_WRITE_FAILED_ROLLED_BACK'))
    assert.deepEqual(await Promise.all(files.map((file) => readFile(file, 'utf8'))), before)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('계획 뒤 아직 쓰지 않은 draft가 바뀌면 외부 변경을 보존하고 앞선 쓰기만 복구한다', async () => {
  const fixture = await createFixture()
  try {
    const quarantineBefore = await readFile(fixture.quarantineFile, 'utf8')
    const personBefore = await readFile(fixture.personFile, 'utf8')
    let calls = 0
    const writer = async (file, draft) => {
      calls += 1
      await writeDraftAtomically(file, draft)
      if (calls === 1) {
        const concurrent = await readJson(fixture.resumeFile)
        concurrent.concurrentMarker = 'preserve-me'
        await writeJson(fixture.resumeFile, concurrent)
      }
    }
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
      writer,
    })
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.applied, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert.equal(report.summary.rollbackComplete, true)
    assert(report.issues.some((item) => item.code === 'APPLICATION_DRAFT_CHANGED_BEFORE_WRITE'))
    assert.equal((await readJson(fixture.resumeFile)).concurrentMarker, 'preserve-me')
    assert.equal(await readFile(fixture.quarantineFile, 'utf8'), quarantineBefore)
    assert.equal(await readFile(fixture.personFile, 'utf8'), personBefore)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('validator 직후 resolution 문서가 바뀌어도 snapshot 계약을 다시 검사해 쓰지 않는다', async () => {
  const fixture = await createFixture()
  try {
    const dateFile = path.join(fixture.resolutionDir, 'date-conflicts.json')
    const validator = async (options) => {
      const report = await validateConflictResolutions(options)
      const date = await readJson(dateFile)
      date.resolutions[0].status = 'pending'
      await writeJson(dateFile, date)
      return report
    }
    let writes = 0
    const report = await applyConflictResolutions({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      apply: true,
      validator,
      writer: async () => { writes += 1 },
    })
    assert.equal(report.validation.state, 'ready')
    assert.equal(report.summary.ready, false)
    assert.equal(report.summary.writtenDrafts, 0)
    assert(report.issues.some((item) => item.code === 'RESOLUTION_STATUS'))
    assert.equal(writes, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
