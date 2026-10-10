import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { collectStandaloneLinks, createReleaseArchive, normalizeStandaloneCacheHandler, removeTaskRoot } from '../oracle-web-deploy.mjs'

test('archive uses its own gzip path and preserves files plus dereferenced directory links', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'fn-archive-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const source = path.join(root, 'source')
  const output = path.join(root, 'unpacked')
  mkdirSync(path.join(source, 'module'), { recursive: true })
  mkdirSync(output)
  writeFileSync(path.join(source, 'module/file.txt'), 'standalone payload')
  symlinkSync(path.join(source, 'module'), path.join(source, 'linked-module'), 'junction')
  const archive = path.join(root, 'release.tar.gz')
  createReleaseArchive(source, archive)
  const unpack = spawnSync('tar', ['-xzf', archive, '-C', output], { encoding: 'utf8' })
  assert.equal(unpack.status, 0, unpack.stderr)
  assert.equal(readFileSync(path.join(output, 'module/file.txt'), 'utf8'), 'standalone payload')
  assert.equal(readFileSync(path.join(output, 'linked-module/file.txt'), 'utf8'), 'standalone payload')
})

test('link manifests distinguish internal POSIX links from source worktree junctions', t => {
  const repo = mkdtempSync(path.join(tmpdir(), 'fn-standalone-links-'))
  t.after(() => rmSync(repo, { recursive: true, force: true }))
  const standalone = path.join(repo, 'sw/web/.next-verify/standalone')
  const packagePath = 'node_modules/.pnpm/next/node_modules/next'
  const traced = path.join(standalone, packagePath)
  const source = path.join(repo, packagePath)
  mkdirSync(traced, { recursive: true })
  mkdirSync(source, { recursive: true })
  writeFileSync(path.join(traced, 'index.js'), 'traced')
  const appModules = path.join(standalone, 'sw/web/node_modules')
  mkdirSync(appModules, { recursive: true })
  symlinkSync(path.relative(appModules, traced), path.join(appModules, 'next-posix'), 'dir')
  symlinkSync(source, path.join(appModules, 'next-junction'), 'junction')
  assert.deepEqual(collectStandaloneLinks(repo, standalone), { version: 1, links: [
    { link: 'sw/web/node_modules/next-junction', target: packagePath },
    { link: 'sw/web/node_modules/next-posix', target: packagePath },
  ] })
  const outside = mkdtempSync(path.join(tmpdir(), 'fn-standalone-outside-'))
  t.after(() => rmSync(outside, { recursive: true, force: true }))
  symlinkSync(outside, path.join(appModules, 'outside'), 'junction')
  assert.throws(() => collectStandaloneLinks(repo, standalone), /outside its build worktree/)
})

test('temporary cleanup resolves parent aliases before validating the temp boundary', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'fn-cleanup-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const alias = path.join(root, 'alias')
  symlinkSync(root, alias, 'junction')
  const task = path.join(root, 'feelandnote-oracle-cleanup-test')
  mkdirSync(task)
  removeTaskRoot({ taskRoot: path.join(alias, path.basename(task)) })
  assert.equal(existsSync(task), false)
  assert.throws(() => removeTaskRoot({ taskRoot: root }), /Refusing to clean/)
})


function cacheHandlerFixture(t, handler, serverHandler = handler) {
  const root = mkdtempSync(path.join(tmpdir(), 'fn-cache-path-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, '.next-verify'))
  mkdirSync(path.join(root, 'scripts'))
  writeFileSync(path.join(root, 'scripts/shared-data-cache.cjs'), 'module.exports = class Cache {}')
  const manifest = path.join(root, '.next-verify/required-server-files.json')
  const server = path.join(root, 'server.js')
  writeFileSync(manifest, JSON.stringify({ config: { cacheHandler: handler, deploymentId: 'same-build' } }))
  writeFileSync(server, 'const nextConfig = ' + JSON.stringify({ cacheHandler: serverHandler, deploymentId: 'same-build' }) + '\n')
  return { root, manifest, server }
}

test('Windows cache-handler paths are normalized in both standalone configuration copies', t => {
  const f = cacheHandlerFixture(t, '..\\scripts\\shared-data-cache.cjs')
  assert.equal(normalizeStandaloneCacheHandler(f.root), '../scripts/shared-data-cache.cjs')
  assert.deepEqual(JSON.parse(readFileSync(f.manifest, 'utf8')).config, {
    cacheHandler: '../scripts/shared-data-cache.cjs', deploymentId: 'same-build',
  })
  const serverConfig = JSON.parse(readFileSync(f.server, 'utf8').replace(/^const nextConfig = /u, ''))
  assert.equal(serverConfig.cacheHandler, '../scripts/shared-data-cache.cjs')
  assert.equal(serverConfig.deploymentId, 'same-build')
  assert.equal(path.posix.normalize('/app/.next-verify/' + serverConfig.cacheHandler), '/app/scripts/shared-data-cache.cjs')
  assert.equal(normalizeStandaloneCacheHandler(f.root), '../scripts/shared-data-cache.cjs')
})

test('Linux cache-handler paths and old releases without a handler stay unchanged', t => {
  const f = cacheHandlerFixture(t, '../scripts/shared-data-cache.cjs')
  const original = readFileSync(f.server, 'utf8')
  assert.equal(normalizeStandaloneCacheHandler(f.root), '../scripts/shared-data-cache.cjs')
  assert.equal(readFileSync(f.server, 'utf8'), original)
  const old = cacheHandlerFixture(t, undefined)
  assert.equal(normalizeStandaloneCacheHandler(old.root), null)
})

test('packaging rejects mismatched, absolute, encoded or unexpected cache-handler paths before writing', t => {
  for (const handler of ['C:\\build\\cache.cjs', '/outside/cache.cjs', '..%5Cscripts%5Cshared-data-cache.cjs', '../../elsewhere.cjs']) {
    const f = cacheHandlerFixture(t, handler)
    const original = readFileSync(f.manifest, 'utf8')
    assert.throws(() => normalizeStandaloneCacheHandler(f.root), /Unexpected standalone cache handler path/u)
    assert.equal(readFileSync(f.manifest, 'utf8'), original)
  }
  const f = cacheHandlerFixture(t, '..\\scripts\\shared-data-cache.cjs', '../scripts/shared-data-cache.cjs')
  assert.throws(() => normalizeStandaloneCacheHandler(f.root), /configuration copies differ/u)
})
