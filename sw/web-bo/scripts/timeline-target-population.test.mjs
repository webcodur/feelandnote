import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  computeTimelineTargetPopulation,
  hashTimelineTargetPopulation,
} from './lib/timeline-target-population.mjs'
import {
  exportMissingManifest,
  fetchAllPages,
  parseArgs,
  writeManifestAtomically,
} from './timeline-export-missing-manifest.mjs'

function celeb(overrides) {
  return {
    id: 'id-default',
    slug: 'default',
    nickname: '기본',
    nickname_en: 'Default',
    celeb_tier: 'full',
    publication_status: 'active',
    birth_date: '1900',
    death_date: '1980',
    profession: 'other',
    nationality: 'KR',
    wikidata_qid: null,
    ...overrides,
  }
}

function fakeDb(tableRows, requests = []) {
  return {
    from(table) {
      const state = { table, columns: null, count: null, order: null }
      return {
        select(columns, options) {
          state.columns = columns
          state.count = options?.count
          return this
        },
        order(column, options) {
          state.order = { column, ...options }
          return this
        },
        async range(from, to) {
          requests.push({ ...state, from, to })
          const rows = tableRows[table] ?? []
          return { data: rows.slice(from, to + 1), error: null, count: rows.length }
        },
      }
    },
  }
}

test('population includes inactive, suspended, fiction, and unknown life dates', () => {
  const celebs = [
    celeb({ id: 'covered', slug: 'covered' }),
    celeb({ id: 'inactive', slug: 'inactive', publication_status: 'inactive' }),
    celeb({ id: 'suspended', slug: 'suspended', publication_status: 'suspended' }),
    celeb({ id: 'fiction', slug: 'fiction', celeb_tier: 'fiction', birth_date: null, death_date: null }),
    celeb({ id: 'unknown', slug: 'unknown', celeb_tier: null, birth_date: null, death_date: null }),
  ]

  const result = computeTimelineTargetPopulation({
    celebs,
    eventOwnerIds: ['covered', 'covered'],
    declaredCelebTotal: 5,
    declaredEventTotal: 2,
  })

  assert.deepEqual(result.missingCelebs.map((person) => person.celebId), [
    'fiction',
    'inactive',
    'suspended',
    'unknown',
  ])
  assert.deepEqual(result.counts, {
    totalCelebs: 5,
    withTimeline: 1,
    timelineEventRows: 2,
    missingTotal: 4,
  })
})

test('population order and hash do not depend on input order or repeated event owners', () => {
  const alpha = celeb({ id: 'id-a', slug: 'alpha', nickname: '알파' })
  const beta = celeb({ id: 'id-b', slug: 'beta', nickname: '베타' })
  const first = computeTimelineTargetPopulation({ celebs: [beta, alpha], eventOwnerIds: [] })
  const second = computeTimelineTargetPopulation({ celebs: [alpha, beta], eventOwnerIds: [] })

  assert.deepEqual(first.missingCelebs, second.missingCelebs)
  assert.equal(first.hash.value, second.hash.value)
  assert.equal(first.hash.value, hashTimelineTargetPopulation(first.missingCelebs))

  const covered = computeTimelineTargetPopulation({
    celebs: [alpha, beta],
    eventOwnerIds: ['id-a', 'id-a'],
  })
  assert.equal(covered.counts.withTimeline, 1)
  assert.equal(covered.counts.timelineEventRows, 2)
})

test('population rejects null identities, duplicates, or inconsistent totals', () => {
  assert.throws(
    () => computeTimelineTargetPopulation({ celebs: [celeb({ id: null })], eventOwnerIds: [] }),
    /id must be a non-empty string/,
  )
  assert.throws(
    () => computeTimelineTargetPopulation({
      celebs: [celeb({ id: 'same', slug: 'a' }), celeb({ id: 'same', slug: 'b' })],
      eventOwnerIds: [],
    }),
    /duplicate celeb id/,
  )
  assert.throws(
    () => computeTimelineTargetPopulation({ celebs: [celeb()], eventOwnerIds: [null] }),
    /eventOwnerIds\[0\]/,
  )
  assert.throws(
    () => computeTimelineTargetPopulation({ celebs: [celeb()], eventOwnerIds: ['missing'] }),
    /unknown celeb id/,
  )
  assert.throws(
    () => computeTimelineTargetPopulation({
      celebs: [celeb()],
      eventOwnerIds: [],
      declaredCelebTotal: 2,
    }),
    /celeb total mismatch/,
  )
})

test('fetchAllPages uses deterministic 1000-row pagination and exact totals', async () => {
  const rows = Array.from({ length: 2001 }, (_, index) => ({ id: `id-${index}` }))
  const requests = []
  const result = await fetchAllPages(fakeDb({ celebs: rows }, requests), {
    table: 'celebs',
    columns: 'id',
  })

  assert.equal(result.exactTotal, 2001)
  assert.equal(result.rows.length, 2001)
  assert.deepEqual(requests.map(({ from, to }) => [from, to]), [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ])
  assert.ok(requests.every((request) => request.count === 'exact'))
  assert.ok(requests.every((request) => (
    request.order.column === 'id' && request.order.ascending === true
  )))
})

test('fetchAllPages rejects duplicate or null row keys', async () => {
  await assert.rejects(
    fetchAllPages(fakeDb({ celebs: [{ id: 'same' }, { id: 'same' }] }), {
      table: 'celebs',
      columns: 'id',
    }),
    /duplicate id/,
  )
  await assert.rejects(
    fetchAllPages(fakeDb({ celebs: [{ id: null }] }), {
      table: 'celebs',
      columns: 'id',
    }),
    /id is null or empty/,
  )
})

test('check-only reads and validates without invoking a file writer', async () => {
  const tables = {
    celebs: [celeb({ id: 'missing', slug: 'missing' })],
    celeb_timeline_events: [],
  }
  let writeCalls = 0
  const result = await exportMissingManifest({
    db: fakeDb(tables),
    checkOnly: true,
    outputPath: null,
    generatedAt: '2026-08-09T00:00:00.000Z',
    writer: () => { writeCalls += 1 },
  })

  assert.equal(result.mode, 'check-only')
  assert.equal(result.outputPath, null)
  assert.equal(result.counts.missingTotal, 1)
  assert.equal(writeCalls, 0)
})

test('normal export writes durable JSON once and refuses overwrite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'timeline-manifest-test-'))
  const outputPath = join(directory, 'manifest.json')
  const manifest = { hash: { value: 'stable-hash' }, missingCelebs: [] }
  try {
    writeManifestAtomically(outputPath, manifest)
    assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), manifest)
    assert.throws(() => writeManifestAtomically(outputPath, manifest), /refusing to overwrite/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('CLI requires an explicit JSON output except in check-only mode', () => {
  assert.throws(() => parseArgs([]), /--output is required/)
  assert.deepEqual(parseArgs(['--check-only']), {
    checkOnly: true,
    help: false,
    outputPath: null,
  })
  assert.throws(
    () => parseArgs(['--check-only', '--output', 'manifest.json']),
    /cannot be combined/,
  )
  assert.throws(() => parseArgs(['--output', 'manifest.txt']), /\.json file/)
})
