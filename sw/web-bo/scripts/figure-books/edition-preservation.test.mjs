import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { backfillEditionKinds } from './lib/figure-work.mjs'
import { transitionDisplayTitle } from './locale-display-title.mjs'
const manifestModule = await import('./source-book-batch-contract.ts')
const { parseFigureBookManifest } = manifestModule.default ?? manifestModule

const id = 'work-1'
const introduction = '이 책은 고대의 전쟁과 왕조에 관한 여러 이야기를 모아 소개한다.'
function fixture({ description = introduction, editions = null, current = true, stale = false, readError = false, corrupt = false } = {}) {
  const state = {
    content_locales: current ? [{ content_id: id, locale: 'ko', title: '구판 제목', isbn: '9788991290808', creator: '원저자', publisher: '출판사', thumbnail_url: 'cover', affiliate_url: null, verified: true, description, sources: { primary: 'kakao_book', description: 'https://publisher.example/old' }, updated_at: 'before' }] : [],
    contents: [{ id, external_id: '9788991290808', external_source: 'kakao_book' }],
    figure_book_editions: editions ?? [{ id: 1, content_id: id, locale: 'ko', isbn: '9788991290808', description: '판본별 다른 소개', edition_kind: 'abridged', text_scope: 'chapters-1-3' }, { id: 2, content_id: id, locale: 'ko', isbn: '9788957339893', description: '신판 소개', edition_kind: null, text_scope: null }],
    figure_book_products: [{ id: 1, edition_id: 1, is_active: false }, { id: 2, edition_id: 2, is_active: true }],
  }
  const mutations = [], backups = []
  const db = { from(table) {
    let filters = [], operation = 'read', patch
    const query = {
      select() { return query }, eq(key, value) { filters.push([key, value]); return query },
      update(value) { operation = 'update'; patch = value; return query }, insert(value) { operation = 'insert'; patch = value; return query },
      delete() { throw new Error('Destructive deletion attempted') },
      then(resolve, reject) { return Promise.resolve().then(() => {
        if (readError && operation === 'read') return { data: null, error: { message: 'read failed' } }
        let rows = state[table].filter(row => filters.every(([key, value]) => row[key] === value))
        if (operation !== 'read') {
          mutations.push({ table, operation, patch })
          assert.equal(table, 'content_locales', 'Only the locale card may change')
          if (operation === 'insert') { rows = [structuredClone(patch)]; state[table].push(...rows) }
          else if (stale) rows = []
          else for (const row of rows) Object.assign(row, structuredClone(patch))
          if (corrupt) for (const row of rows) row.title = 'unexpected'
        }
        return { data: structuredClone(rows), error: null }
      }).then(resolve, reject) },
    }
    return query
  } }
  return { state, mutations, backups, db, options: { apply: true, backup: row => backups.push(structuredClone(row)) } }
}

test('single-volume title cannot turn unknown, abridged or selected scopes into complete', async () => {
  const editions = [{ edition_kind: null, text_scope: null }, { edition_kind: 'abridged', text_scope: 'chapters-1-3' }, { edition_kind: 'selection', text_scope: 'selected-poems' }]
  const before = structuredClone(editions)
  const db = { from() { throw new Error('Title-only scope inference attempted a DB write') } }
  assert.equal(await backfillEditionKinds(db, ['unknown', 'abridged', 'selection'], new Map([['unknown', '오디세이아'], ['abridged', '삼국지'], ['selection', 'Selected Poems']])), 0)
  assert.deepEqual(editions, before)
})

test('display conversion preserves both old and new editions, all product histories and representative ISBN', async () => {
  const f = fixture(), before = structuredClone(f.state)
  const result = await transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'translated', title: '표시용 제목' }, f.options)
  assert.equal(result.retainedEditions, 2)
  for (const table of ['contents', 'figure_book_editions', 'figure_book_products']) assert.deepEqual(f.state[table], before[table])
  assert.equal(f.state.content_locales[0].description, introduction)
  assert.equal(f.state.content_locales[0].creator, '원저자')
  assert.equal(f.state.content_locales[0].isbn, null)
  assert.equal(f.state.content_locales[0].sources.description, 'https://publisher.example/old')
  assert.deepEqual(f.backups[0].row, before.content_locales[0])
  assert.deepEqual(f.backups[0].editions, before.figure_book_editions)
  assert.equal(f.mutations.length, 1)
})

test('edition-only introduction is retained even when the display card has no introduction', async () => {
  const f = fixture({ description: null }), before = structuredClone(f.state.figure_book_editions)
  assert.ok(!(await transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'original' }, f.options)).skip)
  assert.deepEqual(f.state.figure_book_editions, before)
})

test('unresolved ISBN-based introduction blocks conversion without any writes or deletion', async () => {
  const f = fixture({ description: 'DAUM' }), before = structuredClone(f.state)
  assert.equal((await transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'translated' }, f.options)).skip, 'introduction')
  assert.deepEqual(f.state, before)
  assert.equal(f.mutations.length, 0)
})

test('dry-run performs no mutation or backup', async () => {
  const f = fixture(), before = structuredClone(f.state)
  await transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'translated' }, { ...f.options, apply: false })
  assert.deepEqual(f.state, before)
  assert.equal(f.backups.length, 0)
  assert.equal(f.mutations.length, 0)
})

test('creating a display card retains existing editions and uses explicit null metadata', async () => {
  const f = fixture({ current: false }), before = structuredClone(f.state.figure_book_editions)
  assert.equal((await transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'translated', title: '표시용 제목', create: true }, f.options)).created, true)
  assert.deepEqual(f.state.figure_book_editions, before)
  assert.equal(f.state.content_locales[0].isbn, null)
  assert.equal(f.backups[0].row, null)
})

test('read failure, concurrent edits and differing same-ID requery cannot be reported as success', async () => {
  for (const setting of [{ readError: true }, { stale: true }, { corrupt: true }]) {
    const f = fixture(setting)
    await assert.rejects(transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'translated' }, f.options), /read failed|changed since inspection|saved row differs/)
  }
})

test('backup failure stops before card writes', async () => {
  const f = fixture()
  await assert.rejects(transitionDisplayTitle(f.db, { id, locale: 'ko', mark: 'translated' }, { apply: true, backup() { throw new Error('backup failed') } }), /backup failed/)
  assert.equal(f.mutations.length, 0)
})

test('candidate manifest does not infer a complete text from a one-volume title', () => {
  const dir = mkdtempSync(join(tmpdir(), 'figure-edition-test-'))
  try {
    const queue = join(dir, 'queue.json'), out = join(dir, 'manifests')
    writeFileSync(queue, JSON.stringify({ fresh: [{ kakao: { isbn: '9788991290808', title: '선집', authors: ['원저자'] } }] }))
    execFileSync(process.execPath, [fileURLToPath(new URL('./appearance-manifests.mjs', import.meta.url)), '--queue', queue, '--out-dir', out], { stdio: 'pipe' })
    const manifest = JSON.parse(readFileSync(join(out, '9788991290808.json'), 'utf8'))
    assert.deepEqual(manifest.edition, { kind: null, scope: null })
    assert.throws(() => parseFigureBookManifest(manifest), /edition.kind/)
    assert.deepEqual(parseFigureBookManifest({ ...manifest, edition: { kind: 'selection', scope: 'selected-poems' } }).edition, { kind: 'selection', scope: 'selected-poems' })
  } finally { rmSync(dir, { recursive: true }) }
})
