import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { createClient } from '@feelandnote/db'

interface Guide {
  text: string
  locale: 'ko' | 'en'
}

function loadGuideReader(row: { plain_text: string; plain_text_en: string | null } | null) {
  const db = createClient('https://database.test', 'test-only', {
    global: {
      fetch: async (input: string | URL | Request) => {
        const url = new URL(String(input))
        assert.equal(url.pathname, '/rest/v1/celeb_explanations')
        const allowed = new Set(['select', 'profile_id'])
        const removedColumn = [...url.searchParams.keys()].find(key => !allowed.has(key))
        const selected = (url.searchParams.get('select') ?? '').split(',')
        if (removedColumn || selected.some(key => !['plain_text', 'plain_text_en'].includes(key))) {
          return new Response(JSON.stringify({ code: '42703', message: 'Column does not exist' }), {
            status: 400, headers: { 'content-type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(row ? [row] : []), {
          status: 200, headers: { 'content-type': 'application/json' },
        })
      },
    },
  })
  const source = readFileSync(new URL('./getCelebReadingGuide.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  const requireMock = (name: string) => {
    if (name === '@feelandnote/shared/constants/cache-tags') return { CACHE_TAGS: { CELEBS: 'celebs' } }
    if (name === '@/lib/db/static') return { createStaticClient: () => db }
    if (name === '@/lib/cache') return {
      cachedDetail: (_domain: string, _id: string, _key: string[], read: () => Promise<unknown>) => read(),
    }
    throw new Error(`Unexpected module: ${name}`)
  }
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports)
  return module.exports as { getCelebReadingGuide(id: string, locale?: string): Promise<Guide | null> }
}

test('게시 컬럼과 추가 공개 조건이 없는 안내를 한영으로 읽는다', async () => {
  const reader = loadGuideReader({ plain_text: ' 한국어 안내. ', plain_text_en: ' English guide. ' })
  assert.deepEqual(await reader.getCelebReadingGuide('kim-seong-ju', 'ko'), {
    text: '한국어 안내.', locale: 'ko',
  })
  assert.deepEqual(await reader.getCelebReadingGuide('kim-seong-ju', 'en'), {
    text: 'English guide.', locale: 'en',
  })
})

test('영문이 없으면 국문을 쓰고 안내 행이 없으면 null을 반환한다', async () => {
  assert.deepEqual(await loadGuideReader({ plain_text: '안내.', plain_text_en: null })
    .getCelebReadingGuide('person', 'en'), { text: '안내.', locale: 'ko' })
  assert.equal(await loadGuideReader(null).getCelebReadingGuide('person'), null)
})
