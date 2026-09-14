/**
 * 티스토리 영화 감상 감사의 초기 입력을 현재 DB 관계 ID로 고정한다.
 *
 * 표시 후보와 교체용 첫 대기 후보를 발행 순으로 모으고, 이미 통독한
 * 대부·박찬욱·2001의 관계를 ID로 제외한다. 이 파일은 DB를 읽기만 한다.
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/luna-cinema-inventory.mts
 *   node --env-file=.env --import tsx scripts/tistory-cinema/luna-cinema-inventory.mts --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'

type Row = {
  id: string
  celeb_id: string
  content_id: string
  review: string | null
  source_url: string | null
  review_en: string | null
}

const dir = path.join(ASSETS, 'tistory-cinema')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)

async function page<T>(table: string, select: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; ; offset += 1000) {
    let q = db.from(table).select(select).range(offset, offset + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data as T[]))
    if ((data as T[]).length < 1000) return out
  }
}

const [contents, locales, celebs, relations] = await Promise.all([
  page<{ id: string; type: string; external_id: string | null }>('contents', 'id, type, external_id', (q) => q.eq('type', 'VIDEO')),
  page<{ content_id: string; title: string; locale: string }>('content_locales', 'content_id, title, locale'),
  page<{ id: string; slug: string; nickname: string; publication_status: string }>('celebs', 'id, slug, nickname, publication_status'),
  page<Row>('celeb_contents', 'id, celeb_id, content_id, review, source_url, review_en'),
])

const movie = new Set(contents.filter((c) => (c.external_id ?? '').startsWith('tmdb-movie-')).map((c) => c.id))
const titleByContent = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))
const contentByTitle = new Map<string, string[]>()
for (const [id, title] of titleByContent) contentByTitle.set(title, [...(contentByTitle.get(title) ?? []), id])
const celebBySlug = new Map(celebs.map((c) => [c.slug, c]))
const relationByPair = new Map(relations.map((r) => [`${r.celeb_id}/${r.content_id}`, r]))
const relationById = new Map(relations.map((r) => [r.id, r]))
const relationsByContent = new Map<string, Row[]>()
for (const row of relations) {
  if (!movie.has(row.content_id)) continue
  relationsByContent.set(row.content_id, [...(relationsByContent.get(row.content_id) ?? []), row])
}

const contentIdForTitle = (title: string) => contentByTitle.get(title)?.[0] ?? null
const relationFor = (slug: string, title: string, explicitContentId?: string | null) => {
  const celeb = celebBySlug.get(slug)
  const contentId = explicitContentId ?? contentIdForTitle(title)
  return celeb && contentId ? relationByPair.get(`${celeb.id}/${contentId}`) ?? null : null
}

type Input = {
  article: string
  kind: 'work' | 'person' | 'list'
  slot: string | number
  role: 'shown' | 'wait'
  rid: string
  celeb_id: string
  content_id: string
  slug: string
  nickname: string
  work: string
  current_review: string
  source_url: string | null
  review_en: string | null
  local_review: string | null
}

const prior: { article: string; rid: string; slug: string; work: string }[] = []
function addPrior(name: string) {
  const material = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'))
  if (material.work) {
    for (const picked of material.picked ?? []) {
      const relation = picked.rid ? relationById.get(picked.rid) : null
      if (relation) prior.push({ article: name, rid: relation.id, slug: picked.slug, work: material.work.title })
    }
    return
  }
  if (material.celeb) {
    for (const picked of material.picked ?? []) {
      // Local materials can have a stale/localized title; content id is the
      // stable key and the title is only a fallback for older material.
      const relation = relationFor(material.celeb.slug, picked.title, picked.id ?? null)
      if (relation) prior.push({ article: name, rid: relation.id, slug: material.celeb.slug, work: picked.title })
    }
    return
  }
  for (const picked of material.picked ?? []) {
    for (const voice of (picked.voices ?? []).slice(0, 3)) {
      const relation = relationFor(voice.slug, picked.title, picked.contentId ?? null)
      if (relation) prior.push({ article: name, rid: relation.id, slug: voice.slug, work: picked.title })
    }
  }
}

// 문서에 기록된 기존 14건: 대부 4 + 박찬욱 6 + 2001 4.
addPrior('대부')
addPrior('인물-박찬욱')
addPrior('2001 스페이스 오디세이')
const priorIds = new Set(prior.map((r) => r.rid))

const input: Input[] = []
type Unresolved = {
  article: string
  kind: Input['kind']
  slot: string | number
  role: Input['role']
  slug: string
  work: string
  local_review: string | null
  reason: string
}
const unresolved: Unresolved[] = []
function add(article: string, kind: Input['kind'], slot: string | number, slug: string, work: string, role: Input['role'], localReview: string | null, explicitContentId?: string | null) {
  const celeb = celebBySlug.get(slug)
  const relation = relationFor(slug, work, explicitContentId)
  if (!celeb || !relation || !relation.review) {
    unresolved.push({
      article, kind, slot, role, slug, work, local_review: localReview,
      reason: !celeb ? 'celeb_slug_not_found' : !relation ? 'current_relation_not_found' : 'current_review_empty',
    })
    return
  }
  input.push({
    article, kind, slot, role, rid: relation.id, celeb_id: relation.celeb_id, content_id: relation.content_id,
    slug, nickname: celeb.nickname, work, current_review: relation.review, source_url: relation.source_url,
    review_en: relation.review_en, local_review: localReview,
  })
}

const personMaterial = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'))
const tarantino = personMaterial('인물-쿠엔틴 타란티노')
for (const [i, picked] of (tarantino.picked ?? []).entries()) add('인물-쿠엔틴 타란티노', 'person', i + 1, 'quentin-tarantino', picked.title, 'shown', picked.review ?? null, picked.id ?? null)
const tarantinoCeleb = celebBySlug.get('quentin-tarantino')
const tarantinoPicked = new Set((tarantino.picked ?? []).map((p: any) => p.id).filter(Boolean))
const tarantinoWait = relations
  .filter((r) => r.celeb_id === tarantinoCeleb?.id && movie.has(r.content_id) && (r.review ?? '').trim().length >= 100)
  .sort((a, b) => (b.review?.length ?? 0) - (a.review?.length ?? 0))
  .find((r) => !tarantinoPicked.has(r.content_id))
if (tarantinoWait) add('인물-쿠엔틴 타란티노', 'person', 7, 'quentin-tarantino', titleByContent.get(tarantinoWait.content_id)!, 'wait', tarantinoWait.review, tarantinoWait.content_id)

const list = JSON.parse(fs.readFileSync(path.join(dir, '목록-사이트 앤 사운드 위대한 영화 100.json'), 'utf8'))
for (const [wi, picked] of (list.picked ?? []).entries()) {
  for (const [vi, voice] of (picked.voices ?? []).slice(0, 4).entries()) {
    add('목록-사이트 앤 사운드 위대한 영화 100', 'list', `${wi + 1}.${vi + 1}`, voice.slug, picked.title, vi < 3 ? 'shown' : 'wait', voice.review ?? null, picked.contentId ?? null)
  }
}

const work = JSON.parse(fs.readFileSync(path.join(dir, '택시 드라이버.json'), 'utf8'))
const workPicked = new Set((work.picked ?? []).map((p: any) => p.rid))
for (const [i, picked] of (work.picked ?? []).entries()) add('택시 드라이버', 'work', i + 1, picked.slug, work.work.title, 'shown', picked.review ?? null, work.work.id ?? null)
const workWait = (relationsByContent.get(work.work.id) ?? [])
  .filter((r) => (r.review ?? '').trim().length >= 100 && !workPicked.has(r.id))
  .sort((a, b) => (b.review?.length ?? 0) - (a.review?.length ?? 0))[0]
if (workWait) {
  const waitCeleb = celebs.find((c) => c.id === workWait.celeb_id)
  if (waitCeleb) add('택시 드라이버', 'work', 5, waitCeleb.slug, work.work.title, 'wait', workWait.review, work.work.id ?? null)
}

const dicaprio = personMaterial('인물-레오나르도 디카프리오')
for (const [i, picked] of (dicaprio.picked ?? []).entries()) add('인물-레오나르도 디카프리오', 'person', i + 1, 'leonardo-dicaprio', picked.title, 'shown', picked.review ?? null, picked.id ?? null)
const dicaprioCeleb = celebBySlug.get('leonardo-dicaprio')
const dicaprioPicked = new Set((dicaprio.picked ?? []).map((p: any) => p.id).filter(Boolean))
const dicaprioWait = relations
  .filter((r) => r.celeb_id === dicaprioCeleb?.id && movie.has(r.content_id) && (r.review ?? '').trim().length >= 100)
  .sort((a, b) => (b.review?.length ?? 0) - (a.review?.length ?? 0))
  .find((r) => !dicaprioPicked.has(r.content_id))
if (dicaprioWait) add('인물-레오나르도 디카프리오', 'person', 7, 'leonardo-dicaprio', titleByContent.get(dicaprioWait.content_id)!, 'wait', dicaprioWait.review, dicaprioWait.content_id)

const seen = new Set<string>()
const rows = input.filter((row) => {
  if (seen.has(row.rid) || priorIds.has(row.rid)) return false
  seen.add(row.rid)
  return true
})
const result = {
  generatedAt: new Date().toISOString(),
  basis: '현재 DB celeb_contents 관계 ID; 기존 대부·박찬욱·2001 통독 14건 제외',
  previous: prior,
  rawCount: input.length,
  dedupCount: rows.length,
  unresolved,
  rows,
}

if (process.argv.includes('--write')) {
  const output = path.join(dir, 'luna-cinema-batch-01-input.json')
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`저장: ${output}`)
}
console.log(JSON.stringify({ rawCount: result.rawCount, dedupCount: result.dedupCount, previousCount: prior.length, rows: rows.map((r) => ({ article: r.article, slot: r.slot, role: r.role, rid: r.rid, nickname: r.nickname, work: r.work })) }, null, 2))
