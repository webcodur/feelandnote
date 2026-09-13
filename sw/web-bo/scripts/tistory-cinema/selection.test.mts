import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import fs from 'node:fs'
import os from 'node:os'
import test from 'node:test'
import { selectCandidates, type SelectionData } from './lib/selection.mts'
import { auditMaterials, type AuditData } from './audit-data.mts'
import { NOT_A_REVIEW } from './lib/quality.mts'
import { buildPersonMaterial, MovieCache, personContext, completedPerson } from './lib/person-material.mts'

const run = promisify(execFile)
const cwd = path.resolve(import.meta.dirname, '../..')
const reviewText = '그는 이 영화를 여러 번 보았다고 말했다. ' + '인물의 선택이 다음 장면에서 어떤 결과로 돌아오는지 자세히 설명했다. '.repeat(3)

test('person candidates include short and single-film records while work and list rules stay unchanged', () => {
  const data: SelectionData = {
    contents: Array.from({ length: 5 }, (_, i) => ({ id: `film-${i}`, external_id: `tmdb-movie-${i}` })),
    locales: Array.from({ length: 5 }, (_, i) => ({ content_id: `film-${i}`, locale: 'ko', title: `영화 ${i}` })),
    celebs: [
      { id: 'person', slug: 'featured-person', nickname: '소개 인물' },
      { id: 'excluded', slug: 'joseph-goebbels', nickname: '제외 인물' },
      { id: 'no-slug', slug: null, nickname: '주소 없음' },
    ],
    reviews: [],
    lists: [
      { slug: 'academy-best-picture', title: '아카데미 작품상' },
      { slug: 'unselected-list', title: '새 목록' },
    ],
  }
  for (const celeb of data.celebs) for (const content of data.contents) data.reviews.push({ id: `${celeb.id}/${content.id}`, celeb_id: celeb.id, content_id: content.id, review: reviewText })
  // The safe filename is identical. A fourth usable review makes film-1 the production winner.
  data.locales[0].title = '같은/제목'
  data.locales[1].title = '같은제목'
  data.reviews.push({ id: 'extra-review', celeb_id: 'extra', content_id: 'film-1', review: reviewText })
  data.contents.push({ id: 'tv', external_id: 'tmdb-tv-1' })
  data.locales.push({ content_id: 'tv', locale: 'ko', title: '드라마' })
  for (const celeb of data.celebs) data.reviews.push({ id: `${celeb.id}/tv`, celeb_id: celeb.id, content_id: 'tv', review: reviewText })
  const { jobs } = selectCandidates(data)
  assert.deepEqual(jobs.filter((job) => job.kind === 'person').map((job) => [job.name, job.n]), [['인물-소개 인물', 5], ['인물-제외 인물', 5]])
  assert.deepEqual(jobs.filter((job) => job.kind === 'list').map((job) => job.arg[1]), ['academy-best-picture'])
  assert.deepEqual(jobs.filter((job) => job.kind === 'work').map((job) => job.arg[1]), ['film-1', 'film-2', 'film-3', 'film-4'])
})

test('same-name people keep separate identities and known invalid relations stay excluded', () => {
  const data: SelectionData = {
    contents: [{ id: 'movie', external_id: 'tmdb-movie-1' }],
    locales: [{ content_id: 'movie', locale: 'ko', title: '영화' }],
    celebs: [{ id: 'a', slug: 'mark-a', nickname: '마크' }, { id: 'b', slug: 'mark-b', nickname: '마크' }, { id: 'c', slug: 'excluded', nickname: '편집자 주석' }],
    reviews: [
      { id: 'short-a', celeb_id: 'a', content_id: 'movie', review: '추천 목록에 포함했다.' },
      { id: 'short-b', celeb_id: 'b', content_id: 'movie', review: '좋아하는 영화로 꼽았다.' },
      { id: [...NOT_A_REVIEW][0], celeb_id: 'c', content_id: 'movie', review: reviewText },
    ], lists: [],
  }
  const result = selectCandidates(data)
  assert.deepEqual(result.jobs.map((r) => [r.id, r.name]), [['a', '인물-마크-mark-a'], ['b', '인물-마크-mark-b']])
  assert.equal(result.jobs.filter((r) => r.kind === 'work').length, 0)
})

test('person generation shares one movie fetch and preserves exact review identity and text', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cinema_generate_people-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  let calls = 0
  const request: typeof fetch = async () => {
    calls++
    return new Response(JSON.stringify({ id: 7, overview: '줄거리', genres: [], vote_count: 20, credits: { crew: [{ job: 'Director', name: '감독' }] }, videos: { results: [] } }), { status: 200 })
  }
  const data: SelectionData = {
    contents: [{ id: 'movie', external_id: 'tmdb-movie-7' }],
    locales: [{ content_id: 'movie', locale: 'ko', title: '영화' }],
    celebs: [{ id: 'a', slug: 'person-a', nickname: '인물' }],
    reviews: [{ id: 'relation', celeb_id: 'a', content_id: 'movie', review: '추천 목록에 포함했다.', source_url: 'https://example.com/original' }], lists: [],
  }
  const cache = new MovieCache(directory, 'test-key', request)
  const context = personContext(data, cache)
  const [a, b] = await Promise.all([buildPersonMaterial(context, 'a'), buildPersonMaterial(context, 'a')])
  assert.equal(calls, 1)
  assert.deepEqual(a, b)
  assert.equal(a.picked.length, 1)
  assert.equal(a.picked[0].review, data.reviews[0].review)
  assert.equal(a.picked[0].rid, 'relation')
  assert.equal(a.picked[0].source_url, 'https://example.com/original')
  assert.equal(a.picked[0].creator, '감독')
  const cached = new MovieCache(directory, undefined, async () => { throw new Error('cache should avoid HTTP') })
  assert.equal((await buildPersonMaterial(personContext(data, cached), 'a')).picked[0].overview, '줄거리')
  const job = selectCandidates(data).jobs[0]
  fs.writeFileSync(path.join(directory, `_body-${job.name}.html`), '<p>wrong person</p>')
  assert.equal(completedPerson(directory, job), false, 'an existing body alone must not skip generation')
})

test('material audit detects changed review text and a relation attached to another person', () => {
  const data: AuditData = {
    contents: [{ id: 'film', external_id: 'tmdb-movie-1' }],
    locales: [{ content_id: 'film', locale: 'ko', title: '작품' }],
    celebs: [{ id: 'person', slug: 'person', nickname: '인물', publication_status: 'active' }],
    reviews: [{ id: 'review', celeb_id: 'person', content_id: 'film', review: reviewText }],
    lists: [], items: [], curators: [],
  }
  const value = {
    work: { id: 'film', title: '작품' }, total: 1, usable: 1,
    picked: [{ id: 'person', rid: 'review', slug: 'person', nickname: '인물', review: reviewText }],
  }
  const materials = [{ file: '작품.json', value }]
  assert.deepEqual(auditMaterials(materials, data), [])
  const changedText = reviewText.replace('여러 번', '한 번')
  data.reviews[0].review = changedText
  assert.deepEqual(auditMaterials(materials, data).filter((difference) => difference.field.endsWith('.review')), [
    { file: '작품.json', field: 'picked[0].review', before: reviewText, after: changedText, visible: true },
  ])
  data.reviews[0].celeb_id = 'different-person'
  assert.ok(auditMaterials(materials, data).some((difference) => difference.field === 'picked[0].celeb_id' && difference.after === 'different-person'))
})

test('person material audit accepts short records and detects changed source URLs', () => {
  const data: AuditData = {
    contents: [{ id: 'film', external_id: 'tmdb-movie-1' }],
    locales: [{ content_id: 'film', locale: 'ko', title: '작품' }],
    celebs: [{ id: 'person', slug: 'person', nickname: '인물', publication_status: 'active' }],
    reviews: [{ id: 'review', celeb_id: 'person', content_id: 'film', review: '추천 목록에 들어 있다.', source_url: 'https://example.com/source' }],
    lists: [], items: [], curators: [],
  }
  const value = { celeb: { id: 'person', slug: 'person', name: '인물' }, total: 1, usable: 1,
    picked: [{ id: 'film', title: '작품', rid: 'review', review: '추천 목록에 들어 있다.', source_url: 'https://example.com/source' }] }
  const materials = [{ file: '인물-인물.json', value }]
  assert.deepEqual(auditMaterials(materials, data), [])
  data.reviews[0].source_url = 'https://example.com/changed'
  assert.deepEqual(auditMaterials(materials, data).map((d) => d.field), ['picked[0].source_url'])
})

test('stock and production plan report the same candidates from the current database', async () => {
  const invoke = (script: string, args: string[]) => run(process.execPath,
    ['--env-file=.env', '--import', 'tsx', `scripts/tistory-cinema/${script}`, ...args],
    { cwd, timeout: 120000, maxBuffer: 4 * 1024 * 1024 })
  const [stock, batch] = await Promise.all([
    invoke('stock.mts', ['--names']), invoke('batch.mts', ['--plan', '--names']),
  ])
  const stockCount = Number(stock.stdout.match(/합계 (\d+)편/)?.[1])
  const batchCount = Number(batch.stdout.match(/후보 (\d+)편/)?.[1])
  assert.equal(stockCount, batchCount, 'inventory must count the same jobs as production')
  const stockNames = stock.stdout.slice(stock.stdout.indexOf('── 후보 이름 ──') + '── 후보 이름 ──'.length)
    .trim().split('\n').map((name) => name.trim()).sort()
  const batchNames = batch.stdout.trim().split('\n').slice(2).map((name) => name.trim()).sort()
  assert.deepEqual(stockNames, batchNames, 'matching totals must not hide different candidate identities')
})
