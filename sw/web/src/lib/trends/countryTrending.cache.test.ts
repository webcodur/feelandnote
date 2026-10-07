import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'
import { coalescePublicRead } from '../coalescePublicRead'
import { matchTrendingPeople, parseTrendPage, resolveCountryTrendingPeople } from './trendMatching'
import { TREND_PERIOD_HOURS } from '../../constants/trendCountries'
import type { CountryTrendingPeople } from './trendMatching'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./countryTrending.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture() {
  const urls: string[] = []
  let fail = false
  let directoryReads = 0
  const mocks: { [key: string]: unknown } = {
    'next/cache': { unstable_cache: (read: unknown) => read },
    '@/lib/coalescePublicRead': { coalescePublicRead },
    '@/constants/trendCountries': { TREND_PERIOD_HOURS },
    './trendMatching': { matchTrendingPeople, parseTrendPage, resolveCountryTrendingPeople },
    '@/lib/db/static': { createStaticClient: () => ({}) },
    '@feelandnote/shared/lib/paginate': {
      selectAllPages: async () => {
        directoryReads++
        return [{ id: 'lisa', nickname: '리사', nickname_en: 'Lisa', birth_date: '1997' }]
      },
    },
    '@/lib/rawFetch': {
      rawFetch: async (url: string) => {
        urls.push(url)
        await Promise.resolve()
        if (fail) throw new Error('Google unavailable')
        const country = new URL(url).searchParams.get('geo')
        const row = ['Lisa', null, country, [Math.floor(Date.now() / 1000) - 3600], null, null, 500, null, 1000, []]
        return new Response(`<script>AF_initDataCallback({key:'ds:0',data:${JSON.stringify([null, [row]])},sideChannel:{}});</script>`)
      },
    },
  }
  const loaded = { exports: {} as { getCountryTrendingPeople: (country: string) => Promise<CountryTrendingPeople> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { urls, read: loaded.exports.getCountryTrendingPeople, fail: (value: boolean) => { fail = value }, directoryReads: () => directoryReads }
}

test('simultaneous cold requests for one country share the Google fetch and directory read', async () => {
  const f = fixture()
  const [first, second] = await Promise.all([f.read('KR'), f.read('KR')])
  assert.deepEqual(first, second)
  assert.equal(first.available, true)
  assert.deepEqual(first.matches.map(match => match.id), ['lisa'])
  assert.equal(f.urls.length, 1)
  assert.equal(f.directoryReads(), 1)
  assert.equal(new URL(f.urls[0]).searchParams.get('hours'), '48')
})

test('countries do not share feeds, and a failed cold read does not prevent recovery', async () => {
  const f = fixture()
  f.fail(true)
  const failed = await Promise.all([f.read('KR'), f.read('KR')])
  assert.ok(failed.every(result => !result.available))
  assert.equal(f.urls.length, 1)
  f.fail(false)
  const recovered = await Promise.all([f.read('KR'), f.read('US')])
  assert.ok(recovered.every(result => result.available))
  assert.equal(f.urls.length, 3)
  assert.deepEqual(f.urls.map(url => new URL(url).searchParams.get('geo')), ['KR', 'KR', 'US'])
})
