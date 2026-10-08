import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./CelebPageBody.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText

for (const booksFail of [false, true]) test(`profile and reading render independently of ${booksFail ? 'failed' : 'pending'} reference books`, async (t) => {
  if (booksFail) t.mock.method(console, 'error', () => {})
  const calls: string[] = []
  let releaseRecords!: (value: { items: never[]; total: number }) => void
  let releaseBooks!: (value: { appeared: never[]; authored: never[]; professionBooks: never[]; factionGroups: never[] }) => void
  let rejectBooks!: (error: Error) => void
  const records = new Promise<{ items: never[]; total: number }>((resolve) => { releaseRecords = resolve })
  const books = new Promise<{ appeared: never[]; authored: never[]; professionBooks: never[]; factionGroups: never[] }>((resolve, reject) => {
    releaseBooks = resolve
    rejectBooks = reject
  })
  const profile = { id: 'pearl', nickname: '펄 벅', profession: 'writer', celeb_tier: 'full',
    celeb_reality: 'REAL', contentTypeCounts: { BOOK: 7 }, relations: [], reading: { guide: '인물 안내' } }
  const stub = () => null
  const mocks = new Map<string, object>([
    ['@/lib/celeb-professions', { getCelebProfessions: async () => [] }],
    ['next-intl/server', { setRequestLocale: stub, getTranslations: async () => (key: string) => key }],
    ['@/lib/profile-route', { getCelebRouteProfile: async () => profile }],
    ['@/actions/celebs/getCelebSidePresence', { getCelebSidePresence: async () => ({ influence: false, spectrum: false }) }],
    ['@/actions/celebs/getCelebTimelineEvents', { getCelebTimelineEvents: async () => { calls.push('timeline'); return [] } }],
    ['@/actions/celebs/getCelebExternalLinks', { getCelebExternalLinks: async () => [] }],
    ['@/actions/celebs/getCelebJsonLdData', { getCelebDialogueFull: async () => null }],
    ['@/actions/contents/getUserContents', { getPublicUserContents: () => { calls.push('records'); return records } }],
    ['@/actions/celebs/getCelebReferenceBooks', { getCelebReferenceBooks: () => { calls.push('books'); return books } }],
    ['@/actions/contents/getContentBrief', { getInitialContentBrief: async () => null, getContentBrief: async () => null }],
    ['@/lib/render-mode', { shouldStreamForRequest: async () => true }],
    ['@/lib/celeb/externalLinks', { wikidataLink: stub }],
    ['@/components/ui/pending/Lane', { default: stub }],
    ['@/components/ui/pending', { PendingBlock: stub }],
    ['@/constants/categories', { CATEGORIES: [{ dbType: 'BOOK' }] }],
    ['@/lib/celeb/world', { resolveCelebWorld: () => 'america' }],
    ['@/lib/celeb/worldImages', { getWorldBannerImages: stub }],
    ['./CelebPageContent', { default: stub }], ['./RelatedFigureLinks', { default: stub }],
    ['@/lib/celeb/meta', { buildCelebTitle: () => '펄 벅' }],
    ['./celebPageJsonLd', { buildCelebPageJsonLd: stub }],
    ['@/lib/jsonLd', { serializeJsonLd: () => '{}' }],
    ['./celebPageMetadata', { createCelebMetaInput: stub }],
    ['./CelebExternalLinksServer', { default: stub }],
    ['./CelebDataSections', { CelebLibraryServer: stub, CelebBooksServer: stub, CelebJsonLdServer: stub }],
    ['./CelebSectionPending', { default: stub }],
  ])
  const loaded = { exports: {} as { default: (props: { params: Promise<{ locale: string; slug: string }> }) => Promise<unknown> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    if (key === 'react/jsx-runtime') return require(key)
    assert.ok(mocks.has(key), `unexpected import ${key}`)
    return mocks.get(key)
  }, loaded, loaded.exports)
  const pending = loaded.exports.default({ params: Promise.resolve({ locale: 'ko', slug: 'pearl-s.-buck' }) })
  const first = await Promise.race([pending.then(() => 'rendered'), new Promise<string>((resolve) => setTimeout(() => resolve('blocked'), 100))])
  const beforeRelease = [...calls]
  releaseRecords({ items: [], total: 0 })
  await Promise.resolve()
  if (booksFail) rejectBooks(new Error('reference query unavailable'))
  else releaseBooks({ appeared: [], authored: [], professionBooks: [], factionGroups: [] })
  const tree = await pending as {
    props: { children: [unknown, { props: { booksSlot: { props: { children: { props: { books: Promise<{ error?: true }> } } } } } }] }
  }
  assert.equal((await tree.props.children[1].props.booksSlot.props.children.props.books).error, booksFail ? true : undefined,
    'query errors stay inside the reference section and become its retry state')
  assert.equal(first, 'rendered', 'a slow lower section must not hide the available profile and reading')
  assert.deepEqual(beforeRelease, ['records'], 'reference books follow the small first-page query; timeline is on demand')
})
