import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { validateDraft, validateManifest } from '../lib/timeline-draft-schema.mjs'
import { parseArgs, shouldExitNonZero, validateDraftDirectory } from '../timeline-draft-validate.mjs'

const PERSON_ID = '123e4567-e89b-42d3-a456-426614174000'

function source() {
  return {
    id: 'S1',
    url: 'https://example.com/source',
    title: 'Primary source record',
    publisher: 'Example Archive',
    accessedAt: '2026-08-09',
  }
}

function lifeEvent(year, kind = 'work', suffix = String(year)) {
  return {
    eventType: 'life',
    year,
    yearEnd: null,
    month: null,
    day: null,
    title: `사건 ${suffix}`,
    titleEn: `Event ${suffix}`,
    description: `이 사건은 ${suffix}년에 일어났다. 이후 인물의 활동 방향에 뚜렷한 영향을 남겼다.`,
    descriptionEn: `This event took place in ${suffix}. It had a clear effect on the person's later work.`,
    kind,
    placeName: null,
    placeNameEn: null,
    placeQuery: null,
    placeCountry: null,
    evidenceRefs: ['S1'],
  }
}

function baseDraft({ birthDate = null, deathDate = null, events, mode = 'life' }) {
  return {
    celebId: PERSON_ID,
    slug: 'test-person',
    nickname: '시험 인물',
    nicknameEn: 'Test Person',
    timelineMode: mode,
    laneId: 1,
    profileSnapshot: {
      celebTier: mode === 'fiction' ? 'fiction' : 'full',
      publicationStatus: 'inactive',
      birthDate,
      deathDate,
      profession: 'writer',
      nationality: 'KR',
      wikidataQid: null,
    },
    sources: [source()],
    researchStatus: 'complete',
    events,
  }
}

function errors(result) {
  return result.issues.filter((item) => item.severity === 'error')
}

test('CLI: --manifest/--drafts 명시 인자가 위치 인자보다 우선한다', () => {
  const args = parseArgs([
    'legacy-manifest.json',
    '--manifest=canonical-manifest.json',
    '--drafts=canonical-drafts',
    '--report=report.json',
    '--allow-blocked',
  ])
  assert.equal(args.manifest, 'canonical-manifest.json')
  assert.equal(args.draftRoot, 'canonical-drafts')
  assert.equal(args.report, 'report.json')
  assert.equal(args.allowBlocked, true)
})

test('CLI: blocked는 기본 실패이고 --allow-blocked 정책에서만 허용된다', () => {
  const report = { summary: { valid: true, blocked: 1 } }
  assert.equal(shouldExitNonZero(report), true)
  assert.equal(shouldExitNonZero(report, { allowBlocked: true }), false)
  assert.equal(shouldExitNonZero({ summary: { valid: false, blocked: 0 } }, { allowBlocked: true }), true)
})

test('life: 생존 인물은 birth만 경계 사건으로 요구한다', () => {
  const draft = baseDraft({
    birthDate: '1980-02-03',
    events: [lifeEvent(1980, 'birth'), lifeEvent(2001), lifeEvent(2025)],
  })
  assert.deepEqual(errors(validateDraft(draft)), [])
})
test('life: 사망 인물은 birth/death의 위치와 프로필 연도를 대조한다', () => {
  const draft = baseDraft({
    birthDate: '1900',
    deathDate: '1970-04-05',
    events: [lifeEvent(1900, 'birth'), lifeEvent(1930), lifeEvent(1970, 'death')],
  })
  assert.deepEqual(errors(validateDraft(draft)), [])
})

test('life: 생몰 미상은 birth/death를 강제하지 않는다', () => {
  const draft = baseDraft({ events: [lifeEvent(1910), lifeEvent(1930), lifeEvent(1950)] })
  assert.deepEqual(errors(validateDraft(draft)), [])
})

test('complete: 근거가 연결된 profileConflicts는 birth 경계 불일치를 warning으로 남긴다', () => {
  const draft = baseDraft({
    birthDate: '1980-02-03',
    events: [lifeEvent(1981, 'birth'), lifeEvent(2010), lifeEvent(2025)],
  })
  draft.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1980-02-03',
    evidenceValue: '1981',
    message: '공개 기관 기록은 프로필과 다른 출생 연도를 제시해 정본 확인이 필요하다.',
    messageEn: 'The public institutional record gives a different birth year from the profile and requires canonical review.',
    evidenceRefs: ['S1'],
  }]
  const result = validateDraft(draft)
  assert.deepEqual(errors(result), [])
  assert(result.issues.some((item) => item.code === 'PROFILE_CONFLICT' && item.severity === 'warning'))
  assert(!result.issues.some((item) => item.code === 'BIRTH_BOUNDARY'))
  assert(!result.issues.some((item) => item.code === 'SOURCE_UNUSED'))
})

test('실패: 근거 없는 profileConflicts는 birth 경계 오류를 면제하지 않는다', () => {
  const draft = baseDraft({
    birthDate: '1980',
    events: [lifeEvent(2001), lifeEvent(2010), lifeEvent(2025)],
  })
  draft.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1980',
    evidenceValue: '1981',
    message: '공개 기관 기록은 프로필과 다른 출생 연도를 제시해 정본 확인이 필요하다.',
    messageEn: 'The public institutional record gives a different birth year from the profile and requires canonical review.',
    evidenceRefs: [],
  }]
  const codes = new Set(errors(validateDraft(draft)).map((item) => item.code))
  assert(codes.has('EVIDENCE_REQUIRED'))
  assert(codes.has('BIRTH_BOUNDARY'))
})

test('blocked: 빈 events와 출처에 연결된 blockingIssues를 허용한다', () => {
  const draft = baseDraft({ birthDate: '1980', events: [] })
  draft.researchStatus = 'blocked'
  draft.blockingIssues = [{
    code: 'IDENTITY_UNVERIFIED',
    message: '공식 기록만으로는 프로필 인물의 신원과 경력을 안전하게 특정할 수 없다.',
    messageEn: 'Official records do not safely establish the identity and career of the person represented by this profile.',
    evidenceRefs: ['S1'],
  }]
  const result = validateDraft(draft)
  assert.deepEqual(errors(result), [])
  assert(!result.issues.some((item) => item.code === 'SOURCE_UNUSED'))
})

test('실패: blocked는 부분 events 또는 blockingIssues 누락을 허용하지 않는다', () => {
  const draft = baseDraft({ events: [lifeEvent(2001), lifeEvent(2010), lifeEvent(2025)] })
  draft.researchStatus = 'blocked'
  const codes = new Set(errors(validateDraft(draft)).map((item) => item.code))
  assert(codes.has('BLOCKED_EVENTS'))
  assert(codes.has('BLOCKING_ISSUES_REQUIRED'))
})

test('fiction: sequenceLabel/sortOrder union과 6~12건을 허용한다', () => {
  const events = Array.from({ length: 6 }, (_, index) => ({
    eventType: 'fiction',
    sequenceLabel: `제${index + 1}막`,
    sequenceLabelEn: `Act ${index + 1}`,
    sortOrder: index + 1,
    title: `서사 사건 ${index + 1}`,
    titleEn: `Narrative event ${index + 1}`,
    description: `주인공은 제${index + 1}막에서 선택을 내린다. 이 선택은 다음 사건의 갈등을 직접 불러온다.`,
    descriptionEn: `The protagonist makes a choice in act ${index + 1}. That choice directly creates the conflict in the next event.`,
    kind: 'other',
    placeName: null,
    placeNameEn: null,
    evidenceRefs: ['S1'],
  }))
  assert.deepEqual(errors(validateDraft(baseDraft({ mode: 'fiction', events }))), [])
})

test('실패: 생몰 null 경계 사건, 좌표, dangling source, 깨진 문자열을 잡는다', () => {
  const draft = baseDraft({ events: [lifeEvent(1900, 'birth'), lifeEvent(1930), lifeEvent(1950)] })
  draft.events[0].lat = 37.5
  draft.events[1].evidenceRefs = ['MISSING']
  draft.events[2].titleEn = 'Broken Ã© title'
  const codes = new Set(errors(validateDraft(draft)).map((item) => item.code))
  assert(codes.has('UNKNOWN_BIRTH_KIND'))
  assert(codes.has('MODEL_COORDINATE_FORBIDDEN'))
  assert(codes.has('EVIDENCE_DANGLING'))
  assert(codes.has('BROKEN_TEXT'))
})

test('manifest: ID/slug 중복과 집계 불일치를 잡는다', () => {
  const person = {
    celebId: PERSON_ID,
    slug: 'test-person',
    nickname: '시험 인물',
    nicknameEn: 'Test Person',
    celebTier: 'full',
    timelineMode: 'life',
  }
  const result = validateManifest({
    schemaVersion: 1,
    snapshotId: 'test-snapshot',
    counts: { missingTotal: 3, life: 1, fiction: 0 },
    people: [person, { ...person }],
  })
  const codes = new Set(errors(result).map((item) => item.code))
  assert(codes.has('MANIFEST_DUPLICATE_ID'))
  assert(codes.has('MANIFEST_DUPLICATE_SLUG'))
  assert(codes.has('MANIFEST_COUNT'))
})

test('directory: manifest 전체와 파일 구조를 대조해 누락을 report한다', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'timeline-draft-test-'))
  try {
    const manifestPath = path.join(root, 'manifest.json')
    const draftRoot = path.join(root, 'drafts')
    const first = {
      celebId: PERSON_ID,
      slug: 'test-person',
      nickname: '시험 인물',
      nicknameEn: 'Test Person',
      celebTier: 'full',
      publicationStatus: 'inactive',
      birthDate: '1980',
      deathDate: null,
      profession: 'writer',
      nationality: 'KR',
      wikidataQid: null,
      timelineMode: 'life',
      laneId: 1,
    }
    const second = { ...first, celebId: '223e4567-e89b-42d3-a456-426614174001', slug: 'blocked-person', laneId: 2 }
    const third = { ...first, celebId: '323e4567-e89b-42d3-a456-426614174002', slug: 'missing-person', laneId: 3 }
    await mkdir(path.join(draftRoot, 'people', 'life'), { recursive: true })
    await writeFile(manifestPath, JSON.stringify({
      schemaVersion: 1,
      snapshotId: 'test-snapshot',
      counts: { missingTotal: 3, life: 3, fiction: 0 },
      people: [first, second, third],
    }), 'utf8')
    await writeFile(path.join(draftRoot, 'people', 'life', 'test-person.json'), JSON.stringify(baseDraft({
      birthDate: '1980',
      events: [lifeEvent(1980, 'birth'), lifeEvent(2000), lifeEvent(2020)],
    })), 'utf8')
    const blockedDraft = baseDraft({ birthDate: '1980', events: [] })
    Object.assign(blockedDraft, {
      celebId: second.celebId,
      slug: second.slug,
      laneId: second.laneId,
      researchStatus: 'blocked',
      blockingIssues: [{
        code: 'IDENTITY_UNVERIFIED',
        message: '공식 기록만으로는 프로필 인물의 신원과 경력을 안전하게 특정할 수 없다.',
        messageEn: 'Official records do not safely establish the identity and career of the person represented by this profile.',
        evidenceRefs: ['S1'],
      }],
    })
    await writeFile(path.join(draftRoot, 'people', 'life', 'blocked-person.json'), JSON.stringify(blockedDraft), 'utf8')

    const report = await validateDraftDirectory({ manifestPath, draftRoot })
    assert.equal(report.summary.expectedPeople, 3)
    assert.equal(report.summary.coveredPeople, 2)
    assert.equal(report.summary.draftFiles, 2)
    assert.equal(report.summary.complete, 1)
    assert.equal(report.summary.blocked, 1)
    assert.equal(report.summary.otherStatus, 0)
    assert.equal(report.summary.missing, 1)
    assert.equal(report.summary.valid, false)
    assert(report.issues.some((item) => item.code === 'DRAFT_MISSING' && item.slug === 'missing-person'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
