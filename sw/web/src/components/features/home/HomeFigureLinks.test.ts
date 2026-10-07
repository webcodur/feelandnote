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

test('home shows active trending people with one to four records instead of an empty section', async () => {
  const rows = [
    { id: 'lisa', content_count: 4, trend: { rank: 11, country: 'KR' } },
    { id: 'moon', content_count: 1, trend: { rank: 23, country: 'KR' } },
    { id: 'choi', content_count: 2, trend: { rank: 36, country: 'KR' } },
    { id: 'empty-profile', content_count: 0, trend: { rank: 40, country: 'KR' } },
  ]
  let listingCalls = 0
  const grid = () => null
  const mocks: { [key: string]: unknown } = {
    'next/headers': {
      cookies: async () => ({ get: () => ({ value: 'KR' }) }),
      headers: async () => ({ get: () => 'US' }),
    },
    'next-intl/server': { getTranslations: async () => (key: string) => key },
    '@/constants/trendCountries': { resolveTrendCountry, TREND_COUNTRY_COOKIE },
    '@/components/features/celeb/FigureLinkGrid': { __esModule: true, default: grid },
    '@/actions/home/getCelebs': {
      getTrendingCelebLinks: async (country: string, limit: number, min: number) => {
        listingCalls++
        assert.equal(country, 'KR')
        return rows.filter(row => row.content_count >= min).slice(0, limit)
      },
      getMostRecordedCelebLinks: () => { throw new Error('Unexpected substitute listing') },
    },
  }
  const loaded = { exports: {} as {
    default: () => Promise<{ type: unknown; props: { figures: { id: string; trendMatch: unknown }[] } }>
  } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const result = await loaded.exports.default()
  assert.equal(result.type, grid, 'Matching people must survive the home eligibility filter')
  assert.deepEqual(result.props.figures.map(row => row.id), ['lisa', 'moon', 'choi'])
  assert.deepEqual(result.props.figures.map(row => row.trendMatch), rows.slice(0, 3).map(row => row.trend))
  assert.equal(listingCalls, 1)
})
