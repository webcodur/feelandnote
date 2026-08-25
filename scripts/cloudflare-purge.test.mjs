import assert from 'node:assert/strict'
import test from 'node:test'
import { assertPurgeTargets } from './cloudflare-purge.mjs'
import { createManualCloudflarePurgePlan } from './lib/cloudflare-purge-impact.mjs'

test('배포 뒤 쓰는 범위는 우리 존 경로만 겨냥한다', () => {
  for (const scope of ['celeb', 'content', 'seo', 'cached-html']) {
    const plan = createManualCloudflarePurgePlan(scope, '')
    assert.doesNotThrow(() => assertPurgeTargets(plan))
    assert.ok(plan.prefixes.length + plan.files.length > 0)
  }
})

test('전체 존 퍼지는 이 CLI가 거부한다', () => {
  assert.throws(
    () => assertPurgeTargets({ scopes: ['emergency-zone'], prefixes: [], files: [], emergencyZone: true }),
    /workflow-only/,
  )
})

test('다른 host가 섞이면 거부한다', () => {
  assert.throws(
    () => assertPurgeTargets({ scopes: ['celeb'], prefixes: ['evil.example.com/'], files: [], emergencyZone: false }),
    /prefix outside/,
  )
  assert.throws(
    () => assertPurgeTargets({ scopes: ['seo'], prefixes: [], files: ['https://evil.example.com/x'], emergencyZone: false }),
    /file outside/,
  )
})

test('대상이 비면 빈 요청을 보내지 않는다', () => {
  assert.throws(
    () => assertPurgeTargets({ scopes: ['celeb'], prefixes: [], files: [], emergencyZone: false }),
    /no target/,
  )
})
