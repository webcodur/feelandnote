import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const stub = () => null
interface RenderNode {
  props: {
    children: RenderNode[]
    href: string
    'aria-label': string
    sideAvailability: { relatedFactions: boolean }
    relatedFactionsSlot: { props: { children: { props: { memberships: unknown[] } } } }
  }
}
function load(file: string, mocks: Record<string, unknown>) {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const loaded = { exports: {} as { default: (props: unknown) => Promise<RenderNode> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    if (key === 'react/jsx-runtime') return require(key)
    assert.ok(key in mocks, `unexpected import ${key}`)
    return mocks[key]
  }, loaded, loaded.exports)
  return loaded.exports
}

const myth = { id: 'xiyou', slug: 'myth-china-xiyou', name: '서유기', name_en: 'Journey to the West', isMyth: true, isPublished: true }
const faction = { id: 'company', slug: 'company', name: '기업', name_en: 'Company', isMyth: false, isPublished: true }

for (const memberships of [[myth], [myth, faction], []]) test(`the celebrity page includes all ${memberships.length} public memberships in its lower section`, async () => {
  const profile = { id: 'sha-wujing', nickname: '사오정', celeb_tier: 'fiction', celeb_reality: 'FICTION', relations: [],
    factions: [...memberships, { ...myth, id: 'locked', isPublished: false }, { ...faction, id: 'missing', slug: '' }] }
  const page = load('./CelebPageBody.tsx', {
    'next-intl/server': { setRequestLocale: stub },
    '@/lib/profile-route': { getCelebRouteProfile: async () => profile },
    '@/actions/celebs/getCelebSidePresence': { getCelebSidePresence: async () => ({}) },
    '@/actions/celebs/getCelebExternalLinks': { getCelebExternalLinks: async () => [] },
    '@/actions/celebs/getCelebJsonLdData': { getCelebDialogueFull: async () => null },
    '@/actions/contents/getInitialCelebContents': { getInitialCelebContents: stub },
    '@/actions/celebs/getCelebReferenceBooks': { getCelebReferenceBooks: async () => ({}) },
    '@/lib/render-mode': { shouldStreamForRequest: async () => true },
    '@/lib/celeb/externalLinks': { wikidataLink: stub },
    '@/components/ui/pending/Lane': { default: stub },
    '@/lib/celeb/world': { resolveCelebWorld: stub },
    '@/lib/celeb/worldImages': { getWorldBannerImages: stub },
    '@/lib/celeb/meta': { buildCelebTitle: stub },
    './celebPageMetadata': { createCelebMetaInput: stub },
    './CelebPageContent': { default: stub }, './RelatedFigureLinks': { default: stub },
    './RelatedFactionLinks': { default: stub }, './CelebExternalLinksServer': { default: stub },
    './CelebSectionPending': { default: stub },
    './CelebDataSections': { CelebJsonLdServer: stub, CelebLibraryServer: stub, CelebBooksServer: stub },
  }).default
  const tree = await page({ params: Promise.resolve({ locale: 'ko', slug: 'sha-wujing' }) })
  const content = tree.props.children[1].props
  assert.equal(content.sideAvailability.relatedFactions, memberships.length > 0)
  if (memberships.length) assert.deepEqual(content.relatedFactionsSlot.props.children.props.memberships, memberships)
  else assert.equal(content.relatedFactionsSlot, false)
})

for (const locale of ['ko', 'en']) test(`lower cards link to each membership's own page (${locale})`, async () => {
  const component = load('./RelatedFactionLinks.tsx', {
    'next/image': { default: stub }, 'lucide-react': { ArrowUpRight: stub, Users: stub },
    'next-intl/server': { getLocale: async () => locale, getTranslations: async () => (_key: string, values?: { name: string }) => values?.name ?? '' },
    '@/i18n/navigation': { Link: stub },
    '@/components/features/user/explore/myth/mythHref': require('../../../../../components/features/user/explore/myth/mythHref'),
    '@/lib/celeb/factionPreviewData': { getFactionPreviewData: async () => [myth, faction].map(row => ({ id: row.id, cover: null, members: [] })) },
    '@/lib/celeb/factionPreview': { selectFactionPreview: stub },
    '@/components/ui/pending/RetryBlock': { default: stub },
  }).default
  const tree = await component({ memberships: [myth, faction], personId: 'sha-wujing' })
  const cards = tree.props.children[1].props.children
  assert.deepEqual(cards.map(card => card.props.href), ['/explore/myth/myth-china-xiyou', '/explore/faction/company'])
  assert.deepEqual(cards.map(card => card.props['aria-label']), locale === 'ko' ? ['서유기', '기업'] : ['Journey to the West', 'Company'])
})
