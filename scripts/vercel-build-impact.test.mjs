import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldBuildVercelProject } from './lib/vercel-build-impact.mjs'

test('documentation-only changes skip both Vercel projects', () => {
  const files = ['docs/project/operations/seo.md', 'AGENTS.md']

  assert.equal(shouldBuildVercelProject('web', files), false)
  assert.equal(shouldBuildVercelProject('web-bo', files), false)
})

test('each application builds only when its own files change', () => {
  assert.equal(shouldBuildVercelProject('web', ['sw/web/src/app/page.tsx']), true)
  assert.equal(shouldBuildVercelProject('web-bo', ['sw/web/src/app/page.tsx']), false)

  assert.equal(shouldBuildVercelProject('web', ['sw/web-bo/src/app/page.tsx']), false)
  assert.equal(shouldBuildVercelProject('web-bo', ['sw/web-bo/src/app/page.tsx']), true)
})

test('shared workspace packages and root dependency files build both projects', () => {
  for (const files of [
    ['packages/shared/src/constants/cache-tags.ts'],
    ['packages/content-search/src/index.ts'],
    ['pnpm-lock.yaml'],
    ['pnpm-workspace.yaml'],
    ['package.json'],
  ]) {
    assert.equal(shouldBuildVercelProject('web', files), true)
    assert.equal(shouldBuildVercelProject('web-bo', files), true)
  }
})

test('Remotion changes rebuild web-bo but not the public web', () => {
  const files = ['sw/remotion/src/index.ts', 'sw/remotion/package.json']

  assert.equal(shouldBuildVercelProject('web', files), false)
  assert.equal(shouldBuildVercelProject('web-bo', files), true)
})

test('local Remotion production assets do not rebuild either deployed web app', () => {
  const files = ['sw/remotion/public/episodes/example/ko.json']

  assert.equal(shouldBuildVercelProject('web', files), false)
  assert.equal(shouldBuildVercelProject('web-bo', files), false)
})

test('unrelated applications and production data do not rebuild web projects', () => {
  const files = [
    'sw/lab/src/App.tsx',
    'sw/audio-bo/src/app/page.tsx',
    'sw/web/scripts/check-egress-patterns.mjs',
    'sw/web-bo/scripts/README.md',
    'data/celeb/reading-relay/all-readings.json',
  ]

  assert.equal(shouldBuildVercelProject('web', files), false)
  assert.equal(shouldBuildVercelProject('web-bo', files), false)
})

test('unknown project names fail closed', () => {
  assert.throws(
    () => shouldBuildVercelProject('unknown', ['docs/README.md']),
    /Unknown Vercel project/,
  )
})
