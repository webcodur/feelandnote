import assert from 'node:assert/strict'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertReleaseId,
  normalizeManifestPath,
  parseJpegDimensions,
  restoreStandaloneLinks,
} from './oracle-web-remote.mjs'

test('release id accepts deploy names and rejects path traversal', () => {
  assert.equal(assertReleaseId('bdd7d8ed-web-20260825t091917z'), 'bdd7d8ed-web-20260825t091917z')
  assert.throws(() => assertReleaseId('../current'), /Unsafe release id/u)
  assert.throws(() => assertReleaseId('WEB release'), /Unsafe release id/u)
})

test('standalone link paths stay relative to the extracted release', () => {
  assert.equal(
    normalizeManifestPath('sw\\web\\node_modules\\sharp'),
    'sw/web/node_modules/sharp',
  )
  assert.throws(() => normalizeManifestPath('../../etc/passwd'), /Unsafe manifest path/u)
  assert.throws(() => normalizeManifestPath('/opt/feelandnote/web/current'), /Unsafe manifest path/u)
  assert.throws(() => normalizeManifestPath('C:\\project\\node_modules'), /Unsafe manifest path/u)
})

test('standalone link manifest replaces the dereferenced copy with a relative link', {
  skip: process.platform === 'win32' ? 'Oracle release links are created on Linux' : false,
}, () => {
  const releaseRoot = mkdtempSync(path.join(tmpdir(), 'oracle-web-links-'))
  const targetPath = path.join(releaseRoot, 'node_modules', '.pnpm', 'pkg', 'node_modules', 'pkg')
  const linkPath = path.join(releaseRoot, 'sw', 'web', 'node_modules', 'pkg')

  try {
    mkdirSync(targetPath, { recursive: true })
    mkdirSync(linkPath, { recursive: true })
    writeFileSync(path.join(targetPath, 'marker.txt'), 'traced package')
    writeFileSync(path.join(linkPath, 'marker.txt'), 'dereferenced copy')

    const restored = restoreStandaloneLinks(releaseRoot, {
      version: 1,
      links: [{
        link: 'sw/web/node_modules/pkg',
        target: 'node_modules/.pnpm/pkg/node_modules/pkg',
      }],
    })

    assert.equal(restored, 1)
    assert.equal(lstatSync(linkPath).isSymbolicLink(), true)
    assert.equal(realpathSync(linkPath), realpathSync(targetPath))
    assert.equal(readFileSync(path.join(linkPath, 'marker.txt'), 'utf8'), 'traced package')
  } finally {
    rmSync(releaseRoot, { recursive: true, force: true })
  }
})

test('JPEG probe reads the dimensions from a start-of-frame segment', () => {
  const jpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    0x03, 0x20,
    0x03, 0x20,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ])
  assert.deepEqual(parseJpegDimensions(jpeg), { width: 800, height: 800 })
  assert.throws(() => parseJpegDimensions(Buffer.from('not-jpeg')), /not a JPEG/u)
})
