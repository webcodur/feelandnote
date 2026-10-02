import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'
import { createClient } from '@feelandnote/db'
import * as figureWork from './lib/figure-work.mjs'

process.env.KAKAO_REST_API_KEY = 'test-only'
const guards = await import('./lib/verified-batch-edition.mjs')
const koIsbn = '9788991290808', enIsbn = '9780140432169'
const scripts = ['bulk-register-books', 'en-edition-fill', 'translated-original-work']

function fixture(script) {
  const ko = script === 'bulk-register-books'
  const id = figureWork.deterministicContentId(`book/${koIsbn}`)
  const tables = {
    contents: [{ id, type: 'BOOK', external_id: ko ? enIsbn : koIsbn, metadata: { workKey: '/works/OL1W', figureBook: {
      workIdentity: `book/${koIsbn}`, workTitle: ko ? '수상록' : 'The Essays', workCreator: ko ? '프랜시스 베이컨' : 'Francis Bacon',
      editionKind: 'abridged', textScope: 'KO-only chapters 1–3',
    } } }],
    figure_book_contents: [{ content_id: id }],
    content_locales: [{ content_id: id, locale: 'ko', title: '수상록', creator: '프랜시스 베이컨', isbn: ko ? null : koIsbn }],
    figure_book_editions: ko ? [] : [{ id: 1, content_id: id, locale: 'ko', isbn: koIsbn }],
  }
  const state = { writes: [], files: [], requests: [], language: ['/languages/eng'], providerIsbn: enIsbn, providerTitle: 'The Essays',
    workTitle: 'The Essays', workKey: '/works/OL1W', author: 'Francis Bacon', kakaoIsbn: koIsbn,
    candidate: { contentId: id, verdict: 'resolved', original: { title: 'The Essays', author: 'Francis Bacon' },
      en: { isbn: enIsbn, title: 'The Essays', authors: ['Francis Bacon'], languages: ['/languages/eng'] } },
    queue: { fresh: [{ kakao: { isbn: koIsbn, title: '수상록', authors: ['프랜시스 베이컨'] } }] } }
  const db = createClient('https://db.test', 'test-only', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (value, init) => {
      const url = new URL(String(value)), table = url.pathname.split('/').at(-1), method = init?.method ?? 'GET'
      assert.ok(table in tables, 'unexpected table ' + table)
      state.requests.push({ url, table, method })
      if (table === 'contents' && method === 'PATCH') state.beforeContentPatch?.()
      const matches = row => [...url.searchParams].every(([key, filter]) => {
        if (key === 'metadata' && filter.startsWith('eq.')) return isDeepStrictEqual(row.metadata, JSON.parse(filter.slice(3)))
        if (filter === 'is.null') return row[key] == null
        if (filter.startsWith('eq.')) return String(row[key]) === filter.slice(3)
        if (filter.startsWith('neq.')) return String(row[key]) !== filter.slice(4)
        if (filter.startsWith('in.')) return filter.slice(4, -1).split(',').includes(String(row[key]))
        return true
      })
      const respond = rows => {
        if (new Headers(init.headers).get('accept') === 'application/vnd.pgrst.object+json') {
          return rows.length === 1 ? Response.json(rows[0])
            : Response.json({ code: 'PGRST116', message: 'Expected one row', details: `The result contains ${rows.length} rows` }, { status: 406 })
        }
        return Response.json(rows)
      }
      if (method === 'GET') return respond(tables[table].filter(matches))
      const body = JSON.parse(String(init.body))
      if (method === 'PATCH') {
        const affected = tables[table].filter(matches)
        if (affected.length) state.writes.push({ table, method, body })
        for (const row of affected) Object.assign(row, body)
        const response = respond(affected)
        if (affected.length && table === 'contents') state.afterContentPatch?.()
        return response
      }
      state.writes.push({ table, method, body })
      const added = Array.isArray(body) ? body : [body]
      tables[table].push(...added)
      return respond(added)
    } } })
  const providerFetch = async value => {
    const url = String(value)
    if (url.includes('dapi.kakao.com')) return Response.json({ meta: { is_end: true, total_count: 1 }, documents: [
      { isbn: state.kakaoIsbn, title: '수상록', authors: ['프랜시스 베이컨'], translators: [], publisher: '확인된 출판사',
        url: 'https://publisher.test/ko-book', thumbnail: '', datetime: '2000-01-01', contents: '' },
    ] })
    if (url.includes('/isbn/')) {
      const hook = state.onProviderRead; state.onProviderRead = null; hook?.()
      return Response.json({ key: '/books/OL1M', title: state.providerTitle, isbn_13: [state.providerIsbn],
      publishers: ['Official publisher'], works: [{ key: state.workKey }], authors: [{ key: '/authors/OL1A' }],
      languages: state.language.map(key => ({ key })), physical_format: 'paperback' })
    }
    if (url.includes('/works/')) return Response.json({ title: state.workTitle, authors: [{ author: { key: '/authors/OL1A' } }] })
    if (url.includes('/authors/')) return Response.json({ name: state.author })
    throw Error('Unexpected provider URL ' + url)
  }
  const fs = {
    readFileSync: path => String(path).endsWith('queue.json') ? JSON.stringify(state.queue) : JSON.stringify(state.candidate) + '\n',
    existsSync: path => String(path).endsWith('out.jsonl'), mkdirSync: () => {},
    writeFileSync: (path, value) => state.files.push({ path, value }), appendFileSync: (path, value) => state.files.push({ path, value }),
  }
  const mocks = {
    'node:crypto': {},
    'node:fs': fs, 'node:util': { isDeepStrictEqual }, 'node:path': { dirname: path => path.slice(0, path.lastIndexOf('/')), resolve: (...paths) => paths.join('/') },
    '@feelandnote/db': { createClient: () => db },
    './lib/figure-work.mjs': { ...figureWork, dbClient: () => db, hasFlag: flag => flag === 'apply',
      argumentValue: (name, fallback) => ({ out: 'out.jsonl', muse: 'missing.jsonl', 'merge-out': 'merge.json', backup: 'backup.json' })[name] ?? fallback },
    './lib/verified-batch-edition.mjs': guards,
    './lib/research.mjs': { research: () => { throw Error('Paid research attempted') }, declaredNone: () => false, parsePipeRow: () => null },
  }
  return { tables, state, db, providerFetch, async run() {
    mocks['node:crypto'] = await import('node:crypto')
    const source = readFileSync(new URL(`./${script}.mjs`, import.meta.url), 'utf8')
      .replace(/const introductionModule = await import\([^\n]+\)/, 'const introductionModule = { fetchBookIntroduction: async () => null }')
      .replace(/\nvoid main\(\)\.catch\([\s\S]*$/, '')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, allowJs: true } }).outputText
    const loadedModule = { exports: {} }
    const main = new Function('require', 'module', 'exports', 'process', `return (async () => { ${compiled}; return main })()`)(
      name => { assert.ok(name in mocks, 'unexpected import ' + name); return mocks[name] }, loadedModule, loadedModule.exports,
      { env: { NEXT_PUBLIC_DB_API_URL: 'https://db.test', DB_SECRET_KEY: 'test-only', KAKAO_REST_API_KEY: 'test-only' },
        argv: ['node', script, '--apply', '--queue', 'queue.json', '--report', 'report.json', '--out', 'out.jsonl', '--muse', 'missing.jsonl', '--merge-out', 'merge.json'], cwd: () => '.' })
    return (await main)()
  } }
}

test('generic scope is unknown without independent same-ISBN input, and preserves reviewed selections/full editions', () => {
  const unknown = { edition_kind: null, text_scope: null, scope_evidence: null }
  for (const input of [undefined, { kind: 'full', scope: 'complete' }, { isbn: enIsbn, kind: 'full', scope: 'complete' },
    { isbn: koIsbn, kind: 'full', scope: 'complete', evidenceUrl: 'https://publisher.test/full' }]) {
    assert.deepEqual(guards.reviewedBatchScope(input, enIsbn), unknown)
  }
  const input = { isbn: enIsbn, kind: 'selection', scope: 'essays 1–3 only', evidenceUrl: 'https://publisher.test/selection' }
  assert.deepEqual(guards.reviewedBatchScope(input, enIsbn), { edition_kind: 'selection', text_scope: input.scope, scope_evidence: input.evidenceUrl })
  assert.equal(guards.reviewedBatchScope({ ...input, kind: 'full', scope: 'complete' }, enIsbn).edition_kind, 'full')
})

test('all three actual --apply writers leave new scope null rather than borrowing another edition or guessing full', async t => {
  t.mock.method(console, 'log', () => {})
  for (const script of scripts) {
    const f = fixture(script), mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await f.run()
    const write = f.state.writes.find(row => row.table === 'figure_book_editions')
    assert.ok(write, script)
    const edition = Array.isArray(write.body) ? write.body[0] : write.body
    assert.equal(edition.edition_kind, null, script)
    assert.equal(edition.text_scope, null, script)
    assert.ok(edition.sources.work_attribution, script)
    mock.mock.restore()
  }
})

test('actual EN batch writers refetch explicit language, full authors and server original before any writes', async t => {
  t.mock.method(console, 'log', () => {})
  for (const script of scripts.slice(1)) for (const mode of ['language', 'author', 'work', 'isbn']) {
    const f = fixture(script)
    if (mode === 'language') f.state.language = []
    if (mode === 'author') f.state.author = 'Roger Bacon'
    if (mode === 'work') f.state.workKey = '/works/OL9W'
    if (mode === 'isbn') f.state.providerIsbn = koIsbn
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /ISBN|언어|원전|원저자|판본/)
    assert.equal(f.state.writes.length, 0, script + ' ' + mode)
    mock.mock.restore()
  }
})

test('bulk same-ISBN metadata and server work must agree; explicit reviewed scope survives only on that edition', async t => {
  t.mock.method(console, 'log', () => {})
  const normal = fixture(scripts[0])
  normal.state.queue.fresh[0].edition = { isbn: koIsbn, kind: 'selection', scope: '수록 수필 1–3편', evidenceUrl: 'https://publisher.test/ko-selection' }
  let mock = t.mock.method(globalThis, 'fetch', normal.providerFetch)
  await normal.run()
  const saved = normal.state.writes.find(row => row.table === 'figure_book_editions').body[0]
  assert.equal(saved.edition_kind, 'selection'); assert.equal(saved.text_scope, '수록 수필 1–3편')
  assert.equal(saved.sources.scope_evidence, 'https://publisher.test/ko-selection')
  mock.mock.restore()
  for (const mode of ['isbn', 'creator', 'work']) {
    const f = fixture(scripts[0])
    if (mode === 'isbn') f.state.kakaoIsbn = '9788957339893'
    if (mode === 'creator') f.state.queue.fresh[0].kakao.authors = ['베이컨']
    if (mode === 'work') { f.tables.content_locales[0].title = '다른 저작'; f.tables.contents[0].metadata.figureBook.workTitle = '다른 저작' }
    mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /ISBN|원전|원저자|판본/)
    assert.equal(f.state.writes.length, 0, mode)
    mock.mock.restore()
  }
})

test('generic EN writers retain a reviewed series representative while saving the exact second-volume ISBN and scope', async t => {
  t.mock.method(console, 'log', () => {})
  const volumeIsbn = '9780439064873', author = 'J. K. Rowling'
  const representative = "Harry Potter and the Sorcerer's Stone", volumeTitle = 'Harry Potter and the Chamber of Secrets'
  for (const script of scripts.slice(1)) {
    const f = fixture(script), content = f.tables.contents[0]
    Object.assign(content.metadata.figureBook, { workTitle: representative, workCreator: author })
    const before = structuredClone(content.metadata)
    Object.assign(f.state, { providerIsbn: volumeIsbn, providerTitle: volumeTitle, workTitle: volumeTitle, workKey: '/works/OL2W', author })
    Object.assign(f.state.candidate.en, { isbn: volumeIsbn, title: volumeTitle, authors: [author] })
    f.state.candidate.edition = { isbn: volumeIsbn, kind: 'volume', scope: 'volume 2; complete text', evidenceUrl: 'https://publisher.test/harry-potter' }
    f.tables.content_locales[0].sources = { edition_work_evidence: [{ method: 'independent_series_review', content_id: content.id, locale: 'en', isbn: volumeIsbn,
      original_title: representative, original_creator: author, representative_work_key: '/works/OL1W', work_identity: `book/${koIsbn}`,
      edition_title: volumeTitle, edition_creator: author, volume_work_key: '/works/OL2W', volume_work_title: volumeTitle,
      series_title: 'Harry Potter', series_creator: author, series_scope: 'volumes 1–7', edition_kind: 'volume', text_scope: 'volume 2; complete text',
      source_url: 'https://publisher.test/harry-potter', reviewed_at: '2026-10-01T00:00:00Z' }] }
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await f.run()
    const saved = f.state.writes.find(write => write.table === 'figure_book_editions').body
    assert.equal(saved.isbn, volumeIsbn); assert.equal(saved.title, volumeTitle); assert.equal(saved.text_scope, 'volume 2; complete text')
    assert.deepEqual(content.metadata, before, script)
    assert.equal(f.state.writes.some(write => write.table === 'contents'), false)
    mock.mock.restore()
  }
})

test('unverified original-only research cannot rewrite a BOOK identity during --apply', async t => {
  const f = fixture(scripts[2])
  f.state.candidate.verdict = 'original-only'; f.state.candidate.en = null
  t.mock.method(console, 'log', () => {})
  t.mock.method(globalThis, 'fetch', () => { throw Error('No official edition should be inferred') })
  await f.run()
  assert.equal(f.state.writes.length, 0)
  assert.equal(f.state.files.length, 0)
})

test('actual translation batch retains original metadata and distinct identity when a reviewed omnibus shares its ISBN', async t => {
  const f = fixture(scripts[2]), target = f.tables.contents[0], otherId = 'meditations-original'
  const wholeTitle = 'The Essays and Meditations', wholeCreator = 'Francis Bacon, Marcus Aurelius'
  f.tables.contents.push({ id: otherId, type: 'BOOK', external_id: enIsbn, metadata: { workKey: '/works/OL2W',
    figureBook: { workTitle: 'Meditations', workCreator: 'Marcus Aurelius', workIdentity: 'meditations' } } })
  f.tables.content_locales.push({ content_id: otherId, locale: 'en', title: 'Meditations', creator: 'Marcus Aurelius', isbn: enIsbn })
  const before = structuredClone(f.tables.contents)
  Object.assign(f.state, { providerTitle: wholeTitle, workTitle: wholeTitle, workKey: '/works/OL99W', author: wholeCreator })
  Object.assign(f.state.candidate.en, { title: wholeTitle, authors: [wholeCreator] })
  f.state.candidate.edition = { isbn: enIsbn, kind: 'selection', scope: 'Essays portion within the omnibus', evidenceUrl: 'https://publisher.test/omnibus-toc' }
  // Synthetic publication facts test native writer behavior without asserting live ISBN metadata.
  f.tables.content_locales[0].sources = { edition_work_evidence: [{ method: 'independent_omnibus_review', content_id: target.id, locale: 'en', isbn: enIsbn,
    original_title: 'The Essays', original_creator: 'Francis Bacon', work_identity: `book/${koIsbn}`,
    edition_title: wholeTitle, edition_creator: wholeCreator, official_work_key: '/works/OL99W', official_work_title: wholeTitle,
    owner_content_ids: [target.id, otherId], edition_kind: 'selection', text_scope: 'Essays portion within the omnibus',
    contained_originals: [{ content_id: target.id, title: 'The Essays', creator: 'Francis Bacon', work_identity: `book/${koIsbn}`, text_scope: 'Essays portion within the omnibus' },
      { content_id: otherId, title: 'Meditations', creator: 'Marcus Aurelius', work_identity: 'meditations', text_scope: 'Meditations portion within the omnibus' }],
    source_url: 'https://publisher.test/omnibus-toc', toc_source_url: 'https://publisher.test/omnibus-toc', reviewed_at: '2026-10-01T00:00:00Z' }] }
  t.mock.method(console, 'log', () => {})
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await f.run()
  assert.deepEqual(f.tables.contents, before)
  assert.equal(f.state.writes.some(write => write.table === 'contents'), false)
  const saved = f.state.writes.find(write => write.table === 'figure_book_editions').body
  assert.equal(saved.isbn, enIsbn); assert.equal(saved.title, wholeTitle)
  assert.equal(saved.creator, wholeCreator); assert.equal(saved.text_scope, f.state.candidate.edition.scope)
  assert.equal(saved.sources.work_attribution.method, 'independent_omnibus_review')
  assert.deepEqual(JSON.parse(f.state.files.find(file => file.path.endsWith('merge.json')).value).merges, [])
})

test('translation --apply preserves metadata added during provider verification and checks the saved same-ID snapshot', async t => {
  const f = fixture(scripts[2]), content = f.tables.contents[0]
  let latest
  f.state.onProviderRead = () => {
    content.metadata.raw = { independentSource: 'https://publisher.test/new-evidence' }
    content.metadata.unverifiedEditions = [{ isbn: koIsbn, reason: 'Awaiting source review' }]
    content.metadata.figureBook.reviewedOriginalSource = 'https://publisher.test/original'
    latest = structuredClone(content.metadata)
  }
  t.mock.method(console, 'log', () => {})
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await f.run()
  assert.deepEqual(content.metadata.raw, latest.raw)
  assert.deepEqual(content.metadata.unverifiedEditions, latest.unverifiedEditions)
  assert.equal(content.metadata.figureBook.reviewedOriginalSource, latest.figureBook.reviewedOriginalSource)
  const patch = f.state.requests.find(row => row.method === 'PATCH' && row.table === 'contents')
  assert.deepEqual(JSON.parse(patch.url.searchParams.get('metadata').slice(3)), latest)
  assert.equal(patch.url.searchParams.get('id'), 'eq.' + content.id)
  const patchIndex = f.state.requests.indexOf(patch)
  assert.ok(f.state.requests.slice(patchIndex + 1).some(row => row.method === 'GET' && row.table === 'contents'
    && row.url.searchParams.get('id') === 'eq.' + content.id), 'saved metadata must be read back by the same ID')
})

test('translation --apply rejects concurrent metadata or QID changes after verification without overwriting or adding a locale', async t => {
  t.mock.method(console, 'log', () => {})
  for (const mode of ['metadata', 'qid']) {
    const f = fixture(scripts[2]), content = f.tables.contents[0]
    f.state.beforeContentPatch = () => {
      if (mode === 'qid') content.metadata.figureBook.wikidataQid = 'Q12345'
      else content.metadata.raw = { concurrentEdit: true }
    }
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /저장 충돌/)
    assert.equal(f.state.writes.length, 0, mode)
    assert.ok(mode === 'qid' ? content.metadata.figureBook.wikidataQid === 'Q12345' : content.metadata.raw.concurrentEdit)
    assert.equal(f.state.requests.some(row => row.method === 'POST'), false)
    mock.mock.restore()
  }
})

test('translation --apply uses HTTP is.null CAS for null metadata with a verified original locale anchor', async t => {
  const f = fixture(scripts[2]), content = f.tables.contents[0]
  f.tables.content_locales.push({ content_id: content.id, locale: 'en', title: 'The Essays', creator: 'Francis Bacon', isbn: enIsbn })
  f.state.onProviderRead = () => { content.metadata = null }
  t.mock.method(console, 'log', () => {})
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await f.run()
  const patch = f.state.requests.find(row => row.method === 'PATCH')
  assert.equal(patch.url.searchParams.get('metadata'), 'is.null')
  assert.equal(content.metadata.figureBook.workTitle, 'The Essays')
  assert.equal(f.state.writes.length, 1)
})

test('translation --apply stops before locale writes when the saved metadata reread has changed', async t => {
  const f = fixture(scripts[2]), content = f.tables.contents[0]
  f.state.afterContentPatch = () => { content.metadata = { ...content.metadata, raw: { changedAfterWrite: true } } }
  t.mock.method(console, 'log', () => {})
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await assert.rejects(f.run(), /재조회 검증 실패/)
  assert.equal(f.state.writes.length, 1)
  assert.equal(f.state.writes[0].table, 'contents')
  assert.equal(f.state.requests.some(row => row.method === 'POST'), false)
})
