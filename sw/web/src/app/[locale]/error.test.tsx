import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import * as React from 'react'
import ts from 'typescript'
import { getGlobalErrorCopy } from '../../lib/i18n/globalError'

const require = createRequire(import.meta.url)
const { ErrorBoundaryHandler } = require('next/dist/client/components/error-boundary')
const compiled = ts.transpileModule(readFileSync(new URL('./error.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

type ButtonProps = { children?: React.ReactNode; onClick?: () => void }

function findRetry(node: React.ReactNode, label: string): React.ReactElement<ButtonProps> | undefined {
  if (!React.isValidElement<ButtonProps>(node)) return
  if (node.type === 'button' && node.props.children === label) return node
  for (const child of React.Children.toArray(node.props.children)) {
    const found = findRetry(child, label)
    if (found) return found
  }
}

for (const locale of ['ko', 'en'] as const) {
  test(`retry requests a new document after a server render failure (${locale})`, () => {
    const pathname = `${locale === 'en' ? '/en' : ''}/celeb/bill-gates`
    let documentRequests = 0
    const location = { pathname, search: '?tab=books', hash: '#records', reload: () => { documentRequests++ } }
    const mocks = {
      react: {
        ...React,
        useState: (value: unknown) => [typeof value === 'function' ? value() : value, () => {}],
        useEffect: () => {},
      },
      '@/lib/i18n/globalError': { getGlobalErrorCopy },
    }
    const loaded = { exports: {} as { default: (props: { error: Error; reset: () => void }) => React.ReactNode } }
    new Function('require', 'module', 'exports', 'window', compiled)(
      (id: string) => mocks[id as keyof typeof mocks] ?? require(id), loaded, loaded.exports, { location },
    )

    // Next 16.1의 실제 reset은 실패한 서버 자식 결과를 새로 가져오지 않는다.
    const error = new Error('Server render failed')
    const failedServerResult = Promise.reject(error)
    void failedServerResult.catch(() => {})
    const boundary = new ErrorBoundaryHandler({ pathname, children: failedServerResult })
    boundary.state = { error, previousPathname: pathname }
    boundary.setState = (state: object) => { boundary.state = { ...boundary.state, ...state } }
    const view = loaded.exports.default({ error, reset: boundary.reset })
    const retry = findRetry(view, getGlobalErrorCopy(locale).retry)
    assert.ok(retry?.props.onClick)
    retry.props.onClick()
    assert.equal(documentRequests, 1, 'retry must fetch a new document, not reuse the rejected server result')
    assert.equal(location.pathname, pathname)
    assert.equal(location.search, '?tab=books')
    assert.equal(location.hash, '#records')
  })
}
