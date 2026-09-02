import assert from 'node:assert/strict'
import {
  linkSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  assertExactSourceBookReadback,
  assertDistinctManifestReceiptPaths,
  assertSourceBookReceiptIsWritable,
  buildAtomicSourceBookApplySql,
  buildFictionSourceBookPlan,
  buildResolvedSourceBookRegistration,
  classifySourceBookApplyRecovery,
  parseFictionSourceBookManifest,
  type BookCatalogSnapshot,
  type ExactContentSnapshot,
  type ExternalBookEdition,
  type FictionSourceBookManifest,
  type StoredContentLocaleRow,
  type StoredContentRow,
  terminalSourceBookReceiptStatus,
  writeSourceBookReceiptAtomically,
} from './source-book-batch-contract'

// 운영 스키마의 contents.id/content_locales.content_id는 UUID 타입이 아닌 text다.
const CONTENT_ID = 'legacy:book:odyssey:ko'
const LEGACY_SOURCE_ERROR_CONTENT_ID = '170a4b02-966f-4fd6-a1c3-fe7658bf3c57'
const LEGACY_AFFILIATE_STRING_CONTENT_ID = 'legacy:affiliate-string:book'
const LEGACY_AFFILIATE_STRING = 'https://www.amazon.com/dp/legacy-string'
const JTTW_CANDIDATE_IDS = [
  '4297021e-d681-4225-8f91-a2d7c366652c',
  'efba79fb-72b4-4e51-9026-bfc112665551',
]
const JTTW_NEW_KO_ISBN = '9788932014043'
const JTTW_LEGACY_ISBNS = [
  { ko: '9791172570835', en: '9780226971476' },
  { ko: '9791172570927', en: '9780226971506' },
]

function isbn13(firstTwelve: string): string {
  const total = [...firstTwelve].reduce(
    (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  )
  return `${firstTwelve}${(10 - (total % 10)) % 10}`
}

const KO_ISBN = isbn13('978893746301')
const EN_ISBN = isbn13('978014044911')

function publishedInput(): unknown {
  return {
    work: {
      identity: 'homer/odyssey',
      title: 'Odyssey',
      creator: 'Homer',
      titleAliases: ['오디세이아', 'The Odyssey'],
      creatorAliases: ['호메로스'],
    },
    edition: { kind: 'full', scope: 'complete' },
    ko: {
      translationStatus: 'published',
      isbn: KO_ISBN,
      coupangUrl: 'https://link.coupang.com/a/example',
    },
    en: {
      isbn: EN_ISBN,
      amazonUrl: 'https://www.amazon.com/dp/0140449116',
    },
  }
}

function edition(
  source: 'kakao_book' | 'openlibrary',
  isbn: string,
  overrides: Partial<ExternalBookEdition> = {},
): ExternalBookEdition {
  const isKo = source === 'kakao_book'
  return {
    source,
    isbn,
    title: isKo ? '오디세이아' : 'The Odyssey',
    creator: isKo ? '호메로스' : 'Homer',
    thumbnailUrl: isKo
      ? `https://t1.daumcdn.net/lbook/${isbn}.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    publisher: isKo ? '민음사' : 'Penguin Classics',
    description: isKo ? '트로이 전쟁 뒤 오디세우스의 귀향을 다룬 서사시.' : 'Odysseus returns home after Troy.',
    sourceUrl: isKo ? 'https://search.daum.net/search?bookId=1' : `https://openlibrary.org/isbn/${isbn}`,
    descriptionSourceUrl: isKo ? 'https://search.daum.net/search?bookId=1' : 'https://openlibrary.org/works/OL1W',
    releaseDate: isKo ? '2022-01-01' : null,
    sourceMetadata: { isbn, source },
    ...overrides,
  }
}

function resolvedPublished() {
  const manifest = parseFictionSourceBookManifest(publishedInput())
  const resolved = buildResolvedSourceBookRegistration(manifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  return { manifest, resolved }
}

function storedContent(overrides: Partial<StoredContentRow> = {}): StoredContentRow {
  return {
    id: CONTENT_ID,
    type: 'BOOK',
    subtype: null,
    external_source: 'kakao_book',
    external_id: KO_ISBN,
    release_date: '2022-01-01',
    metadata: {},
    member_count: 0,
    celeb_count: 0,
    record_count: 0,
    created_at: '2026-08-31T00:00:00.000Z',
    ...overrides,
  }
}

function storedLocale(
  locale: 'ko' | 'en',
  source: ReturnType<typeof resolvedPublished>['resolved'],
  overrides: Partial<StoredContentLocaleRow> = {},
): StoredContentLocaleRow {
  const desired = source.locales.find((row) => row.locale === locale)!
  return {
    ...desired,
    content_id: CONTENT_ID,
    created_at: '2026-08-31T00:00:00.000Z',
    updated_at: '2026-08-31T00:00:00.000Z',
    ...overrides,
  }
}

function reviewedDistinctJttw(
  reviewedDistinctContentIds: string[],
): {
  manifest: FictionSourceBookManifest
  resolved: ReturnType<typeof resolvedPublished>['resolved']
  catalog: BookCatalogSnapshot
} {
  const manifest = parseFictionSourceBookManifest({
    work: {
      identity: 'wu-chengen/journey-to-the-west',
      title: 'Journey to the West',
      creator: "Wu Cheng'en",
      titleAliases: ['서유기', '서유기 1'],
      creatorAliases: ['오승은'],
    },
    edition: { kind: 'volume', scope: 'moonji-volume-1' },
    reviewedDistinctContentIds,
    ko: {
      translationStatus: 'published',
      isbn: JTTW_NEW_KO_ISBN,
      coupangUrl: 'https://link.coupang.com/a/jttw-volume-1',
    },
  })
  const resolved = buildResolvedSourceBookRegistration(manifest, {
    ko: edition('kakao_book', JTTW_NEW_KO_ISBN, {
      title: '서유기 1',
      creator: '오승은',
      publisher: '문학과지성사',
    }),
  })
  const contents = JTTW_CANDIDATE_IDS.map((id, index) => storedContent({
    id,
    external_id: JTTW_LEGACY_ISBNS[index].ko,
    metadata: {},
  }))
  const locales = JTTW_CANDIDATE_IDS.flatMap((contentId, index) => [
    storedLocale('ko', resolved, {
      content_id: contentId,
      title: '서유기',
      creator: '오승은',
      isbn: JTTW_LEGACY_ISBNS[index].ko,
      publisher: `Legacy Korean publisher ${index}`,
      affiliate_url: null,
      sources: {},
    }),
    storedLocale('ko', resolved, {
      content_id: contentId,
      locale: 'en',
      title: 'Journey to the West',
      creator: "Wu Cheng'en",
      isbn: JTTW_LEGACY_ISBNS[index].en,
      publisher: `Legacy English publisher ${index}`,
      affiliate_url: null,
      sources: {},
    }),
  ])
  return { manifest, resolved, catalog: { contents, locales } }
}

test('작품 정체성·본문 범위·판본 ISBN·locale 구매처를 엄격히 파싱한다', () => {
  const parsed = parseFictionSourceBookManifest(publishedInput())
  assert.equal(parsed.work.identity, 'homer/odyssey')
  assert.deepEqual(parsed.edition, { kind: 'full', scope: 'complete' })
  assert.equal(parsed.ko.translationStatus, 'published')
  assert.equal(parsed.en?.isbn, EN_ISBN)

  assert.throws(() => parseFictionSourceBookManifest({
    ...(publishedInput() as Record<string, unknown>),
    edition: { kind: 'full', scope: 'books-1-12' },
  }), /complete/)
  assert.throws(() => parseFictionSourceBookManifest({
    ...(publishedInput() as Record<string, unknown>),
    en: { isbn: EN_ISBN, amazonUrl: 'https://example.com/book' },
  }), /amazon URL/)
  assert.throws(() => parseFictionSourceBookManifest({
    ...(publishedInput() as Record<string, unknown>),
    ko: {
      translationStatus: 'published',
      isbn: KO_ISBN,
      coupangUrl: 'https://example.com/book',
    },
  }), /coupang URL/)
  assert.throws(() => parseFictionSourceBookManifest({
    ...(publishedInput() as Record<string, unknown>),
    reuseContentId: CONTENT_ID,
    reviewedDistinctContentIds: [LEGACY_SOURCE_ERROR_CONTENT_ID],
  }), /cannot be used together/)
})

test('번역본 없음 예외는 영문판·검증 근거를 요구하고 임의 한국어 제목 입력을 받지 않는다', () => {
  const base = publishedInput() as Record<string, unknown>
  assert.throws(() => parseFictionSourceBookManifest({
    ...base,
    en: undefined,
    ko: {
      translationStatus: 'verified_unavailable',
      creator: '호메로스',
      evidenceUrls: ['https://search.daum.net/search?q=odyssey'],
    },
  }), /en is required/)
  assert.throws(() => parseFictionSourceBookManifest({
    ...base,
    ko: {
      translationStatus: 'verified_unavailable',
      creator: '호메로스',
      title: '내가 만든 번역명',
      evidenceUrls: ['https://search.daum.net/search?q=odyssey'],
    },
  }), /unsupported key.*title/)
})

test('번역본 없음 예외의 ko locale은 원제·영문판 ISBN·표지를 그대로 공유한다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const manifest = parseFictionSourceBookManifest({
    ...raw,
    ko: {
      translationStatus: 'verified_unavailable',
      creator: '호메로스',
      evidenceUrls: ['https://search.daum.net/search?q=odyssey'],
    },
  })
  const en = edition('openlibrary', EN_ISBN)
  const registration = buildResolvedSourceBookRegistration(manifest, { en })
  const koLocale = registration.locales.find((row) => row.locale === 'ko')!
  const enLocale = registration.locales.find((row) => row.locale === 'en')!

  assert.equal(registration.representativeExternalSource, 'openlibrary')
  assert.equal(registration.representativeExternalId, EN_ISBN)
  assert.equal(koLocale.title, enLocale.title)
  assert.equal(koLocale.thumbnail_url, enLocale.thumbnail_url)
  assert.equal(koLocale.isbn, enLocale.isbn)
  assert.equal(koLocale.creator, '호메로스')
  assert.equal(koLocale.affiliate_url, null)
  assert.deepEqual(enLocale.affiliate_url?.map((link) => link.platform), ['amazon'])
})

test('한국어판은 Kakao, 영문판은 OpenLibrary 이외의 메타 출처를 거부한다', () => {
  const { manifest } = resolvedPublished()
  assert.throws(() => buildResolvedSourceBookRegistration(manifest, {
    ko: edition('openlibrary', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  }), /ko metadata source must be kakao_book/)
  assert.throws(() => buildResolvedSourceBookRegistration(manifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('kakao_book', EN_ISBN),
  }), /en metadata source must be openlibrary/)
})

test('관계없는 legacy BOOK의 array/scalar/null sources는 카탈로그 후보 탐색을 막지 않는다', () => {
  const { manifest, resolved } = resolvedPublished()
  const unrelatedIds = [LEGACY_SOURCE_ERROR_CONTENT_ID, 'legacy:scalar-sources', 'legacy:null-sources']
  const legacySources: unknown[] = [['openlibrary'], 'openlibrary', null]
  const unrelatedIsbn = isbn13('978030640615')
  const catalog: BookCatalogSnapshot = {
    contents: unrelatedIds.map((id) => storedContent({
      id,
      external_id: unrelatedIsbn,
      metadata: {},
    })),
    locales: unrelatedIds.map((id, index) => storedLocale('en', resolved, {
      content_id: id,
      title: `Unrelated legacy book ${index}`,
      creator: 'Another Author',
      isbn: unrelatedIsbn,
      sources: legacySources[index],
    })),
  }
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(plan.action, 'insert')
  assert.deepEqual(plan.candidateContentIds, [])
  assert.deepEqual(catalog.locales.map((locale) => locale.sources), legacySources)
})

test('관계없는 legacy BOOK의 string affiliate_url은 카탈로그 후보 탐색을 막지 않는다', () => {
  const { manifest, resolved } = resolvedPublished()
  const unrelatedIsbn = isbn13('978000000001')
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({
      id: LEGACY_AFFILIATE_STRING_CONTENT_ID,
      external_id: unrelatedIsbn,
      metadata: {},
    })],
    locales: [storedLocale('en', resolved, {
      content_id: LEGACY_AFFILIATE_STRING_CONTENT_ID,
      title: 'Unrelated legacy book with string affiliate',
      creator: 'Another Author',
      isbn: unrelatedIsbn,
      affiliate_url: LEGACY_AFFILIATE_STRING,
    })],
  }
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(plan.action, 'insert')
  assert.deepEqual(plan.candidateContentIds, [])
  assert.equal(catalog.locales[0].affiliate_url, LEGACY_AFFILIATE_STRING)
})

test('사람이 대조한 JTTW legacy 두 판본은 현재 후보 전부가 다른 ISBN일 때만 신규 volume insert를 허용한다', () => {
  const { manifest, resolved, catalog } = reviewedDistinctJttw(JTTW_CANDIDATE_IDS)
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)

  assert.equal(plan.action, 'insert')
  assert.deepEqual(plan.candidateContentIds, JTTW_CANDIDATE_IDS)
  assert.deepEqual(plan.reviewedDistinctContentIds, JTTW_CANDIDATE_IDS)
  assert.notEqual(plan.contentId, JTTW_CANDIDATE_IDS[0])
  assert.notEqual(plan.contentId, JTTW_CANDIDATE_IDS[1])
  for (const id of JTTW_CANDIDATE_IDS) {
    assert.deepEqual(plan.candidateReasons[id], ['en.title+creator', 'ko.title+creator'])
  }

  const sql = buildAtomicSourceBookApplySql(plan)
  const encodedPayload = sql.match(/INSERT INTO source_book_batch VALUES \(convert_from\(decode\('([^']+)'/u)?.[1]
  assert.ok(encodedPayload)
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8')) as {
    expectedCandidateIds: string[]
    reviewedDistinctContentIds: string[]
    reviewedDistinctCandidateFingerprints: Array<{
      id: string
      external_id: string | null
      locales: Array<{ locale: string; isbn: string | null }>
    }>
  }
  assert.deepEqual(payload.expectedCandidateIds, JTTW_CANDIDATE_IDS)
  assert.deepEqual(payload.reviewedDistinctContentIds, JTTW_CANDIDATE_IDS)
  assert.deepEqual(
    payload.reviewedDistinctCandidateFingerprints.map((candidate) => ({
      id: candidate.id,
      external_id: candidate.external_id,
      isbns: candidate.locales.map((locale) => locale.isbn),
    })),
    JTTW_CANDIDATE_IDS.map((id, index) => ({
      id,
      external_id: JTTW_LEGACY_ISBNS[index].ko,
      isbns: [JTTW_LEGACY_ISBNS[index].en, JTTW_LEGACY_ISBNS[index].ko],
    })),
  )
  assert.match(sql, /reviewed distinct candidates changed after preflight/)
})

test('reviewedDistinct insert 뒤 동일 manifest는 deterministic 자기 target을 자동 재사용한다', () => {
  const { manifest, resolved, catalog } = reviewedDistinctJttw(JTTW_CANDIDATE_IDS)
  const insertPlan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(insertPlan.action, 'insert')
  assert.ok(insertPlan.contentInsert)
  const insertedAt = '2026-08-31T01:00:00.000Z'
  const catalogAfterInsert: BookCatalogSnapshot = {
    contents: [
      ...catalog.contents,
      { ...insertPlan.contentInsert, created_at: insertedAt },
    ],
    locales: [
      ...catalog.locales,
      ...insertPlan.localeChanges.map((change): StoredContentLocaleRow => ({
        ...change.after,
        created_at: insertedAt,
        updated_at: insertedAt,
      })),
    ],
  }

  const reusePlan = buildFictionSourceBookPlan(manifest, resolved, catalogAfterInsert)
  assert.equal(reusePlan.action, 'reuse')
  assert.equal(reusePlan.contentId, insertPlan.contentId)
  assert.deepEqual(reusePlan.reviewedDistinctContentIds, JTTW_CANDIDATE_IDS)
  assert.deepEqual(reusePlan.localeChanges.map((change) => change.kind), ['unchanged'])
  assert.equal(reusePlan.contentInsert, null)
  assert.equal(reusePlan.contentUpdate, null)
  assert.deepEqual(
    reusePlan.candidateContentIds,
    [...JTTW_CANDIDATE_IDS, insertPlan.contentId].sort(),
  )

  const sql = buildAtomicSourceBookApplySql(reusePlan)
  const encodedPayload = sql.match(/INSERT INTO source_book_batch VALUES \(convert_from\(decode\('([^']+)'/u)?.[1]
  assert.ok(encodedPayload)
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8')) as {
    contentId: string
    contentInsert: unknown
    contentUpdate: unknown
    localeWrites: unknown[]
    reviewedDistinctContentIds: string[]
  }
  assert.equal(payload.contentId, insertPlan.contentId)
  assert.equal(payload.contentInsert, null)
  assert.equal(payload.contentUpdate, null)
  assert.deepEqual(payload.localeWrites, [])
  assert.deepEqual(payload.reviewedDistinctContentIds, JTTW_CANDIDATE_IDS)
})

test('reviewedDistinct deterministic 자기 target의 material 또는 ISBN이 달라지면 재사용하지 않는다', () => {
  const { manifest, resolved, catalog } = reviewedDistinctJttw(JTTW_CANDIDATE_IDS)
  const insertPlan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.ok(insertPlan.contentInsert)
  const insertedAt = '2026-08-31T01:00:00.000Z'
  const insertedContent = { ...insertPlan.contentInsert, created_at: insertedAt }
  const insertedLocales = insertPlan.localeChanges.map((change): StoredContentLocaleRow => ({
    ...change.after,
    created_at: insertedAt,
    updated_at: insertedAt,
  }))

  const materialConflict = buildFictionSourceBookPlan(manifest, resolved, {
    contents: [...catalog.contents, { ...insertedContent, external_source: 'openlibrary' }],
    locales: [...catalog.locales, ...insertedLocales],
  })
  assert.equal(materialConflict.action, 'conflict')
  assert.match(materialConflict.conflicts.join('\n'), /bibliographic material changed after insertion/)

  const changedIsbn = isbn13('978893201999')
  const isbnConflict = buildFictionSourceBookPlan(manifest, resolved, {
    contents: [...catalog.contents, insertedContent],
    locales: [
      ...catalog.locales,
      ...insertedLocales.map((locale) => ({ ...locale, isbn: changedIsbn })),
    ],
  })
  assert.equal(isbnConflict.action, 'conflict')
  assert.match(isbnConflict.conflicts.join('\n'), /ISBN differs from the requested edition/)
})

test('reviewedDistinctContentIds는 누락·현재 후보가 아닌 ID·비검토 후보를 허용하지 않는다', () => {
  const incomplete = reviewedDistinctJttw([JTTW_CANDIDATE_IDS[0]])
  const incompletePlan = buildFictionSourceBookPlan(incomplete.manifest, incomplete.resolved, incomplete.catalog)
  assert.equal(incompletePlan.action, 'conflict')
  assert.match(incompletePlan.conflicts.join('\n'), /current candidates were not reviewed.*efba79fb/u)

  const unknownTextId = 'legacy:book:jttw:not-a-current-candidate'
  const unmatched = reviewedDistinctJttw([...JTTW_CANDIDATE_IDS, unknownTextId])
  const unmatchedPlan = buildFictionSourceBookPlan(unmatched.manifest, unmatched.resolved, unmatched.catalog)
  assert.equal(unmatchedPlan.action, 'conflict')
  assert.match(unmatchedPlan.conflicts.join('\n'), /not current candidates.*legacy:book:jttw/u)
})

test('reviewedDistinctContentIds는 UUID가 아닌 실제 text content ID도 정확히 대조한다', () => {
  const textId = 'legacy:book:jttw:older-volume'
  const fixture = reviewedDistinctJttw([textId])
  const firstContent = { ...fixture.catalog.contents[0], id: textId }
  const firstLocales = fixture.catalog.locales
    .filter((locale) => locale.content_id === JTTW_CANDIDATE_IDS[0])
    .map((locale) => ({ ...locale, content_id: textId }))
  const plan = buildFictionSourceBookPlan(fixture.manifest, fixture.resolved, {
    contents: [firstContent],
    locales: firstLocales,
  })
  assert.equal(plan.action, 'insert')
  assert.deepEqual(plan.candidateContentIds, [textId])
  assert.deepEqual(plan.reviewedDistinctContentIds, [textId])
})

test('같은 ISBN이나 같은 fictionSource 작품·판본·범위 후보는 검토 목록으로도 waive할 수 없다', () => {
  const isbnFixture = reviewedDistinctJttw(JTTW_CANDIDATE_IDS)
  isbnFixture.catalog.contents[0] = {
    ...isbnFixture.catalog.contents[0],
    external_id: JTTW_NEW_KO_ISBN,
  }
  const isbnPlan = buildFictionSourceBookPlan(isbnFixture.manifest, isbnFixture.resolved, isbnFixture.catalog)
  assert.equal(isbnPlan.action, 'conflict')
  assert.match(isbnPlan.conflicts.join('\n'), /has an ISBN matching the requested edition/)

  const identityFixture = reviewedDistinctJttw(JTTW_CANDIDATE_IDS)
  identityFixture.catalog.contents[1] = {
    ...identityFixture.catalog.contents[1],
    metadata: {
      fictionSource: {
        workIdentity: identityFixture.manifest.work.identity,
        editionKind: identityFixture.manifest.edition.kind,
        textScope: identityFixture.manifest.edition.scope,
      },
    },
  }
  const identityPlan = buildFictionSourceBookPlan(
    identityFixture.manifest,
    identityFixture.resolved,
    identityFixture.catalog,
  )
  assert.equal(identityPlan.action, 'conflict')
  assert.match(identityPlan.conflicts.join('\n'), /same fictionSource work, edition kind, and scope/)
})

test('동일 작품·동일 본문 범위는 기존 contents와 정확한 locale을 재사용한다', () => {
  const { manifest, resolved } = resolvedPublished()
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({
      metadata: {
        fictionSource: {
          workIdentity: manifest.work.identity,
          editionKind: manifest.edition.kind,
          textScope: manifest.edition.scope,
        },
      },
    })],
    locales: [storedLocale('ko', resolved), storedLocale('en', resolved)],
  }
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(plan.action, 'reuse')
  assert.equal(plan.contentId, CONTENT_ID)
  assert.deepEqual(plan.localeChanges.map((change) => change.kind), ['unchanged', 'unchanged'])
  assert.equal(plan.contentInsert, null)
})

test('같은 완역 작품의 다른 출판사 판본은 contents를 복제하지 않고 locale 판본 충돌로 보고한다', () => {
  const { manifest, resolved } = resolvedPublished()
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({ external_id: isbn13('978893746999') })],
    locales: [storedLocale('ko', resolved, {
      isbn: isbn13('978893746999'),
      publisher: '다른 출판사',
      thumbnail_url: 'https://t1.daumcdn.net/lbook/other.jpg',
    })],
  }
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(plan.action, 'conflict')
  assert.equal(plan.contentId, CONTENT_ID)
  assert.match(plan.conflicts.join('\n'), /ko\.isbn belongs to a different edition/)
})

test('full/complete라도 ISBN·범위 메타 없는 legacy 제목 후보는 자동 재사용하지 않는다', () => {
  const { manifest, resolved } = resolvedPublished()
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({ external_id: null, metadata: {} })],
    locales: [storedLocale('ko', resolved, { isbn: null })],
  }
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(plan.action, 'conflict')
  assert.equal(plan.contentId, CONTENT_ID)
  assert.match(plan.conflicts.join('\n'), /no stored text scope/)
})

test('같은 작품이어도 축약본과 완역본은 저장된 본문 범위가 다르면 별도 contents를 허용한다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const abridgedManifest = parseFictionSourceBookManifest({
    ...raw,
    edition: { kind: 'abridged', scope: 'school-reader' },
  })
  const resolved = buildResolvedSourceBookRegistration(abridgedManifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({
      external_id: isbn13('978893746999'),
      metadata: {
        fictionSource: {
          workIdentity: abridgedManifest.work.identity,
          editionKind: 'full',
          textScope: 'complete',
        },
      },
    })],
    locales: [storedLocale('ko', resolved, { isbn: isbn13('978893746999') })],
  }
  const plan = buildFictionSourceBookPlan(abridgedManifest, resolved, catalog)
  assert.equal(plan.action, 'insert')
  assert.notEqual(plan.contentId, CONTENT_ID)
})

test('범위 메타가 없는 기존 비완역 후보는 명시적인 reuseContentId 전까지 중단한다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const manifest = parseFictionSourceBookManifest({
    ...raw,
    edition: { kind: 'retelling', scope: 'childrens-retelling' },
    ko: {
      translationStatus: 'published',
      isbn: KO_ISBN,
      coupangUrl: 'https://link.coupang.com/a/example',
    },
    en: undefined,
  })
  const resolved = buildResolvedSourceBookRegistration(manifest, {
    ko: edition('kakao_book', KO_ISBN),
  })
  const legacyLocale = storedLocale('ko', resolved, { isbn: null })
  const catalog = { contents: [storedContent({ external_id: null })], locales: [legacyLocale] }
  const ambiguous = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(ambiguous.action, 'conflict')
  assert.match(ambiguous.conflicts.join('\n'), /no stored text scope/)

  const explicit: FictionSourceBookManifest = { ...manifest, reuseContentId: CONTENT_ID }
  const reviewed = buildFictionSourceBookPlan(explicit, resolved, catalog)
  assert.equal(reviewed.action, 'reuse')
  assert.deepEqual(reviewed.localeChanges.map((change) => change.kind), ['update'])
  assert.deepEqual(reviewed.contentUpdate?.metadata.fictionSource, {
    workIdentity: manifest.work.identity,
    workTitle: manifest.work.title,
    workCreator: manifest.work.creator,
    editionKind: manifest.edition.kind,
    textScope: manifest.edition.scope,
    koTranslationStatus: 'published',
  })
  assert.equal(reviewed.expectedAfterMaterial?.content.metadata, reviewed.contentUpdate?.metadata)
})

test('explicit reuse는 기존 fictionSource의 NULL만 채우고 비-NULL 충돌값은 덮지 않는다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const manifest = parseFictionSourceBookManifest({ ...raw, reuseContentId: CONTENT_ID })
  const resolved = buildResolvedSourceBookRegistration(manifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({
      external_id: null,
      metadata: {
        legacyKey: 'preserve-me',
        fictionSource: { workIdentity: 'homer/iliad', editionKind: null, textScope: null },
      },
    })],
    locales: [storedLocale('ko', resolved, { isbn: null }), storedLocale('en', resolved)],
  }
  const plan = buildFictionSourceBookPlan(manifest, resolved, catalog)
  assert.equal(plan.action, 'conflict')
  assert.equal(plan.contentUpdate, null)
  assert.match(plan.conflicts.join('\n'), /workIdentity conflicts with explicit reuse/)
  assert.equal((plan.before.content?.metadata?.fictionSource as Record<string, unknown>).workIdentity, 'homer/iliad')
})

test('explicit reuse upgrades legacy per-field source markers to verified source URLs', () => {
  const raw = publishedInput() as Record<string, unknown>
  const baseManifest = parseFictionSourceBookManifest(raw)
  const resolved = buildResolvedSourceBookRegistration(baseManifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent()],
    locales: [
      storedLocale('ko', resolved, {
        sources: { primary: 'kakao_book', thumbnail: 'kakao_book' },
      }),
      storedLocale('en', resolved),
    ],
  }

  const automatic = buildFictionSourceBookPlan(baseManifest, resolved, catalog)
  assert.equal(automatic.action, 'conflict')
  assert.match(automatic.conflicts.join('\n'), /ko\.sources\.thumbnail differs/)

  const explicitManifest = parseFictionSourceBookManifest({ ...raw, reuseContentId: CONTENT_ID })
  const explicit = buildFictionSourceBookPlan(explicitManifest, resolved, catalog)
  assert.equal(explicit.action, 'reuse')
  const sources = explicit.localeChanges.find((change) => change.locale === 'ko')!.after.sources
  assert.deepEqual(sources, resolved.locales.find((locale) => locale.locale === 'ko')!.sources)
})

test('apply SQL은 외부 검색 없이 짧은 단일 트랜잭션·service_role·stale guard·exact readback을 사용한다', () => {
  const { manifest, resolved } = resolvedPublished()
  const plan = buildFictionSourceBookPlan(manifest, resolved, { contents: [], locales: [] })
  const sql = buildAtomicSourceBookApplySql(plan)

  assert.equal((sql.match(/\bBEGIN;/gu) ?? []).length, 1)
  assert.equal((sql.match(/\bCOMMIT;/gu) ?? []).length, 1)
  assert.match(sql, /SET LOCAL ROLE service_role/)
  assert.match(sql, /LOCK TABLE public\.contents, public\.content_locales/)
  assert.match(sql, /source_book_candidates \(id text PRIMARY KEY\)/)
  assert.match(sql, /candidates changed after preflight/)
  assert.match(sql, /material readback mismatch/)
  assert.doesNotMatch(sql, /https?:\/\//u)
  assert.doesNotMatch(sql, /::uuid|\bid uuid\b/u)
})

test('text content ID를 명시한 explicit reuse SQL은 metadata identity 백필도 text 비교로 수행한다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const manifest = parseFictionSourceBookManifest({ ...raw, reuseContentId: CONTENT_ID })
  assert.equal(manifest.reuseContentId, CONTENT_ID)
  const resolved = buildResolvedSourceBookRegistration(manifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  const plan = buildFictionSourceBookPlan(manifest, resolved, {
    contents: [storedContent({ external_id: null, metadata: { legacyKey: 'preserve-me' } })],
    locales: [storedLocale('ko', resolved, { isbn: null }), storedLocale('en', resolved)],
  })
  assert.equal(plan.action, 'reuse')
  assert.equal(plan.contentUpdate?.id, CONTENT_ID)
  assert.equal(plan.contentUpdate?.metadata.legacyKey, 'preserve-me')
  assert.ok(plan.contentUpdate?.metadata.fictionSource)

  const sql = buildAtomicSourceBookApplySql(plan)
  assert.match(sql, /UPDATE public\.contents AS content\s+SET metadata = row -> 'metadata'/u)
  assert.match(sql, /content\.id = row ->> 'id'/u)
  assert.doesNotMatch(sql, /::uuid|\bid uuid\b/u)
})

test('대상 locale의 legacy non-object sources는 explicit reuse update에서도 원형을 보존한다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const baseManifest = parseFictionSourceBookManifest(raw)
  const resolved = buildResolvedSourceBookRegistration(baseManifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  const metadata = {
    fictionSource: {
      workIdentity: baseManifest.work.identity,
      workTitle: baseManifest.work.title,
      workCreator: baseManifest.work.creator,
      editionKind: baseManifest.edition.kind,
      textScope: baseManifest.edition.scope,
      koTranslationStatus: 'published',
    },
  }
  const legacySources = ['openlibrary', { legacy: true }]
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({ id: LEGACY_SOURCE_ERROR_CONTENT_ID, metadata })],
    locales: [
      storedLocale('ko', resolved, { content_id: LEGACY_SOURCE_ERROR_CONTENT_ID }),
      storedLocale('en', resolved, {
        content_id: LEGACY_SOURCE_ERROR_CONTENT_ID,
        description: null,
        sources: legacySources,
      }),
    ],
  }

  const automatic = buildFictionSourceBookPlan(baseManifest, resolved, catalog)
  assert.equal(automatic.action, 'conflict')
  assert.match(automatic.conflicts.join('\n'), /legacy non-object JSON; set reuseContentId/)

  const explicitManifest = parseFictionSourceBookManifest({
    ...raw,
    reuseContentId: LEGACY_SOURCE_ERROR_CONTENT_ID,
  })
  const explicit = buildFictionSourceBookPlan(explicitManifest, resolved, catalog)
  assert.equal(explicit.action, 'reuse')
  const enChange = explicit.localeChanges.find((change) => change.locale === 'en')!
  assert.equal(enChange.kind, 'update')
  assert.deepEqual(enChange.before?.sources, legacySources)
  assert.deepEqual(enChange.after.sources, legacySources)

  const sql = buildAtomicSourceBookApplySql(explicit)
  const encodedPayload = sql.match(/INSERT INTO source_book_batch VALUES \(convert_from\(decode\('([^']+)'/u)?.[1]
  assert.ok(encodedPayload)
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8')) as {
    expectedBefore: { locales: Array<{ locale: string; sources: unknown }> }
    localeWrites: Array<{ locale: string; sources: unknown }>
  }
  assert.deepEqual(payload.expectedBefore.locales.find((locale) => locale.locale === 'en')?.sources, legacySources)
  assert.deepEqual(payload.localeWrites.find((locale) => locale.locale === 'en')?.sources, legacySources)
})

test('대상 locale의 legacy string affiliate_url은 explicit reuse에서만 검증된 링크로 교체한다', () => {
  const raw = publishedInput() as Record<string, unknown>
  const baseManifest = parseFictionSourceBookManifest(raw)
  const resolved = buildResolvedSourceBookRegistration(baseManifest, {
    ko: edition('kakao_book', KO_ISBN),
    en: edition('openlibrary', EN_ISBN),
  })
  const metadata = {
    fictionSource: {
      workIdentity: baseManifest.work.identity,
      workTitle: baseManifest.work.title,
      workCreator: baseManifest.work.creator,
      editionKind: baseManifest.edition.kind,
      textScope: baseManifest.edition.scope,
      koTranslationStatus: 'published',
    },
  }
  const catalog: BookCatalogSnapshot = {
    contents: [storedContent({ id: LEGACY_AFFILIATE_STRING_CONTENT_ID, metadata })],
    locales: [
      storedLocale('ko', resolved, { content_id: LEGACY_AFFILIATE_STRING_CONTENT_ID }),
      storedLocale('en', resolved, {
        content_id: LEGACY_AFFILIATE_STRING_CONTENT_ID,
        affiliate_url: LEGACY_AFFILIATE_STRING,
      }),
    ],
  }

  const automatic = buildFictionSourceBookPlan(baseManifest, resolved, catalog)
  assert.equal(automatic.action, 'conflict')
  assert.match(automatic.conflicts.join('\n'), /affiliate_url is legacy non-link-array JSON; set reuseContentId/)

  const explicitManifest = parseFictionSourceBookManifest({
    ...raw,
    reuseContentId: LEGACY_AFFILIATE_STRING_CONTENT_ID,
  })
  const explicit = buildFictionSourceBookPlan(explicitManifest, resolved, catalog)
  assert.equal(explicit.action, 'reuse')
  const enChange = explicit.localeChanges.find((change) => change.locale === 'en')!
  assert.equal(enChange.kind, 'update')
  assert.equal(enChange.before?.affiliate_url, LEGACY_AFFILIATE_STRING)
  assert.deepEqual(enChange.after.affiliate_url, [{
    platform: 'amazon',
    url: 'https://www.amazon.com/dp/0140449116',
  }])

  const sql = buildAtomicSourceBookApplySql(explicit)
  const encodedPayload = sql.match(/INSERT INTO source_book_batch VALUES \(convert_from\(decode\('([^']+)'/u)?.[1]
  assert.ok(encodedPayload)
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8')) as {
    expectedBefore: { locales: Array<{ locale: string; affiliate_url: unknown }> }
    localeWrites: Array<{ locale: string; affiliate_url: unknown }>
  }
  assert.equal(
    payload.expectedBefore.locales.find((locale) => locale.locale === 'en')?.affiliate_url,
    LEGACY_AFFILIATE_STRING,
  )
  assert.deepEqual(
    payload.localeWrites.find((locale) => locale.locale === 'en')?.affiliate_url,
    [{ platform: 'amazon', url: 'https://www.amazon.com/dp/0140449116' }],
  )
})

test('트랜잭션 readback과 post-commit readback은 timestamp를 포함한 모든 선택 컬럼이 같아야 한다', () => {
  const { resolved } = resolvedPublished()
  const snapshot = {
    content: storedContent(),
    locales: [storedLocale('ko', resolved)],
  }
  assert.doesNotThrow(() => assertExactSourceBookReadback(snapshot, structuredClone(snapshot)))
  assert.throws(() => assertExactSourceBookReadback(snapshot, {
    ...structuredClone(snapshot),
    locales: [{ ...snapshot.locales[0], updated_at: '2026-08-31T00:00:01.000Z' }],
  }), /post-commit/)
})

test('executor 증거에 따라 timeout+before는 unknown, nonzero+before는 rollback, timeout+after는 applied로 판정한다', () => {
  const { manifest, resolved } = resolvedPublished()
  const plan = buildFictionSourceBookPlan(manifest, resolved, { contents: [], locales: [] })
  assert.ok(plan.expectedAfterMaterial)
  const timestamp = '2026-08-31T02:00:00.000Z'
  const applied: ExactContentSnapshot = {
    content: { ...plan.expectedAfterMaterial.content, created_at: timestamp },
    locales: plan.expectedAfterMaterial.locales.map((locale): StoredContentLocaleRow => ({
      ...locale,
      created_at: timestamp,
      updated_at: timestamp,
    })),
  }
  const timeoutEvidence = { rollbackConfirmed: false }
  const confirmedNonzeroEvidence = { rollbackConfirmed: true }
  assert.equal(
    classifySourceBookApplyRecovery(plan, applied, timeoutEvidence),
    'applied-after-recovery',
  )
  assert.equal(
    classifySourceBookApplyRecovery(plan, plan.before, timeoutEvidence),
    'commit-unknown',
  )
  assert.equal(
    classifySourceBookApplyRecovery(plan, plan.before, confirmedNonzeroEvidence),
    'rolled-back',
  )
  assert.equal(classifySourceBookApplyRecovery(plan, {
    ...applied,
    content: { ...applied.content!, external_id: isbn13('978000000888') },
  }, confirmedNonzeroEvidence), 'commit-unknown')
})

test('manifest와 receipt는 Windows casefold 및 stat same-file 기준으로 같은 파일을 거부한다', () => {
  assert.throws(() => assertDistinctManifestReceiptPaths(
    'C:\\Temp\\JTTW.Manifest.JSON',
    'c:\\temp\\jttw.manifest.json',
  ), /must differ/)

  const directory = mkdtempSync(join(tmpdir(), 'source-book-path-test-'))
  const manifest = join(directory, 'manifest.json')
  const hardlinkReceipt = join(directory, 'receipt-hardlink.json')
  try {
    writeFileSync(manifest, '{}\n', 'utf8')
    linkSync(manifest, hardlinkReceipt)
    assert.throws(
      () => assertDistinctManifestReceiptPaths(manifest, hardlinkReceipt),
      /same file|resolves to the manifest/u,
    )
    assert.doesNotThrow(() => assertDistinctManifestReceiptPaths(
      manifest,
      join(directory, 'new-receipt.json'),
    ))
  } finally {
    assert.match(directory, /source-book-path-test-/u)
    rmSync(directory, { recursive: true, force: true })
  }
})

test('terminal 성공 receipt는 덮어쓰지 않고 receipt 기록은 temp+atomic rename으로 교체한다', () => {
  const directory = mkdtempSync(join(tmpdir(), 'source-book-receipt-test-'))
  const receipt = join(directory, 'book.receipt.json')
  try {
    writeFileSync(receipt, '{"status":"dry-run-complete"}\n', 'utf8')
    assert.doesNotThrow(() => assertSourceBookReceiptIsWritable(receipt))
    writeSourceBookReceiptAtomically(receipt, { status: 'applied', databaseWrites: 2 })
    assert.deepEqual(JSON.parse(readFileSync(receipt, 'utf8')), {
      status: 'applied',
      databaseWrites: 2,
    })
    assert.deepEqual(readdirSync(directory), ['book.receipt.json'])
    assert.equal(terminalSourceBookReceiptStatus({ status: 'applied' }), 'applied')
    assert.equal(
      terminalSourceBookReceiptStatus({ status: 'applied-after-recovery' }),
      'applied-after-recovery',
    )
    assert.throws(
      () => assertSourceBookReceiptIsWritable(receipt),
      /pass --receipt with a new path/,
    )
  } finally {
    assert.match(directory, /source-book-receipt-test-/u)
    rmSync(directory, { recursive: true, force: true })
  }
})
