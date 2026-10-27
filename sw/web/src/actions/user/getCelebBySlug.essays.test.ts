import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getCelebBySlug.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function loadProfile(profile: Record<string, unknown>) {
  const cached = { profile: { nickname: '이름', ...profile }, contentTypeCounts: {}, explanation: null }
  const loaded = { exports: {} as { getCelebBySlug: (slug: string, locale: string) => Promise<{ data: {
    readingWay: string | null; virtualMonologue: string | null; translationFallbacks: string[]
  } }> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    if (key === 'react') return require(key)
    if (key === '@feelandnote/shared/constants/cache-tags') return { CACHE_TAGS: {} }
    if (key === '@/lib/cache') return { cachedDetail: async () => cached }
    if (key === '@/constants/titles') return { getTitleInfo: () => null }
    if (key === '@/lib/utils/celeb-dialogues') return { getDisplayDialogueQuote: () => null }
    if (key === '@/lib/celeb/identity') return { normalizeCelebSlug: (slug: string) => slug }
    return {}
  }, loaded, loaded.exports)
  return loaded.exports.getCelebBySlug
}

test('essays select only the current language, including one-language-only profiles', async () => {
  for (const [ko, en] of [['한국어 본문', 'English text'], ['한국어만', null], [null, 'English only'], ['', ''], [null, null], [' \n ', '\t']]) {
    const getProfile = loadProfile({ celeb_reality: 'REAL', reading_way: ko, reading_way_en: en,
      virtual_monologue: ko, virtual_monologue_en: en })
    for (const [locale, expected] of [['ko', ko?.trim() || null], ['en', en?.trim() || null]]) {
      const { data } = await getProfile('figure', locale!)
      assert.equal(data.readingWay, expected)
      assert.equal(data.virtualMonologue, expected)
      assert.ok(!data.translationFallbacks.includes('virtualMonologue'))
    }
  }
})

test('Reading Approach allows REAL and BOTH and excludes FICTION even with a stored body', async () => {
  for (const reality of ['REAL', 'BOTH', 'FICTION', null]) {
    const { data } = await loadProfile({ celeb_reality: reality, reading_way: '본문', virtual_monologue: '독백' })('figure', 'ko')
    assert.equal(data.readingWay, reality === 'REAL' || reality === 'BOTH' ? '본문' : null)
    assert.equal(data.virtualMonologue, '독백')
  }
})
