import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { createReleaseArchive } from '../oracle-web-deploy.mjs'

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
