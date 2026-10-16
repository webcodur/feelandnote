import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as localeText from '../../lib/utils/content-locale-text'
import { applyContentBookEdition } from '../../lib/books/contentEdition'
import { pickPurchaseEdition } from '../figure-books/figureBookLocale'
import * as bookDescription from '../../lib/utils/book-description'

const require = createRequire(import.meta.url)
const id = '47b7b3d9-ebe8-4d39-a04c-c3f5c0b0d026'

function load<T>(file: string, mocks: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', compiled)((key: string) => mocks[key] ?? require(key), loaded, loaded.exports)
  return loaded.exports as T
}

test('book detail selects an available edition when the requested language has none, keeping introduction and purchase in that edition', async () => {
  const english = { id: 46591, title: 'Ernest Hemingway', creator: 'Mary V. Dearborn', isbn: '9780525563617',
    publisher: 'Vintage', thumbnailUrl: 'https://example.test/english-cover', description: 'English introduction',
    bookIntroduction: { isbn: '9780525563617', source: 'OPEN', sourceUrl: 'https://openlibrary.org/books/OL1M' },
    sortOrder: 0, purchaseUrl: null, platform: null }
  const korean = { ...english, id: 46592, title: '한국어 판본', isbn: '9788991290808',
    description: '한국어 소개', bookIntroduction: null }
  let koreanAvailable = false
  let englishAvailable = true
  const introCalls: unknown[][] = []
  const row = { id, type: 'BOOK', external_id: 'old-isbn', metadata: {}, figure_book_contents: [{ content_id: id }],
    content_locales: [{ locale: 'en', title: english.title, isbn: english.isbn }] }
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row, error: null }) }
  const api = load<{ getPublicContentInfo: (id: string, locale: string) => Promise<Record<string, unknown>> }>('./getContentDetail.ts', {
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/db/server': {}, './getContentById': {}, './fetchContentMetadata': {}, './getReviewFeed': {}, '@/actions/user': {},
    '@/actions/figure-books/getFigureBooks': {}, '@/actions/library/curated': {}, 'next-intl/server': {},
    '@/actions/figure-books/figureBookEditions': { loadFigureBookEditions: async (_db: unknown, _ids: string[], locale: string) =>
      new Map([[id, locale === 'en' ? englishAvailable ? [english] : [] : koreanAvailable ? [korean] : []]]) },
    '@/actions/figure-books/figureBookLocale': { pickPurchaseEdition },
    '@/lib/developer-mode': { isDeveloperMode: () => false },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read(), throwOnQueryError: () => {} },
    '@/lib/utils/content-locale': { CL_SELECT: '*', flattenLocales: () => ({ title: english.title, title_badge: 'no-ko' }) },
    '@/lib/utils/content-locale-text': localeText,
    '@/lib/utils/book-description': { resolveBookIsbn: (_locale: string, edition: string) => edition },
    '@/lib/books/contentEdition': { applyContentBookEdition }, '@/lib/books/amazonBookSearch': {},
    './fetchBookMetadata': { getBookIntroduction: async (...args: unknown[]) => { introCalls.push(args); return 'Fetched English introduction' } },
  })
  const fallback = await api.getPublicContentInfo(id, 'ko')
  assert.equal(fallback.purchaseEditionId, english.id)
  assert.equal(fallback.editionLocale, 'en')
  assert.equal(fallback.titleBadge, null)
  assert.equal(fallback.thumbnail, english.thumbnailUrl)
  assert.equal((fallback.metadata as Record<string, unknown>).isbn, english.isbn)
  assert.equal(fallback.description, 'Fetched English introduction')
  assert.equal(introCalls[0][1], 'en')
  koreanAvailable = true
  const preferred = await api.getPublicContentInfo(id, 'ko')
  assert.equal(preferred.purchaseEditionId, korean.id)
  assert.equal(preferred.editionLocale, 'ko')
  assert.equal(preferred.description, korean.description)
  assert.equal(introCalls.length, 1)
  englishAvailable = false
  const reverseFallback = await api.getPublicContentInfo(id, 'en')
  assert.equal(reverseFallback.purchaseEditionId, korean.id)
  assert.equal(reverseFallback.editionLocale, 'ko')
  assert.equal((reverseFallback.metadata as Record<string, unknown>).isbn, korean.isbn)
  assert.equal(reverseFallback.description, korean.description)
})

test('선정 제외 작품의 상세와 기록은 유지하며 구매 fallback만 막고 정상 다른 언어 판본은 허용한다', async () => {
  const figureBook = { workTitle: '유아용 원작', workCreator: '확인된 작가', workSelectionEvidence: [{
    method: 'independent_work_selection_review', content_id: id, work_title: '유아용 원작', work_creator: '확인된 작가',
    reason: 'children_picture', source_url: 'https://publisher.example/original-picture-book', explanation: '실제 출판사의 대상 독자와 본문을 대조하여 유아 전용 창작 그림책으로 확인했다.' }] }
  const exact = { locale: 'ko', title: '유아용 원작', creator: '확인된 작가', isbn: null as string | null, sources: { primary: 'kakao_book' } as Record<string, unknown>,
    affiliate_url: [{ platform: 'coupang', url: 'https://link.coupang.com/a/saved' }] }
  const row = { id, type: 'BOOK', external_id: 'saved-work', metadata: { figureBook } as Record<string, unknown>,
    content_locales: [exact], figure_book_contents: [] }
  let catalog = false
  let english: Record<string, unknown>[] = []
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row, error: null }) }
  const api = load<{ getInitialPublicContentInfo: (id: string, locale: string) => Promise<Record<string, unknown>> }>('./getContentDetail.ts', {
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/db/server': {}, './getContentById': {}, './fetchContentMetadata': {}, './getReviewFeed': {}, '@/actions/user': {},
    '@/actions/figure-books/getFigureBooks': {}, '@/actions/library/curated': {}, 'next-intl/server': {},
    '@/actions/figure-books/figureBookEditions': { loadFigureBookEditions: async (_db: unknown, _ids: unknown, locale: string) =>
      catalog ? new Map([[id, locale === 'en' ? english : []]]) : new Map() },
    '@/actions/figure-books/figureBookLocale': { pickPurchaseEdition },
    '@/lib/developer-mode': { isDeveloperMode: () => false },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read(), throwOnQueryError: () => {} },
    '@/lib/utils/content-locale': { CL_SELECT: '*', flattenLocales: () => ({ title: exact.title, creator: exact.creator, affiliate_url: exact.affiliate_url }) },
    '@/lib/utils/content-locale-text': localeText, '@/lib/utils/book-description': bookDescription,
    '@/lib/books/contentEdition': { applyContentBookEdition }, '@/lib/books/amazonBookSearch': {}, './fetchBookMetadata': {},
  })
  const before = structuredClone(row)
  const blocked = await api.getInitialPublicContentInfo(id, 'ko')
  assert.equal(blocked.id, id)
  assert.equal(blocked.title, exact.title)
  assert.equal(blocked.bookPurchaseBlocked, true)
  assert.equal(blocked.affiliateLinks, undefined)
  assert.deepEqual(row, before)
  row.metadata = {}
  exact.isbn = '9788937460012'
  exact.sources = { primary: 'kakao_book', edition_selection_evidence: [{ method: 'independent_selection_review', content_id: id,
    isbn: exact.isbn, locale: 'ko', edition_title: exact.title, reason: 'editorial_exclusion', source_url: 'https://publisher.example/exact-edition',
    explanation: '운영자가 해당 실제 판본을 서비스 책장 선정에서 명시적으로 제외했으며 기록은 보존한다.' }] }
  assert.equal((await api.getInitialPublicContentInfo(id, 'ko')).bookPurchaseBlocked, true)
  catalog = true
  english = [{ id: 9, locale: 'en', title: 'Normal English edition', creator: 'Original Author', isbn: '9780140432169',
    sortOrder: 0, sources: { primary: 'openlibrary' }, purchaseUrl: null, platform: null }]
  const normal = await api.getInitialPublicContentInfo(id, 'ko')
  assert.equal(normal.bookPurchaseBlocked, false)
  assert.equal(normal.editionLocale, 'en')
  assert.deepEqual(normal.sources, english[0].sources)
  english = []
  row.content_locales = [{ ...exact, sources: { primary: 'kakao_book' } }]
  assert.equal((await api.getInitialPublicContentInfo(id, 'ko')).bookPurchaseBlocked, true, '전부 제외된 실제 판본을 locale 카드로 다시 구매하지 않는다')
})

test('first content information returns without external enrichment, reviews, characters or curated queries', async () => {
  const unexpected = async () => { throw new Error('supplementary query blocked first paint') }
  const row = { id, type: 'MUSIC', external_id: '123', external_source: 'itunes', metadata: {} as Record<string, unknown>,
    content_locales: [{ locale: 'ko', title: '말하는 대로', creator: '처진 달팽이' }] }
  let reads = 0
  const query = { select: () => query, eq: () => query, maybeSingle: async () => { reads++; return { data: row, error: null } } }
  const action = load<{ getInitialPublicContentInfo: (id: string, locale: string) => Promise<{
    title: string; enrichmentPending: boolean; mediaBannerTheme: string; metadata: Record<string, unknown>
  }> }>('./getContentDetail.ts', {
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/db/server': {}, './getContentById': {}, '@/actions/user': {},
    './fetchContentMetadata': { fetchContentMetadata: unexpected },
    './getReviewFeed': { getPublicReviewFeed: unexpected, getReviewFeed: unexpected },
    '@/actions/figure-books/getFigureBooks': { getFigureBookCharactersForContent: unexpected },
    '@/actions/figure-books/figureBookEditions': {}, '@/actions/figure-books/figureBookLocale': {},
    '@/actions/library/curated': { getCuratedEntriesForContent: unexpected },
    'next-intl/server': {}, '@/lib/developer-mode': { isDeveloperMode: () => false },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read(), throwOnQueryError: () => {} },
    '@/lib/utils/content-locale': { CL_SELECT: '*', flattenLocales: () => ({ title: '말하는 대로', creator: '처진 달팽이' }) },
    '@/lib/utils/content-locale-text': localeText,
    './fetchBookMetadata': { getBookIntroduction: unexpected },
    '@/lib/utils/book-description': {}, '@/lib/books/contentEdition': {}, '@/lib/books/amazonBookSearch': {},
    '@/constants/categories': {}, '@/constants/affiliatePlatforms': {},
  })
  const content = await action.getInitialPublicContentInfo(id, 'ko')
  assert.equal(content.title, '말하는 대로')
  assert.equal(content.enrichmentPending, true)
  assert.equal(reads, 1)
  row.metadata.genre = '재즈'
  const korean = await action.getInitialPublicContentInfo(id, 'ko')
  assert.equal(korean.mediaBannerTheme, 'jazz')
  const english = await action.getInitialPublicContentInfo(id, 'en')
  assert.equal(english.metadata.genre, undefined)
  assert.equal(english.mediaBannerTheme, 'jazz')
  assert.equal(reads, 3)
})

test('viewer state restores saved reactions alongside the existing review', async () => {
  let selected = ''
  const row = { id: 'record-id', status: 'FINISHED', rating: 4.5, review: '기존 감상',
    review_presets: ['유익해요'], is_spoiler: true, created_at: 'created', updated_at: 'updated' }
  const query = {
    select: (columns: string) => { selected = columns; return query },
    eq: () => query, maybeSingle: async () => ({ data: row }),
  }
  const api = load<{ getContentViewerState: (id: string) => Promise<{ userRecord: {
    reviewPresets: string[]; review: string; rating: number; isSpoiler: boolean
  } }> }>('./getContentDetail.ts', {
    '@/lib/db/server': { createClient: async () => ({ from: () => query }) },
    '@/actions/user': { getProfile: async () => ({ id: 'member-id' }) },
    '@/lib/db/static': {}, './getContentById': {}, './fetchContentMetadata': {}, './getReviewFeed': {},
    '@/actions/figure-books/getFigureBooks': {}, '@/actions/figure-books/figureBookEditions': {},
    '@/actions/figure-books/figureBookLocale': {}, '@/actions/library/curated': {},
    'next-intl/server': {}, '@/lib/developer-mode': {}, '@/lib/cache': {},
    '@/lib/utils/content-locale': {}, '@/lib/utils/content-locale-text': {},
    './fetchBookMetadata': {}, '@/lib/utils/book-description': {},
    '@/lib/books/contentEdition': {}, '@/lib/books/amazonBookSearch': {},
  })
  const result = await api.getContentViewerState(id)
  assert.ok(selected.split(',').map(value => value.trim()).includes('review_presets'))
  assert.deepEqual(result.userRecord.reviewPresets, ['유익해요'])
  assert.equal(result.userRecord.review, '기존 감상')
  assert.equal(result.userRecord.rating, 4.5)
  assert.equal(result.userRecord.isSpoiler, true)
})

test('a saved film introduction does not suppress fresh runtime, release date and stills or block first paint', async () => {
  const row = { id, type: 'VIDEO', external_id: 'tmdb-movie-3082', external_source: 'tmdb',
    metadata: { screenshots: ['old-still'], voteAverage: 7 }, description: 'Saved introduction',
    content_locales: [{ locale: 'en', title: 'Modern Times', description: 'Saved introduction' }] }
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row, error: null }) }
  let calls = 0
  const api = load<{ getInitialPublicContentInfo: (id: string, locale: string) => Promise<Record<string, unknown>>;
    getPublicContentInfo: (id: string, locale: string) => Promise<Record<string, unknown>> }>('./getContentDetail.ts', {
    '@/lib/db/static': { createStaticClient: () => ({ from: () => query }) },
    '@/lib/db/server': {}, './getContentById': {}, './getReviewFeed': {}, '@/actions/user': {},
    '@/actions/figure-books/getFigureBooks': {}, '@/actions/library/curated': {}, 'next-intl/server': {},
    '@/actions/figure-books/figureBookEditions': {}, '@/actions/figure-books/figureBookLocale': {},
    '@/lib/developer-mode': { isDeveloperMode: () => false },
    '@/lib/cache': { cachedDetail: (_tag: string, _id: string, _keys: string[], read: () => unknown) => read(), throwOnQueryError: () => {} },
    '@/lib/utils/content-locale': { CL_SELECT: '*', flattenLocales: () => ({ title: 'Modern Times', description: 'Saved introduction' }) },
    '@/lib/utils/content-locale-text': localeText, '@/lib/utils/book-description': {},
    '@/lib/books/contentEdition': {}, '@/lib/books/amazonBookSearch': {}, './fetchBookMetadata': {},
    './fetchContentMetadata': { fetchContentMetadata: async (_id: string, _type: string, _source: string, locale: string) => {
      calls++; assert.equal(locale, 'en');
      return { source: 'tmdb', metadata: { releaseDate: '1936-02-05', runtime: 87, screenshots: ['fresh-still'], voteAverage: 8.3 } }
    } },
  })
  const initial = await api.getInitialPublicContentInfo(id, 'en')
  assert.equal(calls, 0)
  assert.equal(initial.enrichmentPending, true)
  const complete = await api.getPublicContentInfo(id, 'en')
  assert.equal(calls, 1)
  assert.equal(complete.description, 'Saved introduction')
  assert.equal(complete.releaseDate, '1936-02-05')
  const metadata = complete.metadata as Record<string, unknown>
  assert.equal(metadata.runtime, 87)
  assert.equal(metadata.voteAverage, 8.3)
  assert.deepEqual(metadata.screenshots, ['fresh-still'])
})

type Element = { type: (props: Record<string, unknown>) => Promise<Element> | Element; props: Record<string, unknown> }
const pending = { PendingBlock: () => null, RetryBlock: () => null }

function sections(mocks: Record<string, unknown> = {}) {
  return load<{ ContentRelatedSections: (props: object) => Element; ContentReviewsSection: (props: object) => Element }>(
    '../../app/[locale]/(main)/content/[contentId]/ContentDetailSections.tsx', {
      '@/actions/contents/getReviewFeed': { getPublicReviewFeed: async () => [] },
      '@/actions/figure-books/getFigureBooks': { getFigureBookCharactersForContent: async () => [] },
      '@/actions/library/curated': { getCuratedEntriesForContent: async () => [] },
      '@/components/features/content/AllReviewsSection': () => null,
      '@/components/features/content/ContentRelations': { ContentCharacters: () => null, ContentCurated: () => null },
      '@/components/ui/pending/Lane': () => null, '@/components/ui/pending': pending,
      ...mocks,
    })
}

test('a blocked character query does not delay curated history or reviews', async () => {
  let release!: (value: unknown[]) => void
  const slow = new Promise<unknown[]>(resolve => { release = resolve })
  const api = sections({ '@/actions/figure-books/getFigureBooks': { getFigureBookCharactersForContent: () => slow } })
  const related = api.ContentRelatedSections({ contentId: id, locale: 'ko' }).props.children as Element[]
  const character = related[0].props.children as Element
  const waiting = character.type(character.props)
  const curated = related[1].props.children as Element
  assert.equal(await curated.type(curated.props), null)
  const review = api.ContentReviewsSection({ contentId: id, locale: 'ko', title: 'test', type: 'BOOK' }).props.children as Element
  const result = await review.type(review.props)
  assert.deepEqual(result.props.initialReviews, [])
  release([])
  assert.equal(await waiting, null)
})

test('a failed review query produces a retry section instead of breaking the page', async () => {
  const api = sections({ '@/actions/contents/getReviewFeed': { getPublicReviewFeed: async () => { throw new Error('offline') } } })
  const child = api.ContentReviewsSection({ contentId: id, locale: 'ko', title: 'test', type: 'BOOK' }).props.children as Element
  const result = await child.type(child.props)
  assert.equal(result.type, pending.RetryBlock)
})

test('external content page renders its stable information shell without waiting for section data', async () => {
  let reads = 0
  const Detail = () => null
  const api = load<{ default: (props: object) => Promise<Element> }>('../../app/[locale]/(main)/content/[contentId]/page.tsx', {
    'next-intl/server': { setRequestLocale: () => {}, getTranslations: async () => (key: string) => key },
    '@/actions/contents/getContentDetail': { getInitialPublicContentInfo: async () => { reads++; return { id, title: 'test', type: 'MUSIC' } } },
    '@/components/features/content/ContentDetailPage': Detail,
    '@/lib/seo': { getAlternates: () => ({ canonical: 'https://feelandnote.com/content/' + id }), getCreativeWorkCreatorJsonLd: () => ({}), getSeoImageUrl: () => '' },
    '@/lib/seoSentences': {}, '@/lib/jsonLd': { serializeJsonLd: JSON.stringify },
    './ExternalContentDetailFallback': () => null, './ContentDetailPending': () => null,
    './ContentDetailSections': { ContentRelatedSections: () => null, ContentReviewsSection: () => null },
    '@/components/ui/pending/Lane': () => null,
  })
  // UUID는 404 여부를 먼저 확인한다. 외부 검색 ID의 지연 렌더를 검증한다.
  const shell = await api.default({ params: Promise.resolve({ locale: 'ko', contentId: 'tmdb-movie-3082' }) })
  assert.equal(reads, 0)
  const child = shell.props.children as Element
  const result = await child.type(child.props)
  const detail = (result.props.children as Element[]).find(element => (element.type as unknown) === Detail)!
  assert.equal(reads, 1)
  assert.deepEqual((detail.props.initialData as { initialReviews: unknown[] }).initialReviews, [])
  assert.ok(detail.props.relatedSections)
  assert.ok(detail.props.reviewsSection)
})

test('notice list waits for authorization before querying and never includes scheduled posts for visitors', async () => {
  let authorize!: (admin: boolean) => void
  let options: unknown
  const auth = new Promise<boolean>(resolve => { authorize = resolve })
  const api = load<{ default: (props: object) => Element }>('../../app/[locale]/(main)/agora/board/notice/page.tsx', {
    'next-intl/server': {}, '@/lib/db/server': { createClient: async () => ({}) },
    '@/lib/auth/checkAdmin': { isAdmin: () => auth },
    '@/actions/board/notices': { getNotices: async (value: unknown) => { options = value; return { notices: [], total: 0 } } },
    '@/components/features/board/notices/NoticeList': () => null,
    '@/types/locale': { resolveLocale: (value: string) => value },
    '@/components/ui/pending/Lane': () => null, '@/components/ui/pending': pending,
  })
  const shell = api.default({ params: Promise.resolve({ locale: 'ko' }), searchParams: Promise.resolve({}) })
  const child = shell.props.children as Element
  const waiting = child.type(child.props)
  await Promise.resolve()
  assert.equal(options, undefined)
  authorize(false)
  const result = await waiting
  assert.deepEqual(options, { locale: 'ko', limit: 10, offset: 0, includeScheduled: false })
  assert.equal(result.props.isAdmin, false)
})
