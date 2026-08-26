import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveAuthCallbackUrl } from './callback-url'

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
