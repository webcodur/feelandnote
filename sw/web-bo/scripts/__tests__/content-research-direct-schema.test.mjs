import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertContentResearchCommitPayload,
  canonicalContentResearchIsbn,
  classifyContentResearchPayload,
  validateContentResearchCommitPayload,
} from '../lib/content-research-direct-schema.mjs'

const CELEB_ID = '11111111-1111-1111-1111-111111111111'

function source(overrides = {}) {
  return {
    url: 'https://example.com/interview',
    sourceTier: 'primary',
    sourceKind: 'interview',
    accessStatus: 'accessible',
    supportsCandidate: true,
    title: 'Interview',
    notes: 'The named work is stated directly by the subject.',
    checkedAt: '2026-08-10T08:00:00+09:00',
    ...overrides,
  }
}

function locale(externalSource, overrides = {}) {
  return {
    locale: 'ko',
    title: '검증된 한국어판',
    creator: 'Author',
    thumbnailUrl: 'https://example.com/cover.jpg',
    description: null,
    isbn: '9788932917245',
    publisher: 'Publisher',
    verified: true,
    sources: { primary: externalSource },
    ...overrides,
  }
}

function eligibleBook() {
  return {
    candidateKey: 'book-9788932917245',
    decision: 'eligible',
    title: 'Verified Book',
    creator: 'Author',
    evidenceSummary: 'The subject explicitly said that they read this exact edition.',
    rejectionReason: null,
    content: {
      type: 'BOOK',
      externalSource: 'kakao_book',
      externalId: '9788932917245',
      subtype: 'book',
      releaseDate: '2015-01-01',
      metadata: {},
      locales: [locale('kakao_book')],
    },
    sources: [source()],
  }
}

function scope(contentType, candidates = []) {
  return {
    contentType,
    status: 'completed',
    searchNotes: `Completed a source-backed ${contentType} search with identity-safe queries.`,
    scopeSources: [source({
      url: `https://example.com/${contentType.toLowerCase()}-scope`,
      supportsCandidate: candidates.length > 0,
    })],
    candidates,
  }
}

export function validContentResearchPayload() {
  return {
    profileSnapshot: {
      id: CELEB_ID,
      slug: 'worker-test',
      nickname: '작업자 시험',
      nicknameEn: 'Worker Test',
      profession: 'writer',
      nationality: 'KR',
      birthDate: '1980',
      deathDate: null,
      wikidataQid: null,
      publicationStatus: 'inactive',
      celebTier: 'light',
    },
    nameVariants: ['작업자 시험', 'Worker Test'],
    homonymNotes: '공식 프로필의 직군과 생년을 대조해 동명이인을 제외하고 신원을 확인했다.',
    summary: '네 유형을 모두 조사했으며 도서 한 권만 직접 감상 근거와 판본 메타를 통과했다.',
    scopes: [
      scope('BOOK', [eligibleBook()]),
      scope('VIDEO'),
      scope('GAME'),
      scope('MUSIC'),
    ],
  }
}

function codes(payload) {
  return validateContentResearchCommitPayload(payload).issues.map((value) => value.code)
}

test('accepts one exact four-scope payload and classifies a non-MUSIC commit', () => {
  const payload = validContentResearchPayload()
  assert.deepEqual(validateContentResearchCommitPayload(payload), { valid: true, issues: [] })
  assert.deepEqual(classifyContentResearchPayload(payload), {
    eligible: 1,
    musicEligible: 0,
    nonMusicEligible: 1,
    musicOnlyDeferred: false,
    confirmedEmptyCandidate: false,
  })
  assert.equal(assertContentResearchCommitPayload(payload), payload)
})

test('requires exact profile/payload keys, all four scopes and homonym identity data', () => {
  const payload = validContentResearchPayload()
  payload.extra = true
  payload.profileSnapshot.contentResearchStatus = 'open'
  payload.nameVariants = ['Worker Test']
  payload.homonymNotes = '   '
  payload.scopes.pop()
  const result = codes(payload)
  assert.ok(result.includes('EXACT_KEYS'))
  assert.ok(result.includes('NAME_VARIANT_NICKNAME'))
  assert.ok(result.includes('HOMONYM_NOTES'))
  assert.ok(result.includes('SCOPES'))
})

test('forbids unresolved candidates and accepts rejected candidates only with evidence and reason', () => {
  const payload = validContentResearchPayload()
  const candidate = payload.scopes[1].candidates = [{
    candidateKey: 'video-unresolved',
    decision: 'unresolved',
    title: 'Possible Film',
    creator: null,
    evidenceSummary: null,
    rejectionReason: null,
    content: null,
    sources: [source()],
  }]
  assert.ok(codes(payload).includes('UNRESOLVED_FORBIDDEN'))

  candidate[0].decision = 'rejected'
  candidate[0].evidenceSummary = 'The result concerns a namesake rather than the claimed subject.'
  candidate[0].rejectionReason = 'The identity does not match the claimed celebrity.'
  assert.deepEqual(validateContentResearchCommitPayload(payload).issues, [])
})

test('eligible findings require usable primary evidence and the exact provider for their type', () => {
  const payload = validContentResearchPayload()
  const candidate = payload.scopes[0].candidates[0]
  candidate.sources[0].sourceTier = 'secondary'
  candidate.content.externalSource = 'google_books'
  candidate.content.locales[0].sources.primary = 'google_books'
  const result = codes(payload)
  assert.ok(result.includes('ELIGIBLE_PRIMARY_SOURCE'))
  assert.ok(result.includes('EXTERNAL_SOURCE'))
})

test('enforces Kakao/OpenLibrary ISBN locale, TMDB, IGDB and iTunes external ID policy', () => {
  const payload = validContentResearchPayload()
  const book = payload.scopes[0].candidates[0].content
  book.externalSource = 'openlibrary'
  book.externalId = '9780140328721'
  book.metadata = { languages: ['eng'] }
  book.locales = [locale('openlibrary', {
    locale: 'en', title: 'Verified English Edition', isbn: '0-140-32872-6',
  })]
  assert.deepEqual(validateContentResearchCommitPayload(payload).issues, [])

  book.externalId = '9780140328720'
  assert.ok(codes(payload).includes('EXTERNAL_ID_FORMAT'))

  const musicOnly = validContentResearchPayload()
  musicOnly.scopes[0].candidates = []
  musicOnly.scopes[3].candidates = [{
    ...eligibleBook(),
    candidateKey: 'music-itunes-12345',
    title: 'Verified Track',
    creator: 'Artist',
    content: {
      type: 'MUSIC',
      externalSource: 'itunes',
      externalId: 'itunes-12345',
      subtype: 'song',
      releaseDate: '2020-01-01',
      metadata: {},
      locales: [locale('itunes', { isbn: null, title: 'Verified Track' })],
    },
  }]
  assert.deepEqual(validateContentResearchCommitPayload(musicOnly).issues, [])
  assert.equal(classifyContentResearchPayload(musicOnly).musicOnlyDeferred, true)
})

test('rejects bot-only scope evidence, hidden secrets and profile snapshot drift', () => {
  const payload = validContentResearchPayload()
  payload.scopes[2].scopeSources[0].accessStatus = 'bot_blocked'
  payload.scopes[0].candidates[0].content.metadata.apiKey = 'must-not-persist'
  const expected = structuredClone(payload.profileSnapshot)
  expected.nickname = 'Different Person'
  const result = validateContentResearchCommitPayload(payload, expected).issues.map((value) => value.code)
  assert.ok(result.includes('SCOPE_SOURCE_ACCESS'))
  assert.ok(result.includes('SECRET_KEY'))
  assert.ok(result.includes('PROFILE_SNAPSHOT_MISMATCH'))
})

test('validates ISBN-10/13 checksums and requires the provider locale to identify the same edition', () => {
  assert.equal(canonicalContentResearchIsbn('0-140-32872-6'), '9780140328721')
  assert.equal(canonicalContentResearchIsbn('978-0-140-32872-1'), '9780140328721')
  assert.equal(canonicalContentResearchIsbn('0-140-32872-7'), null)
  assert.equal(canonicalContentResearchIsbn('978-0-140-32872-0'), null)

  const payload = validContentResearchPayload()
  const book = payload.scopes[0].candidates[0].content
  book.externalSource = 'openlibrary'
  book.externalId = '9780140328721'
  book.metadata = { languages: ['eng'] }
  book.locales = [locale('openlibrary', {
    locale: 'en', isbn: '9788932917245', title: 'A different valid edition',
  })]
  assert.ok(codes(payload).includes('BOOK_ISBN_EDITION_MISMATCH'))

  book.locales[0].isbn = '9780140328720'
  assert.ok(codes(payload).includes('BOOK_ISBN'))
})

test('requires eng language metadata for OpenLibrary and verified locale provider provenance', () => {
  const payload = validContentResearchPayload()
  const book = payload.scopes[0].candidates[0].content
  book.externalSource = 'openlibrary'
  book.externalId = '9780140328721'
  book.metadata = { languages: ['fra'] }
  book.locales = [locale('openlibrary', {
    locale: 'en', isbn: '9780140328721', title: 'English edition',
  })]
  assert.ok(codes(payload).includes('OPENLIBRARY_LANGUAGE'))

  book.metadata.languages = ['eng']
  book.locales[0].verified = false
  book.locales[0].sources = {}
  const invalid = codes(payload)
  assert.ok(invalid.includes('LOCALE_VERIFIED'))
  assert.ok(invalid.includes('LOCALE_SOURCES'))

  book.locales[0].verified = true
  book.locales[0].sources = { primary: 'kakao_book' }
  assert.ok(codes(payload).includes('LOCALE_PRIMARY_SOURCE'))
})

test('binds VIDEO, GAME and MUSIC locale provenance to their only allowed providers', () => {
  const cases = [
    ['VIDEO', 'tmdb', 'tmdb-movie-123'],
    ['GAME', 'igdb', 'igdb-456'],
    ['MUSIC', 'itunes', 'itunes-789'],
  ]
  for (const [contentType, provider, externalId] of cases) {
    const payload = validContentResearchPayload()
    payload.scopes[0].candidates = []
    const target = payload.scopes.find((scopeValue) => scopeValue.contentType === contentType)
    target.candidates = [{
      ...eligibleBook(),
      candidateKey: `${contentType.toLowerCase()}-${externalId}`,
      content: {
        type: contentType,
        externalSource: provider,
        externalId,
        subtype: null,
        releaseDate: null,
        metadata: {},
        locales: [locale(provider, { isbn: null })],
      },
    }]
    assert.deepEqual(validateContentResearchCommitPayload(payload).issues, [], contentType)
    target.candidates[0].content.locales[0].sources.primary = 'wrong_provider'
    assert.ok(codes(payload).includes('LOCALE_PRIMARY_SOURCE'), contentType)
  }
})

test('forbids separator-insensitive secret keys and durable secret values', () => {
  const payload = validContentResearchPayload()
  const metadata = payload.scopes[0].candidates[0].content.metadata
  metadata.clientSecret = 'hidden'
  metadata.access_token = 'hidden'
  metadata.serviceRole = 'hidden'
  metadata.trace = 'Bearer durable-token'
  metadata.reference = 'sb_secret_1234567890abcdef'
  metadata.assignment = 'accessToken=durable-token'
  metadata.endpoint = 'postgresql://worker:durable-password@example.com/db'
  const result = codes(payload)
  assert.ok(result.filter((code) => code === 'SECRET_KEY').length >= 3)
  assert.ok(result.includes('SECRET_VALUE'))
})

test('requires exact boolean supportsCandidate evidence for ledger persistence', () => {
  const payload = validContentResearchPayload()
  payload.scopes[0].candidates[0].sources[0].supportsCandidate = 'true'
  const invalid = codes(payload)
  assert.ok(invalid.includes('BOOLEAN'))
  assert.ok(invalid.includes('ELIGIBLE_PRIMARY_SOURCE'))

  delete payload.scopes[0].scopeSources[0].supportsCandidate
  assert.ok(codes(payload).includes('EXACT_KEYS'))
})

test('rejects Unicode and oversized object keys recursively before fingerprinting', () => {
  const payload = validContentResearchPayload()
  payload.scopes[0].candidates[0].content.metadata['한글키'] = 'value'
  payload.scopes[0].candidates[0].content.metadata['x'.repeat(129)] = 'value'
  const invalid = codes(payload)
  assert.equal(invalid.filter((code) => code === 'OBJECT_KEY_ASCII').length, 2)
})

test('enforces exact text-or-null types and literal null for eligible rejectionReason', () => {
  const payload = validContentResearchPayload()
  const candidate = payload.scopes[0].candidates[0]
  payload.profileSnapshot.slug = false
  candidate.creator = 7
  candidate.rejectionReason = ''
  candidate.content.subtype = 3
  candidate.content.locales[0].description = {}
  candidate.sources[0].title = 4
  const invalid = codes(payload)
  assert.ok(invalid.filter((code) => code === 'NULLABLE_TEXT').length >= 5)
  assert.ok(invalid.includes('REJECTION_REASON'))
})

test('rejects duplicate trimmed name variants', () => {
  const payload = validContentResearchPayload()
  payload.nameVariants.push(` ${payload.profileSnapshot.nicknameEn} `)
  assert.ok(codes(payload).includes('NAME_VARIANT_DUPLICATE'))
})

test('source URLs require HTTPS, ASCII FQDN authority and a valid optional port', () => {
  const invalidUrls = [
    'http://example.com/interview',
    'https://localhost/interview',
    'https://127.0.0.1/interview',
    'https://[::1]/interview',
    'https://user@example.com/interview',
    'https://example.com:0/interview',
    'https://example.com:65536/interview',
    'https://éxample.com/interview',
    'https://example.123/interview',
    'https://example/interview',
    'https://example.com/a b',
    'https://example.com/a\u00a0b',
  ]
  for (const url of invalidUrls) {
    const payload = validContentResearchPayload()
    payload.scopes[0].scopeSources[0].url = url
    assert.ok(codes(payload).includes('SOURCE_URL'), url)
  }

  const payload = validContentResearchPayload()
  payload.scopes[0].scopeSources[0].url = 'HTTPS://xn--bcher-kva.example:8443/path?q=1#fragment'
  assert.deepEqual(validateContentResearchCommitPayload(payload).issues, [])
})

test('profile snapshot equality follows JSON object semantics rather than insertion order', () => {
  const payload = validContentResearchPayload()
  const reorderedSnapshot = Object.fromEntries(Object.entries(payload.profileSnapshot).reverse())
  assert.deepEqual(validateContentResearchCommitPayload(payload, reorderedSnapshot).issues, [])
})

test('eligible locales must be verified rather than merely boolean-shaped', () => {
  const payload = validContentResearchPayload()
  payload.scopes[0].candidates[0].content.locales[0].verified = false
  assert.ok(codes(payload).includes('LOCALE_VERIFIED'))
})
