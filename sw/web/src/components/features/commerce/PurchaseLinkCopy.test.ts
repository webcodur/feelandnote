import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const code = ts.transpileModule(readFileSync(new URL('./PurchaseLinkCopy.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

async function clickCopy(href: string, denied = false) {
  const states: unknown[] = []
  const writes: string[] = []
  let hook = 0
  const exports: { default?: (props: { href: string }) => { props: { children: { props: { onClick: (event: { stopPropagation: () => void }) => void } }[] } } } = {}
  runInNewContext(code, {
    exports, URL, window: { location: { href: 'https://feelandnote.com/content/book' } },
    navigator: { clipboard: { writeText: async (value: string) => {
      if (denied) throw new Error('Clipboard denied')
      writes.push(value)
    } } },
    require: (id: string) => {
      if (id === 'react') return { useState: (initial: unknown) => {
        const index = hook++
        states[index] = initial
        return [initial, (value: unknown) => { states[index] = value }]
      } }
      if (id === 'next-intl') return { useTranslations: () => (key: string) => key }
      if (id === 'lucide-react') return { Check: 'svg', Copy: 'svg' }
      return require(id)
    },
  })
  exports.default!({ href }).props.children[0].props.onClick({ stopPropagation() {} })
  await new Promise(resolve => setImmediate(resolve))
  return { writes, states }
}

test('쿠팡 제휴 단축 주소를 추적 값 손실 없이 복사한다', async () => {
  const href = 'https://link.coupang.com/a/hGl48D1SeW'
  const result = await clickCopy(href)
  assert.deepEqual(result.writes, [href])
  assert.equal(result.states[0], 'copied')
})

test('상대 구매 경로도 다른 브라우저에서 열 수 있는 절대 주소로 복사한다', async () => {
  const result = await clickCopy('/api/books/purchase/book?seller=coupang')
  assert.deepEqual(result.writes, ['https://feelandnote.com/api/books/purchase/book?seller=coupang'])
})

test('클립보드 접근이 거부되면 원래 제휴 주소를 수동 복사하도록 보존한다', async () => {
  const href = 'https://link.coupang.com/a/hGl48D1SeW'
  const result = await clickCopy(href, true)
  assert.deepEqual(result.writes, [])
  assert.equal(result.states[0], 'manual')
  assert.equal(result.states[1], href)
})
