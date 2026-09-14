/*
  파일명: /components/features/commerce/getDeveloperProducts.test.ts
  기능: 상품 미리보기의 운영·언어 차단 회귀 검증
  책임: 실제 컴포넌트와 개발자모드 판정을 실행해 차단 시 상품을 로드하지 않음을 확인한다.
*/

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type getDeveloperProducts from './getDeveloperProducts'
import type { isDeveloperMode } from '@/lib/developer-mode'

const require = createRequire(import.meta.url)

function compile(path: string) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText
}

const componentCode = compile('./getDeveloperProducts.ts')
const developerModeCode = compile('../../../lib/developer-mode.ts')

function fixture(nodeEnv: 'production' | 'test' | 'development', locale: string) {
  const gate = { exports: {} as { isDeveloperMode: typeof isDeveloperMode } }
  runInNewContext(developerModeCode, {
    module: gate,
    exports: gate.exports,
    process: { env: { NODE_ENV: nodeEnv } },
  })

  const calls = { locale: 0, productImports: [] as string[] }
  const loaded = { exports: {} as { default: typeof getDeveloperProducts } }
  runInNewContext(componentCode, {
    module: loaded,
    exports: loaded.exports,
    require: (id: string) => {
      if (id === 'server-only') return {}
      if (id === '@/lib/developer-mode') return gate.exports
      if (id === 'next-intl/server') return {
        getLocale: async () => { calls.locale++; return locale },
      }
      if (id.startsWith('./')) {
        calls.productImports.push(id)
        assert.fail(`차단 상태에서 상품 모듈을 불러왔습니다: ${id}`)
      }
      return require(id)
    },
  })

  return { component: loaded.exports.default, calls, isDeveloperMode: gate.exports.isDeveloperMode }
}

test('운영·테스트 환경은 locale 조회와 상품 로드 전에 상품 미리보기를 닫는다', async () => {
  for (const nodeEnv of ['production', 'test'] as const) {
    const { component, calls, isDeveloperMode } = fixture(nodeEnv, 'ko')
    assert.equal(isDeveloperMode(), false, nodeEnv)
    assert.equal((await component()).length, 0, nodeEnv)
    assert.equal(calls.locale, 0, nodeEnv)
    assert.deepEqual(calls.productImports, [], nodeEnv)
  }
})

test('개발 환경의 영어 화면은 locale만 확인하고 상품을 불러오지 않는다', async () => {
  const { component, calls, isDeveloperMode } = fixture('development', 'en')
  assert.equal(isDeveloperMode(), true)
  assert.equal((await component()).length, 0)
  assert.equal(calls.locale, 1)
  assert.deepEqual(calls.productImports, [])
})
