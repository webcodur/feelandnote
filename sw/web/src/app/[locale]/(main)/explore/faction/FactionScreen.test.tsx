import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

test('세력 소개·명단은 작품 캐시가 비어 있어도 책장 조회를 시작하거나 기다리지 않는다', async () => {
  let bookCalls = 0
  const compiled = ts.transpileModule(readFileSync(new URL('./FactionScreen.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const mocks: Record<string, unknown> = {
    'next-intl/server': { getTranslations: async () => (key: string) => key },
    '@/actions/home/getFactionFigureBooks': { getFactionFigureBooks: () => { bookCalls++; return new Promise(() => {}) } },
    '@/lib/faction-celebs': { getFactionCelebs: async () => [{ id: 'a', nickname: 'A' }] },
    '@/lib/faction-groups': { getFactionGroupDescriptions: async () => [] },
    '@/lib/atlas-navigation': { buildFactionNavigation: () => [] },
    '@/lib/faction-sections': { buildFactionClusters: () => [], factionSectionKey: () => 'section', localizedFactionName: () => '세력' },
    '@/lib/faction-theme': { toFactionThemeData: (_entry: unknown, people: unknown[], _groups: unknown[], books: unknown[]) => ({ people, works: books }) },
    '@/components/features/faction/entry/FactionEntryView': { __esModule: true, default: 'entry' },
    '@/components/shared/AsyncIntlProvider': { __esModule: true, default: 'provider' },
    '@/components/ui/pending': { RetryBlock: 'retry' },
    '@/lib/seo': {}, '@/lib/jsonLd': {}, '@/lib/url': {},
  }
  type Element = { type: string | ((props: unknown) => Promise<Element>); props: { children: Element[] | Element; data?: { people: unknown[]; works: unknown[] } } }
  const loaded = { exports: {} as { default: (props: unknown) => Promise<Element> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const entry = { id: 'f', name: '세력', celebs: [{ id: 'a' }] }
  const tree = await loaded.exports.default({ entry, locale: 'ko', section: {}, sections: [] })
  const body = tree.props.children as Element
  assert.equal(typeof body.type, 'function')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const rendered = await Promise.race([
      (body.type as (props: unknown) => Promise<Element>)(body.props),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('소개가 책장 조회에 막혔다')), 100) }),
    ])
    const client = (rendered.props.children as Element[])[1]
    assert.equal(client.props.data?.people.length, 1)
    assert.deepEqual(client.props.data?.works, [])
    assert.equal(bookCalls, 0)
  } finally { clearTimeout(timer) }
})
