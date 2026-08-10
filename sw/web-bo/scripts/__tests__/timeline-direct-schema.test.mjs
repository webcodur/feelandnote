import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mapDirectPayloadToTimelineRows,
  sentenceCount,
  validateDirectBlockedPayload,
  validateDirectCommitPayload,
} from '../lib/timeline-direct-schema.mjs'

export function profileSnapshot(overrides = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'test-person',
    nickname: '시험 인물',
    nicknameEn: 'Test Person',
    title: null,
    titleEn: null,
    profession: 'researcher',
    nationality: 'US',
    gender: null,
    birthDate: '1980-01-02',
    deathDate: '2020-03-04',
    celebTier: 'full',
    publicationStatus: 'inactive',
    wikidataQid: 'Q123',
    ...overrides,
  }
}

function description(label) {
  return `${label}에 관한 첫 번째 문장입니다. 검증 가능한 사실을 설명하는 두 번째 문장입니다.`
}

function descriptionEn(label) {
  return `This is the first verified sentence about ${label}. This is the second sentence with supporting context.`
}

function lifeEvent(year, kind, title, overrides = {}) {
  return {
    eventType: 'life',
    year,
    yearEnd: null,
    month: null,
    day: null,
    title,
    titleEn: title,
    description: description(title),
    descriptionEn: descriptionEn(title),
    kind,
    placeName: null,
    placeNameEn: null,
    placeQuery: null,
    placeCountry: null,
    evidenceRefs: ['S1'],
    ...overrides,
  }
}

export function validLifePayload() {
  return {
    celebId: '11111111-1111-1111-1111-111111111111',
    slug: 'test-person',
    nickname: '시험 인물',
    nicknameEn: 'Test Person',
    timelineMode: 'life',
    profileSnapshot: profileSnapshot(),
    sources: [{
      id: 'S1',
      url: 'https://example.com/source',
      title: 'Authoritative source',
      publisher: 'Example',
      accessedAt: '2026-08-10',
    }],
    researchStatus: 'complete',
    events: [
      lifeEvent(1980, 'birth', '출생', { month: 1, day: 2 }),
      lifeEvent(2000, 'work', '첫 활동'),
      lifeEvent(2020, 'death', '사망', { month: 3, day: 4 }),
    ],
  }
}

export function validFictionPayload() {
  const snapshot = profileSnapshot({
    celebTier: 'fiction',
    birthDate: null,
    deathDate: null,
  })
  return {
    celebId: snapshot.id,
    slug: snapshot.slug,
    nickname: snapshot.nickname,
    nicknameEn: snapshot.nicknameEn,
    timelineMode: 'fiction',
    profileSnapshot: snapshot,
    sources: [{
      id: 'S1',
      url: 'https://example.com/original-text',
      title: 'Original text',
      publisher: null,
      accessedAt: null,
    }],
    researchStatus: 'complete',
    events: Array.from({ length: 6 }, (_, index) => ({
      eventType: 'fiction',
      sequenceLabel: `${index + 1}막`,
      sequenceLabelEn: `Act ${index + 1}`,
      sortOrder: index + 1,
      title: `서사 ${index + 1}`,
      titleEn: `Story ${index + 1}`,
      description: description(`서사 ${index + 1}`),
      descriptionEn: descriptionEn(`story ${index + 1}`),
      kind: 'other',
      placeName: null,
      placeNameEn: null,
      placeQuery: null,
      placeCountry: null,
      evidenceRefs: ['S1'],
    })),
  }
}

function codes(payload) {
  return validateDirectCommitPayload(payload).issues.map((issue) => issue.code)
}

test('accepts a strict life payload and maps the first evidence URL', () => {
  const payload = validLifePayload()
  assert.deepEqual(validateDirectCommitPayload(payload).issues, [])
  const rows = mapDirectPayloadToTimelineRows(payload)
  assert.equal(rows.length, 3)
  assert.equal(rows[0].source_url, 'https://example.com/source')
  assert.equal(rows[0].sort_order, 0)
  assert.equal(rows[2].sort_order, 2)
})

test('accepts six ordered fiction events and maps the timeline union', () => {
  const payload = validFictionPayload()
  assert.deepEqual(validateDirectCommitPayload(payload).issues, [])
  const rows = mapDirectPayloadToTimelineRows(payload)
  assert.equal(rows[0].year, null)
  assert.equal(rows[0].sequence_label, '1막')
  assert.equal(rows[5].sort_order, 6)
})

test('rejects extra keys at the top, profile, source, event, and conflict levels', () => {
  const payload = validLifePayload()
  payload.extra = true
  payload.profileSnapshot.extra = true
  payload.sources[0].extra = true
  payload.events[0].extra = true
  payload.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1980-01-02',
    evidenceValue: '1980-01-03',
    message: description('충돌'),
    messageEn: descriptionEn('conflict'),
    evidenceRefs: ['S1'],
    extra: true,
  }]
  assert.equal(codes(payload).filter((code) => code === 'EXTRA_KEY').length, 5)
})

test('enforces life 3-30 and fiction 6-12 event counts', () => {
  const life = validLifePayload()
  life.events = life.events.slice(0, 2)
  assert.ok(codes(life).includes('EVENT_COUNT'))
  const fiction = validFictionPayload()
  fiction.events = fiction.events.slice(0, 5)
  assert.ok(codes(fiction).includes('EVENT_COUNT'))
})

test('enforces timeline union and chronological/sort order', () => {
  const life = validLifePayload()
  life.events[1].sequenceLabel = 'forbidden'
  life.events[1].year = 1979
  assert.ok(codes(life).includes('EXTRA_KEY'))
  assert.ok(codes(life).includes('EVENT_ORDER'))

  const fiction = validFictionPayload()
  fiction.events[0].year = 123
  fiction.events[1].sortOrder = 4
  assert.ok(codes(fiction).includes('EXTRA_KEY'))
  assert.ok(codes(fiction).includes('FICTION_SORT_SEQUENCE'))
})

test('enforces exact birth/death boundary against the claimed profile snapshot', () => {
  const payload = validLifePayload()
  payload.events[0].day = 3
  payload.events[2].kind = 'work'
  const result = codes(payload)
  assert.ok(result.includes('BIRTH_BOUNDARY'))
  assert.ok(result.includes('DEATH_BOUNDARY'))
})

test('a valid sourced date conflict exempts only its exact life boundary', () => {
  const payload = validLifePayload()
  payload.events[0].kind = 'work'
  payload.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1980-01-02',
    evidenceValue: '1981-05',
    message: description('birth date conflict'),
    messageEn: descriptionEn('birth date conflict'),
    evidenceRefs: ['S1'],
  }]
  assert.deepEqual(validateDirectCommitPayload(payload).issues, [])

  payload.events[2].kind = 'work'
  assert.ok(codes(payload).includes('DEATH_BOUNDARY'))
})

test('invalid, dangling, or unrelated conflicts never bypass a date boundary', () => {
  const dangling = validLifePayload()
  dangling.events[0].kind = 'work'
  dangling.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1980-01-02',
    evidenceValue: '1981',
    message: description('dangling conflict'),
    messageEn: descriptionEn('dangling conflict'),
    evidenceRefs: ['missing'],
  }]
  const danglingCodes = codes(dangling)
  assert.ok(danglingCodes.includes('EVIDENCE_DANGLING'))
  assert.ok(danglingCodes.includes('BIRTH_BOUNDARY'))

  const stale = validLifePayload()
  stale.events[0].kind = 'work'
  stale.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1979',
    evidenceValue: '1981',
    message: description('stale conflict'),
    messageEn: descriptionEn('stale conflict'),
    evidenceRefs: ['S1'],
  }]
  const staleCodes = codes(stale)
  assert.ok(staleCodes.includes('PROFILE_CONFLICT_CURRENT_MISMATCH'))
  assert.ok(staleCodes.includes('BIRTH_BOUNDARY'))

  const falsePrecision = validLifePayload()
  falsePrecision.profileSnapshot.birthDate = '1980'
  falsePrecision.events[0].kind = 'work'
  falsePrecision.profileConflicts = [{
    field: 'birthDate',
    manifestValue: '1980-01-01',
    evidenceValue: '1981',
    message: description('false precision conflict'),
    messageEn: descriptionEn('false precision conflict'),
    evidenceRefs: ['S1'],
  }]
  const falsePrecisionCodes = codes(falsePrecision)
  assert.ok(falsePrecisionCodes.includes('PROFILE_CONFLICT_CURRENT_MISMATCH'))
  assert.ok(falsePrecisionCodes.includes('BIRTH_BOUNDARY'))

  const unrelated = validLifePayload()
  unrelated.events[0].kind = 'work'
  unrelated.profileConflicts = [{
    field: 'nicknameEn',
    manifestValue: 'Test Person',
    evidenceValue: 'Different Name',
    message: description('name conflict'),
    messageEn: descriptionEn('name conflict'),
    evidenceRefs: ['S1'],
  }]
  assert.ok(codes(unrelated).includes('BIRTH_BOUNDARY'))
})

test('profile date precision supports BCE/year-month and preserves unparseable DB text without invented boundaries', () => {
  const partial = validLifePayload()
  partial.profileSnapshot.birthDate = '-375-02'
  partial.profileSnapshot.deathDate = '2020-03'
  partial.events[0].year = -375
  partial.events[0].month = 2
  partial.events[0].day = 28
  partial.events[1].year = 1000
  partial.events[2].month = 3
  partial.events[2].day = 31
  assert.deepEqual(validateDirectCommitPayload(partial).issues, [])

  const circa = validLifePayload()
  circa.profileSnapshot.birthDate = 'c. 1980'
  circa.profileSnapshot.deathDate = 'between 2019 and 2021'
  circa.events[0].kind = 'work'
  circa.events[2].kind = 'work'
  assert.deepEqual(validateDirectCommitPayload(circa).issues, [])

  const blank = validLifePayload()
  blank.profileSnapshot.deathDate = '   '
  blank.events[2].kind = 'work'
  assert.ok(codes(blank).includes('PROFILE_DATE'))
})

test('living profiles accept non-death events and reject an invented death event', () => {
  const living = validLifePayload()
  living.profileSnapshot.deathDate = null
  living.events[2].kind = 'work'
  assert.deepEqual(validateDirectCommitPayload(living).issues, [])

  const inventedDeath = validLifePayload()
  inventedDeath.profileSnapshot.deathDate = null
  assert.ok(codes(inventedDeath).includes('UNKNOWN_DEATH_KIND'))
})

test('enforces claim snapshot shape and internal identity', () => {
  const payload = validLifePayload()
  delete payload.profileSnapshot.publicationStatus
  payload.profileSnapshot.id = '22222222-2222-2222-2222-222222222222'
  const result = codes(payload)
  assert.ok(result.includes('PROFILE_SNAPSHOT_KEY'))
  assert.ok(result.includes('PROFILE_SNAPSHOT_MISMATCH'))
})

test('rejects non-http sources, dangling evidence, bad sentence counts, and broken text', () => {
  const payload = validLifePayload()
  payload.sources[0].url = 'file:///tmp/source'
  payload.events[1].evidenceRefs = ['missing']
  payload.events[1].description = '한 문장뿐입니다.'
  payload.events[1].title = 'broken � title'
  const result = codes(payload)
  assert.ok(result.includes('SOURCE_URL'))
  assert.ok(result.includes('EVIDENCE_DANGLING'))
  assert.ok(result.includes('SENTENCE_COUNT'))
  assert.ok(result.includes('BROKEN_TEXT'))
})

test('accepts http query URLs while rejecting broken, non-http, and credential URLs', () => {
  const queryUrl = validLifePayload()
  queryUrl.sources[0].url = 'https://ctext.org/text.pl?if=en&node=602573'
  assert.deepEqual(validateDirectCommitPayload(queryUrl).issues, [])

  const broken = validLifePayload()
  broken.sources[0].url = 'https://example.com/broken-\uFFFD'
  assert.ok(codes(broken).includes('BROKEN_TEXT'))

  const nonHttp = validLifePayload()
  nonHttp.sources[0].url = 'ftp://example.com/source'
  assert.ok(codes(nonHttp).includes('SOURCE_URL'))

  const credentials = validLifePayload()
  credentials.sources[0].url = 'https://user:secret@example.com/source'
  assert.ok(codes(credentials).includes('URL_CREDENTIALS'))
})

test('blocked research is losslessly validated for fail --skip but rejected by commit', () => {
  const payload = validLifePayload()
  payload.researchStatus = 'blocked'
  payload.events = []
  payload.blockingIssues = [{
    code: 'IDENTITY',
    message: description('차단'),
    messageEn: descriptionEn('block'),
    evidenceRefs: ['S1'],
  }]
  assert.ok(codes(payload).includes('RESEARCH_STATUS'))
  assert.deepEqual(validateDirectBlockedPayload(payload).issues, [])

  payload.blockingIssues[0].evidenceRefs = ['missing']
  assert.ok(validateDirectBlockedPayload(payload).issues.some((issue) => issue.code === 'EVIDENCE_DANGLING'))

  payload.blockingIssues[0].evidenceRefs = ['S1']
  payload.profileConflicts = [{
    field: 'birthDate', manifestValue: '1980-01-02', evidenceValue: '1981',
    message: description('blocked conflict'), messageEn: descriptionEn('blocked conflict'), evidenceRefs: ['S1'],
  }]
  payload.applicationStatus = 'quarantined'
  payload.blockingIssues[0].resolution = {
    status: 'resolved',
    action: 'QUARANTINE_PROFILE',
    proposedValue: 'quarantined',
    precision: 'not-applicable',
    rationale: description('quarantine resolution'),
    rationaleEn: descriptionEn('quarantine resolution'),
    evidenceUrls: ['https://example.com/source?if=en&node=602573', 'https://independent.example/identity'],
    confidence: 'high',
    resolvedAt: '2026-08-10T03:30:00+09:00',
  }
  assert.deepEqual(validateDirectBlockedPayload(payload).issues, [])

  const missingApplicationStatus = structuredClone(payload)
  delete missingApplicationStatus.applicationStatus
  assert.ok(validateDirectBlockedPayload(missingApplicationStatus).issues.some(
    (issue) => issue.code === 'QUARANTINE_APPLICATION_STATUS_REQUIRED',
  ))
  const missingResolution = structuredClone(payload)
  delete missingResolution.blockingIssues[0].resolution
  assert.ok(validateDirectBlockedPayload(missingResolution).issues.some(
    (issue) => issue.code === 'QUARANTINE_RESOLUTION_REQUIRED',
  ))

  payload.blockingIssues[0].resolution.action = 'IGNORE'
  payload.blockingIssues[0].resolution.evidenceUrls.push('file:///tmp/not-evidence')
  payload.blockingIssues[0].resolution.extra = true
  const resolutionCodes = validateDirectBlockedPayload(payload).issues.map((issue) => issue.code)
  assert.ok(resolutionCodes.includes('BLOCKING_RESOLUTION_ENUM'))
  assert.ok(resolutionCodes.includes('SOURCE_URL'))
  assert.ok(resolutionCodes.includes('EXTRA_KEY'))

  const complete = validLifePayload()
  complete.applicationStatus = 'quarantined'
  assert.ok(codes(complete).includes('APPLICATION_STATUS_ON_COMPLETE'))
})

test('sentence counter supports Korean and English punctuation', () => {
  assert.equal(sentenceCount('첫 문장입니다. 둘째 문장입니다.'), 2)
  assert.equal(sentenceCount('First sentence. Second sentence! Third sentence?'), 3)
})
