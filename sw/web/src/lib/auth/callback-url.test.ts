import assert from 'node:assert/strict'
import test from 'node:test'
import { authReturnPath, localizedAuthPath, resolveAuthCallbackUrl } from './callback-url'

function requestHeaders(values: Record<string, string>): { get(name: string): string | null } {
  return { get: (name) => values[name] ?? null }
}

test('production auth callbacks use the forwarded public host', () => {
  assert.equal(
    resolveAuthCallbackUrl(requestHeaders({
      host: '127.0.0.1:3000',
      'x-forwarded-host': 'feelandnote.com',
    })),
    'https://feelandnote.com/auth/callback',
  )
})

test('local auth callbacks stay on the local development server', () => {
  assert.equal(
    resolveAuthCallbackUrl(requestHeaders({ host: 'localhost:3000' })),
    'http://localhost:3000/auth/callback',
  )
})

test('untrusted Host headers cannot become OAuth redirects', () => {
  assert.throws(
    () => resolveAuthCallbackUrl(requestHeaders({ host: 'attacker.example' })),
    /Unsupported auth callback host/,
  )
})

test('auth return paths keep the chosen language, filters and anchors', () => {
  assert.equal(localizedAuthPath('/celeb/plato?page=2#books', 'en'), '/en/celeb/plato?page=2#books')
  assert.equal(localizedAuthPath('/en/celeb/plato?page=2#books', 'ko'), '/celeb/plato?page=2#books')
  assert.equal(localizedAuthPath('/ko/reset-password', 'en'), '/en/reset-password')
  assert.equal(localizedAuthPath('/', 'en'), '/en')
})

test('auth return paths reject external URLs and callback/API loops', () => {
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/auth/callback', '/en/api/track']) {
    assert.equal(localizedAuthPath(path, 'en', '/user/reading'), '/en/user/reading')
  }
})

test('login returns to a trusted original destination or the member library', () => {
  const headers = requestHeaders({ host: 'feelandnote.com', referer: 'https://feelandnote.com/en/login?redirect=%2Fceleb%2Fplato%3Fpage%3D2%23books' })
  assert.equal(authReturnPath(headers, 'en', '/user/reading'), '/en/celeb/plato?page=2#books')
  assert.equal(authReturnPath(requestHeaders({ host: 'feelandnote.com', referer: 'https://evil.test/login?redirect=/celeb/plato' }), 'en', '/user/reading'), '/en/user/reading')
})
