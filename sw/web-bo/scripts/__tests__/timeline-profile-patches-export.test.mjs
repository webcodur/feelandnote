import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildProfilePatchDocument,
  exportProfilePatches,
  parseArgs,
  validateProfilePatchDocument,
} from '../timeline-profile-patches-export.mjs'

const IDS = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000007',
]

function resolution({
  celebId,
  slug,
  field,
  currentValue,
  proposedValue,
  action,
  precision,
  blocked = false,
}) {
  return {
    celebId,
    slug,
    field,
    currentValue,
    action,
    proposedValue,
    precision,
    rationale: '권위 자료와 원본 draft를 대조해 이 결론을 확정했으며 staging 검토가 필요합니다.',
    rationaleEn: 'Authoritative evidence and the source draft support this resolved staging conclusion.',
    evidenceUrls: [`https://example.org/evidence/${slug}/${field}`],
    confidence: 'high',
    status: 'resolved',
    ...(blocked ? { trigger: { type: 'blocked', code: `BLOCKED_${slug}` } } : {}),
  }
}

function fixtureDocuments() {
  return {
    date: {
      file: '/resolution/date-conflicts.json',
      document: {
        schemaVersion: '1.0',
        generatedAt: '2026-08-10T01:00:00+09:00',
        resolutions: [
          resolution({
            celebId: IDS[0], slug: 'zeta', field: 'birthDate', currentValue: '1901-01-02',
            proposedValue: '1901-01-03', action: 'UPDATE_PROFILE', precision: 'exact-day',
          }),
          resolution({
            celebId: IDS[1], slug: 'beta', field: 'deathDate', currentValue: '2000',
            proposedValue: '2000', action: 'KEEP_PROFILE', precision: 'year',
          }),
          resolution({
            celebId: IDS[2], slug: 'alpha', field: 'birthDate', currentValue: '1902-03-04',
            proposedValue: '1902', action: 'REDUCE_PRECISION', precision: 'year',
          }),
          resolution({
            celebId: IDS[3], slug: 'gamma', field: 'deathDate', currentValue: '1999',
            proposedValue: null, action: 'IDENTITY_REVIEW', precision: 'unknown',
          }),
        ],
      },
    },
    identity: {
      file: '/resolution/identity-and-blocked.json',
      document: {
        schemaVersion: '1.0',
        generatedAt: '2026-08-10T03:30:00+09:00',
        resolutions: [
          resolution({
            celebId: IDS[4], slug: 'delta', field: 'nicknameEn', currentValue: 'Old Name',
            proposedValue: 'New Name', action: 'UPDATE_PROFILE', precision: 'not-applicable',
          }),
          resolution({
            celebId: IDS[5], slug: 'epsilon', field: 'researchStatus', currentValue: 'blocked',
            proposedValue: 'blocked', action: 'QUARANTINE_PROFILE', precision: 'not-applicable', blocked: true,
          }),
          resolution({
            celebId: IDS[6], slug: 'eta', field: 'researchStatus', currentValue: 'blocked',
            proposedValue: 'timeline_required', action: 'RESUME_TIMELINE', precision: 'not-applicable', blocked: true,
          }),
        ],
      },
    },
    other: {
      file: '/resolution/other-conflicts.json',
      document: {
        schemaVersion: '1.0',
        generatedAt: '2026-08-10T02:00:00+09:00',
        resolutions: [],
      },
    },
  }
}

const SUMMARY = {
  expectedResolutions: 7,
  profileConflicts: 5,
  blockedDrafts: 2,
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function createIntegrationFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'timeline-profile-patches-'))
  const draftRoot = path.join(root, 'drafts')
  const resolutionDir = path.join(root, 'resolutions')
  const documents = fixtureDocuments()
  const draftRecords = [
    { celebId: IDS[0], slug: 'zeta', profileConflicts: [{ field: 'birthDate', manifestValue: '1901-01-02' }] },
    { celebId: IDS[1], slug: 'beta', profileConflicts: [{ field: 'deathDate', manifestValue: '2000' }] },
    { celebId: IDS[2], slug: 'alpha', profileConflicts: [{ field: 'birthDate', manifestValue: '1902-03-04' }] },
    { celebId: IDS[3], slug: 'gamma', profileConflicts: [{ field: 'deathDate', manifestValue: '1999' }] },
    { celebId: IDS[4], slug: 'delta', profileConflicts: [{ field: 'nicknameEn', manifestValue: 'Old Name' }] },
    { celebId: IDS[5], slug: 'epsilon', researchStatus: 'blocked', blockingIssues: [{ code: 'BLOCKED_epsilon' }] },
    { celebId: IDS[6], slug: 'eta', researchStatus: 'blocked', blockingIssues: [{ code: 'BLOCKED_eta' }] },
  ]
  for (const draft of draftRecords) {
    await writeJson(path.join(draftRoot, 'people', 'life', `${draft.slug}.json`), draft)
  }
  await writeJson(path.join(resolutionDir, 'date-conflicts.json'), documents.date.document)
  await writeJson(path.join(resolutionDir, 'identity-and-blocked.json'), documents.identity.document)
  await writeJson(path.join(resolutionDir, 'other-conflicts.json'), documents.other.document)
  return { root, draftRoot, resolutionDir }
}

test('CLI는 기본 check-only이며 output과 명시 check-only의 혼용을 거부한다', () => {
  assert.deepEqual(parseArgs([]), { help: false, checkOnly: true })
  assert.deepEqual(parseArgs(['--output=patches.json']), {
    help: false,
    checkOnly: false,
    output: 'patches.json',
  })
  assert.throws(
    () => parseArgs(['--output=patches.json', '--check-only']),
    /함께 사용할 수 없습니다/,
  )
  assert.throws(
    () => parseArgs(['--check-only', '--output=patches.json']),
    /함께 사용할 수 없습니다/,
  )
})

test('여섯 resolution action을 staging action으로 매핑하고 결정적으로 정렬·해시한다', () => {
  const documents = fixtureDocuments()
  const first = buildProfilePatchDocument(documents, SUMMARY)
  const reordered = fixtureDocuments()
  reordered.date.document.resolutions.reverse()
  reordered.identity.document.resolutions.reverse()
  const second = buildProfilePatchDocument(reordered, SUMMARY)

  assert.deepEqual(second, first)
  assert.deepEqual(first.patches.map((patch) => patch.slug), [
    'alpha', 'beta', 'delta', 'epsilon', 'eta', 'gamma', 'zeta',
  ])
  assert.deepEqual(first.counts.byAction, {
    NO_CHANGE: 1,
    QUARANTINE: 1,
    REDUCE_PRECISION: 1,
    RESUME_TIMELINE: 1,
    REVIEW_IDENTITY: 1,
    SET_VALUE: 2,
  })
  assert.equal(first.counts.profileActions, 5)
  assert.equal(first.counts.blockedActions, 2)
  assert.equal(first.generatedAt, '2026-08-09T18:30:00.000Z')
  assert.equal(first.canonicalHash.length, 64)

  const reduced = first.patches.find((patch) => patch.action === 'REDUCE_PRECISION')
  assert.equal(reduced.proposedValue, '1902')
  assert.equal(reduced.precision, 'year')
  assert.deepEqual(reduced.directDbApplication, {
    column: 'birth_date',
    storageType: 'text | null',
    directlyApplicable: true,
    reason: 'birth_date은 text | null이므로 이 proposedValue를 그대로 저장할 수 있습니다. precision은 별도 검토 메타데이터이며 DB 쓰기는 이 도구가 수행하지 않습니다.',
  })
  assert.equal(validateProfilePatchDocument(first, { expectedTotal: 7 }).valid, true)
})

test('check-only는 writer를 호출하지 않고 valid/coverage complete 3종을 100% 추적한다', async () => {
  const fixture = await createIntegrationFixture()
  let writerCalls = 0
  const result = await exportProfilePatches({
    draftRoot: fixture.draftRoot,
    resolutionDir: fixture.resolutionDir,
    checkOnly: true,
    writer: async () => { writerCalls += 1 },
  })
  assert.equal(writerCalls, 0)
  assert.equal(result.mode, 'check-only')
  assert.equal(result.wrote, false)
  assert.equal(result.resolutionValidation.ready, true)
  assert.equal(result.document.counts.total, 7)
  assert.equal(result.document.counts.uniqueSourceResolutionKeys, 7)
})

test('명시 output은 원자 저장하고 저장본 자체 검증을 통과한다', async () => {
  const fixture = await createIntegrationFixture()
  const output = path.join(fixture.root, 'reports', 'profile-patches.json')
  const result = await exportProfilePatches({
    draftRoot: fixture.draftRoot,
    resolutionDir: fixture.resolutionDir,
    output,
  })
  assert.equal(result.mode, 'write')
  assert.equal(result.wrote, true)
  const persisted = JSON.parse(await readFile(output, 'utf8'))
  assert.deepEqual(persisted, result.document)
  assert.deepEqual(validateProfilePatchDocument(persisted, { expectedTotal: 7 }), {
    valid: true,
    issues: [],
  })
})

test('resolution 3종 중 하나가 없거나 coverage가 불완전하면 export를 거부한다', async () => {
  const fixture = await createIntegrationFixture()
  await writeJson(path.join(fixture.resolutionDir, 'other-conflicts.json'), {
    schemaVersion: '1.0',
    generatedAt: '2026-08-10T02:00:00+09:00',
    resolutions: [resolution({
      celebId: IDS[0], slug: 'unexpected', field: 'occupation', currentValue: 'x',
      proposedValue: 'y', action: 'UPDATE_PROFILE', precision: 'not-applicable',
    })],
  })
  await assert.rejects(
    exportProfilePatches({
      draftRoot: fixture.draftRoot,
      resolutionDir: fixture.resolutionDir,
      checkOnly: true,
    }),
    /valid\/coverage complete가 아닙니다/,
  )
})

test('중복 sourceResolutionKey와 변조된 canonicalHash를 탐지한다', () => {
  const documents = fixtureDocuments()
  documents.identity.document.resolutions.push({ ...documents.date.document.resolutions[0] })
  assert.throws(() => buildProfilePatchDocument(documents, {
    ...SUMMARY,
    expectedResolutions: 8,
    profileConflicts: 6,
  }), /중복 sourceResolutionKey/)

  const valid = buildProfilePatchDocument(fixtureDocuments(), SUMMARY)
  valid.canonicalHash = '0'.repeat(64)
  const result = validateProfilePatchDocument(valid, { expectedTotal: 7 })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((entry) => entry.includes('canonicalHash')))
})
