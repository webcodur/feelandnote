import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('./getCelebReferenceBooks.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

test('profession and faction books start while figure books are still pending', async () => {
  const calls: string[] = []
  let release!: (books: never[]) => void
  const slowBooks = new Promise<never[]>((resolve) => { release = resolve })
  const mocks = new Map<string, object>([
    ['@/actions/figure-books/getFigureBookPresentations', { getFigureBookPresentationsForCeleb: () => slowBooks }],
    ['@/actions/books/getProfessionBooks', { getProfessionBooks: async () => { calls.push('profession'); return [] } }],
    ['@/lib/celeb/authoredBooks', { getDisplayFigureBookGroups: () => ({ appeared: [], authored: [] }) }],
    ['@/lib/db/static', { createStaticClient: () => { calls.push('profile-read'); throw new Error('profile already provided') } }],
    ['./getCelebFactionBooks', { getCelebFactionBooks: async () => { calls.push('faction'); return [] } }],
  ])
  const loaded = { exports: {} as { getCelebReferenceBooks: (id: string, locale: string, initial: boolean, profession: string | null) => Promise<{ profession: string | null }> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(mocks.has(key), `unexpected import ${key}`)
    return mocks.get(key)
  }, loaded, loaded.exports)
  const pending = loaded.exports.getCelebReferenceBooks('pearl-buck', 'ko', true, 'writer')
  // Attach rejection immediately so the failing version cannot leak an unhandled rejection.
  const completed = pending.catch((error: Error) => error)
  await Promise.resolve()
  await Promise.resolve()
  const started = [...calls]
  release([])
  const result = await completed
  assert.deepEqual(started.sort(), ['faction', 'profession'])
  assert.ok(!(result instanceof Error))
  assert.equal(result.profession, 'writer')
})
