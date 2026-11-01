import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const origin = 'http://localhost:3000'

function workerFixture({ offline = false } = {}) {
  const handlers = new Map()
  const cached = new Map()
  let cacheReads = 0
  const cache = {
    match: async request => { cacheReads++; return cached.get(request.url ?? request) },
    put: async (request, response) => cached.set(request.url, response),
    keys: async () => [...cached.keys()],
    delete: async key => cached.delete(key),
  }
  runInNewContext(readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin }, addEventListener: (name, handler) => handlers.set(name, handler) },
    caches: { open: async () => cache },
    fetch: async () => { if (offline) throw new Error('offline'); return new Response('network') }, URL, Request, Response,
  })
  return {
    cached,
    reads: () => cacheReads,
    async request(path, init, navigation = false) {
      let response
      const request = new Request(origin + path, init)
      if (navigation) Object.defineProperty(request, 'mode', { value: 'navigate' })
      handlers.get('fetch')({ request, respondWith: value => { response = value } })
      return response ? (await response).text() : null
    },
  }
}

test('주소가 고정된 개발 번들은 오래된 캐시가 있어도 사용하지 않는다', async () => {
  const fixture = workerFixture()
  const path = '/_next/static/chunks/app/%5Blocale%5D/(main)/page.js'
  fixture.cached.set(origin + path, new Response('old-renderer'))
  assert.equal(await fixture.request(path), null)
  assert.equal(fixture.reads(), 0)
})

test('내용 해시가 있는 운영 번들은 캐시를 유지한다', async () => {
  const fixture = workerFixture()
  const path = '/_next/static/chunks/app/page-12345678abcdef90.js'
  fixture.cached.set(origin + path, new Response('immutable-renderer'))
  assert.equal(await fixture.request(path), 'immutable-renderer')
})

test('개발 hot-update와 강제 재요청은 캐시하지 않는다', async () => {
  const fixture = workerFixture()
  assert.equal(await fixture.request('/_next/static/webpack/abcdef123456.hot-update.js'), null)
  assert.equal(await fixture.request('/_next/static/chunks/page-1234567890.js', { cache: 'reload' }), null)
  assert.equal(await fixture.request('/_next/static/chunks/page-1234567890.js', { cache: 'no-store' }), null)
  assert.equal(fixture.reads(), 0)
})

test('API·인증·RSC·Server Action은 계속 캐시를 우회한다', async () => {
  const fixture = workerFixture()
  for (const [path, init] of [
    ['/api/profile'], ['/auth/callback'], ['/?_rsc=abc'],
    ['/', { headers: { RSC: '1' } }], ['/', { method: 'POST', headers: { 'Next-Action': 'abc' } }],
  ]) assert.equal(await fixture.request(path, init), null)
  assert.equal(fixture.reads(), 0)
})

test('오프라인에서 문서를 새로고침해도 기존 대체 화면을 제공한다', async () => {
  const fixture = workerFixture({ offline: true })
  fixture.cached.set('/offline.html', new Response('offline page'))
  assert.equal(await fixture.request('/', { cache: 'reload' }, true), 'offline page')
})

async function registrarFixture({ environment = 'development', controlled = true, own = true } = {}) {
  let effect
  const calls = { unregister: 0, reload: 0, register: 0 }
  const worker = { scriptURL: `${origin}${own ? '/sw.js' : '/another-worker.js'}` }
  const workers = {
    controller: controlled ? worker : null,
    getRegistrations: async () => [{ active: worker, waiting: null, installing: null,
      unregister: async () => { calls.unregister++; return true } }],
    register: async () => { calls.register++ },
  }
  const loadedModule = { exports: {} }
  const source = ts.transpileModule(readFileSync(new URL('./ServiceWorkerRegistrar.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  runInNewContext(source, {
    module: loadedModule, exports: loadedModule.exports, URL, console,
    require: id => id === 'react/jsx-runtime'
      ? { jsx: (type, props) => ({ type, props }) }
      : { useEffect: callback => { effect = callback } },
    process: { env: { NODE_ENV: environment } }, navigator: { serviceWorker: workers },
    window: { location: { origin, reload: () => { calls.reload++ } } },
  })
  const element = loadedModule.exports.default()
  effect()
  if (element?.type === 'script') {
    runInNewContext(element.props.dangerouslySetInnerHTML.__html, {
      URL, console, navigator: { serviceWorker: workers },
      location: { origin, reload: () => { calls.reload++ } },
    })
  }
  await new Promise(resolve => setImmediate(resolve))
  return calls
}

test('개발에서는 기존 필앤노트 워커를 해제하고 제어 중인 문서를 다시 연다', async () => {
  assert.deepEqual(await registrarFixture(), { unregister: 1, reload: 1, register: 0 })
})

test('개발에서도 다른 워커는 건드리지 않으며 제어 중이지 않으면 새로고침하지 않는다', async () => {
  assert.deepEqual(await registrarFixture({ own: false }), { unregister: 0, reload: 0, register: 0 })
  assert.deepEqual(await registrarFixture({ controlled: false }), { unregister: 1, reload: 0, register: 0 })
})

test('운영에서는 기존처럼 서비스 워커를 등록한다', async () => {
  assert.deepEqual(await registrarFixture({ environment: 'production' }), { unregister: 0, reload: 0, register: 1 })
})
