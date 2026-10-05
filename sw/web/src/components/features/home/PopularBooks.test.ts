import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./PopularBooks.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

test('a failed book query renders the retry block and a later request can recover', async () => {
  let failed = true
  const RetryBlock = () => null
  const AffiliateBookList = () => null
  const books = [{ contentId: 'book-1' }]
  const mocks: Record<string, unknown> = {
    'next-intl/server': { getLocale: async () => 'ko', getTranslations: async () => (key: string) => key },
    '@/actions/home/getAffiliateBooks': { getAffiliateBooks: async () => {
      if (failed) throw new Error('DB unavailable')
      return books
    } },
    '@/components/shared/AffiliateBookList': { default: AffiliateBookList },
    '@/constants/affiliatePlatforms': { getBookStorePlatform: () => 'yes24' },
    '@/components/ui/pending': { RetryBlock },
  }
  const loaded = { exports: {} as { default: () => Promise<{ type: unknown; props: { books: unknown } } | null> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const originalError = console.error
  const errors: unknown[][] = []
  console.error = (...args) => { errors.push(args) }
  try {
    assert.equal((await loaded.exports.default())?.type, RetryBlock)
    assert.equal(errors.length, 1)
    failed = false
    const result = await loaded.exports.default()
    assert.equal(result?.type, AffiliateBookList)
    assert.deepEqual(result?.props.books, books)
  } finally {
    console.error = originalError
  }
})
