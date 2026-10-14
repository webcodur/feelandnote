import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import type { ReactElement } from 'react'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./page.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

async function content(failedSource?: 'works' | 'professions') {
  const PopularSection = () => null
  const RetryBlock = () => null
  const mocks: Record<string, unknown> = {
    'next/navigation': { permanentRedirect: () => { throw new Error('redirect') } },
    'next-intl/server': { getTranslations: async () => (key: string) => key, getLocale: async () => 'en' },
    '@/components/ui/pending/Lane': { default: () => null },
    '@/components/ui/pending/PendingBlock': { default: () => null },
    '@/components/ui/pending/RetryBlock': { default: RetryBlock },
    '@/components/features/library/sections/PopularSection': { default: PopularSection },
    '@/actions/library/classics': { getClassicsLibrary: async () => {
      if (failedSource === 'works') throw new Error('DB timeout')
      return { contents: [], total: 0, totalPages: 0, currentPage: 1 }
    } },
    '@/actions/library/profession': { getProfessionContentCounts: async () => {
      if (failedSource === 'professions') throw new Error('DB timeout')
      return [{ profession: 'actor', count: 20 }]
    } },
    '@/i18n/navigation': { getPathname: () => '/en/explore/works' },
    '@/lib/seo': { getLocalizedAlternates: async () => ({}) },
  }
  const loaded = { exports: {} as { default: (props: { searchParams: Promise<{ mode: string }> }) => Promise<ReactElement<{ children: ReactElement }>> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const page = await loaded.exports.default({ searchParams: Promise.resolve({ mode: 'classics' }) })
  const child = page.props.children as ReactElement & { type: () => Promise<ReactElement> }
  return { result: await child.type(), PopularSection, RetryBlock }
}

test('genuinely empty initial results keep the filters available', async () => {
  const f = await content()
  assert.equal(f.result.type, f.PopularSection)
  assert.deepEqual((f.result.props as { professions: string[] }).professions, ['actor'])
})

for (const source of ['works', 'professions'] as const) {
  test(`${source} initial failure renders retry instead of an empty library or crashed page`, async t => {
    const log = t.mock.method(console, 'error', () => {})
    const f = await content(source)
    assert.equal(f.result.type, f.RetryBlock)
    assert.equal(log.mock.callCount(), 1)
  })
}
