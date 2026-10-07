import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'
import { resolveTrendCountry, TREND_COUNTRY_COOKIE } from '../../../constants/trendCountries'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./HomeFigureLinks.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

type Row = ReturnType<typeof figure>
function figure(id: string, country = 'KR', contentCount = 1, rank = 1, nationality: string | null = country) {
  return { id, slug: id as string | null, nationality, content_count: contentCount, trend: { rank, country } }
}

async function renderHome(rows: Record<string, Row[] | Error>, country = 'KR') {
  const calls: string[] = []
  const grid = () => null
  const mocks: Record<string, unknown> = {
    'next/headers': {
      cookies: async () => ({ get: () => ({ value: country }) }),
      headers: async () => ({ get: () => 'US' }),
    },
    'next-intl/server': { getTranslations: async () => (key: string) => key },
    '@/constants/trendCountries': { resolveTrendCountry, TREND_COUNTRY_COOKIE },
    '@/components/features/celeb/FigureLinkGrid': { __esModule: true, default: grid },
    '@/actions/home/getCelebs': {
      getTrendingCelebLinks: async (geo: string, limit: number, min: number) => {
        calls.push(geo)
        const result = rows[geo] ?? []
        if (result instanceof Error) throw result
        return result.filter(row => row.content_count >= min).slice(0, limit)
      },
      getMostRecordedCelebLinks: () => { throw new Error('Unexpected substitute listing') },
    },
  }
  const loaded = { exports: {} as {
    default: () => Promise<{ type: unknown; props: { nationalityCountry?: string; figures?: { id: string; nationality: string | null; trendMatch: Row['trend'] }[]; children?: string } }>
    HOME_FIGURE_LINK_COUNT: number
  } }
  new Function('require', 'module', 'exports', 'console', compiled)(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports, { error: () => {} },
  )
  const result = await loaded.exports.default()
  return { result, calls, grid, limit: loaded.exports.HOME_FIGURE_LINK_COUNT }
}

test('home keeps local trending figures with one to four records, then fills from US', async () => {
  const local = [figure('lisa', 'KR', 4, 11), figure('moon', 'KR', 1, 23), figure('choi', 'KR', 2, 36), figure('empty', 'KR', 0)]
  const us = Array.from({ length: 6 }, (_, i) => figure(`us-${i}`, 'US', 1, i + 1))
  const { result, calls, grid, limit } = await renderHome({ KR: local, US: us })
  assert.equal(result.type, grid)
  assert.equal(result.props.figures?.length, limit)
  assert.deepEqual(result.props.figures?.map(row => row.id), ['lisa', 'moon', 'choi', 'us-0', 'us-1', 'us-2'])
  assert.deepEqual(result.props.figures?.map(row => row.trendMatch), [...local.slice(0, 3), ...us.slice(0, 3)].map(row => row.trend))
  assert.deepEqual(calls, ['KR', 'US'])
})

test('US fallback skips overlapping figures and keeps enough candidates to fill the section', async () => {
  const local = [figure('shared'), figure('local')]
  const us = [figure('shared', 'US'), ...Array.from({ length: 5 }, (_, i) => figure(`us-${i}`, 'US'))]
  const { result, limit } = await renderHome({ KR: local, US: us })
  assert.equal(result.props.figures?.length, limit)
  assert.deepEqual(result.props.figures?.map(row => row.id), ['shared', 'local', 'us-0', 'us-1', 'us-2', 'us-3'])
  assert.equal(result.props.figures?.[0].trendMatch.country, 'KR')
})

test('a full local section avoids a US query', async () => {
  const { calls, result, limit } = await renderHome({ JP: Array.from({ length: 6 }, (_, i) => figure(`jp-${i}`, 'JP')) }, 'JP')
  assert.deepEqual(calls, ['JP'])
  assert.equal(result.props.figures?.length, limit)
})

test('a US visitor does not query the same country twice', async () => {
  const { calls, result } = await renderHome({ US: [figure('american', 'US')] }, 'US')
  assert.deepEqual(calls, ['US'])
  assert.deepEqual(result.props.figures?.map(row => row.id), ['american'])
})

test('empty, failed, or unlinkable local results can still show US figures', async () => {
  for (const local of [[], new Error('Local fetch failed'), [{ ...figure('no-slug'), slug: null }]]) {
    const { result, calls } = await renderHome({ KR: local, US: [figure('american', 'US')] })
    assert.deepEqual(result.props.figures?.map(row => row.id), ['american'])
    assert.deepEqual(calls, ['KR', 'US'])
  }
})

test('a failed US lookup preserves local figures', async () => {
  const { result } = await renderHome({ KR: [figure('local')], US: new Error('US fetch failed') })
  assert.deepEqual(result.props.figures?.map(row => row.id), ['local'])
})

test('when both countries are empty, the home empty message remains', async () => {
  const { result } = await renderHome({ KR: [], US: [] })
  assert.equal(result.type, 'p')
  assert.equal(result.props.children, 'homeEmpty')
})

test('home compares nationalities to the selected country and preserves actual nationality, not search country', async () => {
  const { result } = await renderHome({
    JP: [figure('japanese', 'JP', 1, 1, 'JP'), figure('korean-trending-in-japan', 'JP', 1, 2, 'KR')],
    US: [figure('british-trending-in-us', 'US', 1, 3, 'GB'), figure('unknown-nationality', 'US', 1, 4, null)],
  }, 'JP')
  assert.equal(result.props.nationalityCountry, 'JP')
  assert.deepEqual(result.props.figures?.map(row => row.nationality), ['JP', 'KR', 'GB', null])
  assert.equal(result.props.figures?.[2].trendMatch.country, 'US')
})
