import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { load } from 'cheerio'
import ts from 'typescript'
import type ContentLibraryBody from './ContentLibraryBody'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./ContentLibraryBody.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText
const loaded = { exports: {} as { default: typeof ContentLibraryBody } }
const mocks: Record<string, unknown> = {
  '@/components/ui': { Pagination: () => null },
  '@/components/ui/AnimatedHeight': { default: ({ children }: { children: React.ReactNode }) => children },
  '@/lib/utils': { cn: (...values: unknown[]) => values.filter(Boolean).join(' ') },
  './ContentLibraryStates': { ErrorState: () => null },
}
new Function('require', 'module', 'exports', compiled)((key: string) => mocks[key] ?? require(key), loaded, loaded.exports)

test('switching library categories preserves busy state without drawing a horizontal loading line', () => {
  for (const isRefreshing of [true, false]) {
    const props: ComponentProps<typeof ContentLibraryBody> = {
      animateHeight: false, compact: false, currentPage: 1, error: null,
      hasContents: true, hasFilteredContents: true, isExpandView: true, isRefreshing,
      loadContents() {}, noResultsMessage: 'Empty', onPageChange() {}, onPageSizeChange() {},
      pageSize: 10, presentationViewMode: 'expand', renderContentsForMode: () => createElement('p', null, 'Selected work'),
      showPagination: false, totalPages: 1,
    }
    const $ = load(renderToStaticMarkup(createElement(loaded.exports.default, props)))
    assert.equal($('[aria-busy]').attr('aria-busy'), String(isRefreshing))
    assert.equal($('p').text(), 'Selected work')
    assert.equal($('[class~="h-px"]').length, 0, 'Refresh must not draw a full-width accent line over the view controls')
  }
})
