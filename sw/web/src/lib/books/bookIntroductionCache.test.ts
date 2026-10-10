import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function loadFunction(path: string, name: string, modules: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8') + `\nexports.subject = ${name};`
  const exports: Record<string, unknown> = {}
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: (id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected dependency: ${id}`)
    return modules[id]
  } })
  return exports.subject as (...args: unknown[]) => Promise<string | null>
}

test('browser retries empty and rejected introductions, while sharing pending and successful reads', async () => {
  let calls = 0
  const read = loadFunction('../../hooks/useBookIntroduction.ts', 'requestIntroduction', {
    react: {},
    '@/actions/contents/fetchBookMetadata': { getBookIntroduction: async () => {
      calls++
      if (calls === 1) return null
      if (calls === 2) throw new Error('Provider temporarily unavailable')
      return 'Recovered introduction'
    } },
    '@feelandnote/content-search/book-introduction-contract': {},
  })
  const reference = { isbn: '9788991290464', source: 'DAUM', sourceUrl: 'https://example.test/book' }
  const first = read(reference, 'ko')
  assert.equal(first, read(reference, 'ko'))
  assert.equal(await first, null)
  await assert.rejects(read(reference, 'ko'), /temporarily unavailable/)
  assert.equal(await read(reference, 'ko'), 'Recovered introduction')
  assert.equal(await read(reference, 'ko'), 'Recovered introduction')
  assert.equal(calls, 3)
})

test('server cache does not retain empty or failed provider reads and separates selected sources', async () => {
  let calls = 0
  const saved = new Map<string, unknown>()
  const read = loadFunction('../../actions/contents/fetchBookMetadata.ts', 'readIntroduction', {
    react: { cache: (fn: unknown) => fn },
    'next/cache': { unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => async (...args: unknown[]) => {
      const key = JSON.stringify(args)
      if (saved.has(key)) return saved.get(key)
      const value = await fn(...args)
      saved.set(key, value)
      return value
    } },
    '@feelandnote/content-search/book-introduction': { fetchBookIntroduction: async () => {
      calls++
      if (calls === 1) return { description: null }
      if (calls === 2) throw new Error('Provider temporarily unavailable')
      return { description: 'Recovered introduction' }
    } },
    '@feelandnote/content-search/book-introduction-contract': {},
    '@/lib/cache': { STATIC_REVALIDATE: 604800 },
    '@/lib/utils/book-description': {},
    '@/lib/utils/content-locale-text': { pickIntroForLocale: (_: unknown, values: unknown[]) => values[0] },
    '@/lib/developer-mode': {},
    '@/lib/books/developerBookIntroductionLayout': {},
    '@/lib/cacheQuery': {},
  })
  const args = ['9788991290464', 'ko', 'DAUM', 'https://example.test/book']
  await assert.rejects(read(...args), /introduction unavailable/)
  assert.equal(saved.size, 0)
  await assert.rejects(read(...args), /temporarily unavailable/)
  assert.equal(saved.size, 0)
  assert.equal(await read(...args), 'Recovered introduction')
  assert.equal(await read(...args), 'Recovered introduction')
  assert.equal(calls, 3)
  await read(args[0], args[1], 'KAKAO', 'https://example.test/other')
  assert.equal(calls, 4)
})
