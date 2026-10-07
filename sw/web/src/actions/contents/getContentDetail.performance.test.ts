import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as localeText from '../../lib/utils/content-locale-text'

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

test('first content information returns without external enrichment, reviews, characters or curated queries', async () => {
  const unexpected = async () => { throw new Error('supplementary query blocked first paint') }
  const row = { id, type: 'MUSIC', external_id: '123', external_source: 'itunes', metadata: {},
    content_locales: [{ locale: 'ko', title: '말하는 대로', creator: '처진 달팽이' }] }
  let reads = 0
  const query = { select: () => query, eq: () => query, maybeSingle: async () => { reads++; return { data: row, error: null } } }
  const action = load<{ getInitialPublicContentInfo: (id: string, locale: string) => Promise<{ title: string; enrichmentPending: boolean }> }>('./getContentDetail.ts', {
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

test('content page renders its stable information shell without waiting for section data', async () => {
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
  const shell = await api.default({ params: Promise.resolve({ locale: 'ko', contentId: id }) })
  assert.equal(reads, 0)
  const child = shell.props.children as Element
  const result = await child.type(child.props)
  const detail = (result.props.children as Element[]).find(element => element.type === Detail)!
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
