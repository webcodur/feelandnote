import assert from 'node:assert/strict'
import { test } from 'node:test'
import path from 'node:path'
import sharp from 'sharp'
import {
  applyCasFilter,
  buildCasFilter,
  fixedKeyFor,
  formatJournalLine,
  parseCliArgs,
  sha256,
  transformReviewedImage,
  validateManifestRows,
  verifyTransformedImage,
  withCacheBuster,
} from './myth-image-register.mjs'

const ID = '123e4567-e89b-42d3-a456-426614174000'
const ABSOLUTE_SOURCE = path.resolve('test-assets', 'approved.png')

function row(overrides = {}) {
  return {
    celeb_id: ID,
    slug: 'nekhbet',
    slot: 'portrait',
    approved_source_path: ABSOLUTE_SOURCE,
    expected_prior_db_url: null,
    ...overrides,
  }
}

test('manifest validation preserves explicit null and normalizes a reviewed row', () => {
  const [result] = validateManifestRows([row()])
  assert.equal(result.celeb_id, ID)
  assert.equal(result.slot, 'portrait')
  assert.equal(result.expected_prior_db_url, null)
  assert.equal(result.approved_source_path, path.normalize(ABSOLUTE_SOURCE))
})

test('manifest validation accepts the { images } envelope', () => {
  assert.equal(validateManifestRows({ images: [row()] }).length, 1)
})

test('manifest validation rejects a missing expected URL instead of confusing it with null', () => {
  const input = row()
  delete input.expected_prior_db_url
  assert.throws(() => validateManifestRows([input]), /expected_prior_db_url/)
})

test('manifest validation rejects unsafe identity, relative source, and duplicate slot', () => {
  assert.throws(() => validateManifestRows([row({ celeb_id: 'not-a-uuid' })]), /UUID/)
  assert.throws(() => validateManifestRows([row({ slug: '../nekhbet' })]), /slug/)
  assert.throws(() => validateManifestRows([row({ slug: 'nekhbet:bad' })]), /slug/)
  assert.throws(() => validateManifestRows([row({ slug: 'nekhbet*bad' })]), /slug/)
  assert.throws(() => validateManifestRows([row({ approved_source_path: 'relative.png' })]), /절대 경로/)
  assert.throws(() => validateManifestRows([row(), row()]), /중복 등록/)
})

test('manifest validation accepts only HTTP(S) expected URLs', () => {
  assert.throws(
    () => validateManifestRows([row({ expected_prior_db_url: 'file:///tmp/old.webp' })]),
    /HTTP\(S\)/,
  )
  assert.equal(
    validateManifestRows([row({ expected_prior_db_url: 'https://assets.example/old.webp?v=1' })])[0]
      .expected_prior_db_url,
    'https://assets.example/old.webp?v=1',
  )
})

test('portrait transformation decodes to exact 4:5 WebP and reports its SHA-256', async () => {
  const source = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: '#7f451f' },
  }).png().toBuffer()
  const transformed = await transformReviewedImage(source, 'portrait')
  const verified = await verifyTransformedImage(transformed, 'portrait')
  assert.deepEqual(
    { format: verified.format, width: verified.width, height: verified.height },
    { format: 'webp', width: 1080, height: 1350 },
  )
  assert.equal(verified.sha256, sha256(transformed))
})

test('awakened transformation decodes to exact square WebP', async () => {
  const source = await sharp({
    create: { width: 800, height: 1200, channels: 4, background: '#182236ff' },
  }).png().toBuffer()
  const transformed = await transformReviewedImage(source, 'awakened')
  const verified = await verifyTransformedImage(transformed, 'awakened')
  assert.equal(verified.width, 1080)
  assert.equal(verified.height, 1080)
})

test('CAS filter distinguishes SQL null from string equality', () => {
  assert.deepEqual(
    buildCasFilter('portrait_url', null),
    { method: 'is', column: 'portrait_url', value: null },
  )
  assert.deepEqual(
    buildCasFilter('awakened_image_url', 'https://assets.example/old.webp?v=1'),
    {
      method: 'eq',
      column: 'awakened_image_url',
      value: 'https://assets.example/old.webp?v=1',
    },
  )
})

test('CAS filter applicator calls only the selected query method', () => {
  const calls = []
  const query = {
    is(column, value) { calls.push(['is', column, value]); return this },
    eq(column, value) { calls.push(['eq', column, value]); return this },
  }
  assert.equal(applyCasFilter(query, buildCasFilter('portrait_url', null)), query)
  assert.deepEqual(calls, [['is', 'portrait_url', null]])
})

test('journal formatter emits exactly one parseable JSONL record', () => {
  const line = formatJournalLine({ event: 'success', slug: 'nekhbet', note: 'line\nbreak' })
  assert.equal(line.endsWith('\n'), true)
  assert.equal(line.split('\n').length, 2)
  assert.deepEqual(JSON.parse(line), { event: 'success', slug: 'nekhbet', note: 'line\nbreak' })
})

test('cache buster replaces v while preserving other query parameters and null', () => {
  assert.equal(withCacheBuster(null, 'rollback-1'), null)
  assert.equal(
    withCacheBuster('https://assets.example/photo.webp?keep=yes&v=old', 'rollback-1'),
    'https://assets.example/photo.webp?keep=yes&v=rollback-1',
  )
})

test('fixed keys and CLI default dry-run are deterministic', () => {
  assert.equal(fixedKeyFor(row()), `celebs/${ID}/photo.webp`)
  assert.equal(fixedKeyFor(row({ slot: 'awakened' })), `celebs/${ID}/awakened.webp`)
  assert.deepEqual(parseCliArgs(['reviewed.json']), {
    manifestPath: 'reviewed.json', apply: false, backupRoot: null, journalPath: null,
  })
  assert.equal(parseCliArgs(['reviewed.json', '--apply']).apply, true)
})
