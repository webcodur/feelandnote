import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function load(file: URL, mocks: Record<string, unknown>) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const loaded = { exports: {} as Record<string, (...args: never[]) => Promise<unknown>> }
  new Function('require', 'module', 'exports', compiled)(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports,
  )
  return loaded.exports
}

test('home figure links load their displayed data with one public query and no enrichment reads', async () => {
  const calls: { name: string; args: Record<string, unknown>; select?: string }[] = []
  const rows = [{ id: 'figure-a', slug: 'figure-a', nickname: '이름', nickname_en: 'Name', avatar_url: null, title: '직함', title_en: 'Title', content_count: 12 }]
  const db = {
    rpc: (name: string, args: Record<string, unknown>) => {
      const call = { name, args, select: undefined as string | undefined }
      calls.push(call)
      return {
        select: (columns: string) => { call.select = columns; return Promise.resolve({ data: rows, error: null }) },
        then: (resolve: (value: unknown) => void) => resolve({ data: name === 'count_celebs_filtered' ? 1 : rows, error: null }),
      }
    },
    from: () => { throw new Error('The link grid must not wait for unrelated profile enrichment') },
  }
  const actions = load(new URL('./getCelebs.ts', import.meta.url), {
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/db/server': { createClient: () => { throw new Error('The link grid has no viewer state') } },
  })
  const home = load(new URL('../../components/features/home/HomeFigureLinks.tsx', import.meta.url), {
    '@/actions/home': actions,
    '@/actions/home/getCelebs': actions,
    '@/components/features/celeb/FigureLinkGrid': { default: () => null },
  })
  const result = await home.default() as { props: { figures: unknown[] } } | null
  assert.ok(result, 'the figure grid should render without any enrichment queries')
  assert.deepEqual(result.props.figures, rows)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'get_celebs_sorted')
  assert.equal(calls[0].args.p_limit, 6)
  assert.equal(calls[0].args.p_min_content_count, 5)
  assert.equal(calls[0].args.p_sort_by, 'content_count')
  assert.equal(calls[0].args.p_include_inactive, false)
  assert.deepEqual(calls[0].args.p_celeb_realities, ['REAL', 'BOTH'])
  assert.ok(calls[0].select?.includes('nickname_en'))
  assert.ok(calls[0].select?.includes('title_en'))
  assert.equal(calls[0].select?.includes('bio'), false)
})
