import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  shouldBuildVercelProject,
  VERCEL_BUILD_DIFF_FILTER,
} from './lib/vercel-build-impact.mjs'

function runGit(repositoryRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  })

  assert.equal(
    result.status,
    0,
    result.stderr.trim() || `git ${args.join(' ')} exited with ${result.status}`,
  )

  return result.stdout.trim()
}

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

test('deletion-only application changes rebuild the affected Vercel projects', (t) => {
  const temporaryRoot = path.resolve(tmpdir())
  const repositoryRoot = mkdtempSync(path.join(temporaryRoot, 'feelandnote-vercel-impact-'))
  const relativeRepositoryRoot = path.relative(temporaryRoot, repositoryRoot)

  assert.ok(relativeRepositoryRoot && !relativeRepositoryRoot.startsWith('..'))
  assert.equal(path.isAbsolute(relativeRepositoryRoot), false)
  t.after(() => rmSync(repositoryRoot, { recursive: true, force: true }))

  const webFile = 'sw/web/src/deleted-page.tsx'
  const webBoFile = 'sw/web-bo/src/deleted-page.tsx'

  for (const file of [webFile, webBoFile]) {
    const absoluteFile = path.join(repositoryRoot, file)
    mkdirSync(path.dirname(absoluteFile), { recursive: true })
    writeFileSync(absoluteFile, 'export default function Page() {}\n')
  }

  runGit(repositoryRoot, ['init', '--quiet'])
  runGit(repositoryRoot, ['config', 'user.name', 'Vercel Build Impact Test'])
  runGit(repositoryRoot, ['config', 'user.email', 'vercel-build-impact@example.invalid'])
  runGit(repositoryRoot, ['add', '--all'])
  runGit(repositoryRoot, ['commit', '--quiet', '-m', 'add application files'])
  const previousSha = runGit(repositoryRoot, ['rev-parse', 'HEAD'])

  rmSync(path.join(repositoryRoot, webFile))
  rmSync(path.join(repositoryRoot, webBoFile))
  runGit(repositoryRoot, ['add', '--all'])
  runGit(repositoryRoot, ['commit', '--quiet', '-m', 'delete application files'])
  const currentSha = runGit(repositoryRoot, ['rev-parse', 'HEAD'])

  const changedFiles = runGit(repositoryRoot, [
    'diff',
    '--name-only',
    '--no-renames',
    `--diff-filter=${VERCEL_BUILD_DIFF_FILTER}`,
    previousSha,
    currentSha,
    '--',
  ]).split(/\r?\n/u).filter(Boolean)

  assert.deepEqual(new Set(changedFiles), new Set([webFile, webBoFile]))
  assert.equal(shouldBuildVercelProject('web', changedFiles), true)
  assert.equal(shouldBuildVercelProject('web-bo', changedFiles), true)
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
