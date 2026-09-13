/** DB는 읽기만 하고 재료·본문·제목을 대조한다. --write는 감사 결과만 _audit-data.json에 저장한다. */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'
import { personReview, readRows, selectCandidates } from './lib/selection.mts'
import { savedPeople } from './lib/person-material.mts'
import { usableReview } from './lib/quality.mts'
import { renderWork, renderPerson, renderList } from './render.mts'

type Difference = { file: string; field: string; before: any; after: any; visible: boolean }
export type AuditData = { contents: any[]; locales: any[]; celebs: any[]; reviews: any[]; lists: any[]; items: any[]; curators: any[] }

export function auditMaterials(materials: { file: string; value: any }[], data: AuditData) {
  const differences: Difference[] = []
  const compare = (file: string, field: string, before: any, after: any, visible = true) => {
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) differences.push({ file, field, before: before ?? null, after: after ?? null, visible })
  }
  const works = new Map(data.contents.map((row) => [row.id, row]))
  const ko = new Map(data.locales.filter((row) => row.locale === 'ko').map((row) => [row.content_id, row]))
  const people = new Map(data.celebs.map((row) => [row.id, row]))
  const bySlug = new Map(data.celebs.map((row) => [row.slug, row]))
  const byReview = new Map(data.reviews.map((row) => [row.id, row]))
  const byPair = new Map<string, any[]>()
  const byWork = new Map<string, any[]>()
  for (const row of data.reviews) {
    const key = `${row.celeb_id}/${row.content_id}`
    byPair.set(key, [...(byPair.get(key) ?? []), row])
    byWork.set(row.content_id, [...(byWork.get(row.content_id) ?? []), row])
  }
  const isMovie = (id: string) => (works.get(id)?.external_id ?? '').startsWith('tmdb-movie-')
  const eligible = (id: string) => (byWork.get(id) ?? []).filter((row) => usableReview(row.review, row.id) && people.get(row.celeb_id)?.publication_status === 'active')

  for (const { file, value: material } of materials) {
    const check = (field: string, before: any, after: any, visible = true) => compare(file, field, before, after, visible)
    const profile = (old: any, prefix: string, visible: boolean, nameKey = 'name') => {
      const celeb = old.id ? people.get(old.id) : bySlug.get(old.slug)
      if (!celeb) { check(`${prefix}.identity`, old.id ?? old.slug, null, visible); return null }
      if (old.id) check(`${prefix}.id`, old.id, celeb.id, visible)
      check(`${prefix}.slug`, old.slug, celeb.slug, visible)
      check(`${prefix}.publication_status`, 'active', celeb.publication_status, visible)
      for (const [local, column] of [[nameKey, 'nickname'], ['profession', 'profession'], ['title', 'title'], ['headline', 'headline'], ['bio', 'bio'], ['avatar_url', 'avatar_url'], ['avatar', 'avatar_url']]) {
        if (local in old) check(`${prefix}.${local}`, old[local], celeb[column], visible && local !== 'bio')
      }
      return celeb
    }
    const work = (old: any, id: string, prefix: string, visible = true) => {
      if (!works.has(id)) { check(`${prefix}.identity`, id, null, visible); return }
      check(`${prefix}.movie`, true, isMovie(id), visible)
      check(`${prefix}.title`, old.title, ko.get(id)?.title, visible)
      if ('external' in old) check(`${prefix}.external`, old.external, works.get(id).external_id, false)
    }
    const review = (old: any, celebId: string, contentId: string, prefix: string, visible: boolean,
      qualifies: (text: string | null | undefined, id: string) => boolean = usableReview) => {
      const relations = old.rid ? [byReview.get(old.rid)].filter(Boolean) : byPair.get(`${celebId}/${contentId}`) ?? []
      if (relations.length !== 1) { check(`${prefix}.relation`, { celebId, contentId, count: 1 }, { celebId, contentId, count: relations.length }, visible); return }
      const current = relations[0]
      check(`${prefix}.celeb_id`, celebId, current.celeb_id, visible)
      check(`${prefix}.content_id`, contentId, current.content_id, visible)
      check(`${prefix}.review`, old.review, current.review, visible)
      check(`${prefix}.usableReview`, true, qualifies(current.review, current.id), visible)
      if ('source' in old) check(`${prefix}.source`, old.source, current.source_url, false)
      if ('source_url' in old) check(`${prefix}.source_url`, old.source_url, current.source_url, false)
    }
    const voices = (old: any[], id: string, prefix: string, shown: number) => {
      old.forEach((voice, i) => {
        const celeb = profile(voice, `${prefix}[${i}]`, i < shown)
        if (celeb) review(voice, celeb.id, id, `${prefix}[${i}]`, i < shown)
      })
      check(`${prefix}.members`, old.map((row) => row.slug).sort(), eligible(id).map((row) => people.get(row.celeb_id).slug).sort(), true)
    }

    if (material.work) {
      const id = material.work.id
      work(material.work, id, 'work')
      check('total', material.total, (byWork.get(id) ?? []).length)
      check('usable', material.usable, eligible(id).length, false)
      material.picked.forEach((row: any, i: number) => {
        const celeb = profile(row, `picked[${i}]`, true, 'nickname')
        if (celeb) review(row, celeb.id, id, `picked[${i}]`, true)
      })
      material.alsoLiked?.forEach((row: any, i: number) => work(row, row.id, `alsoLiked[${i}]`))
    } else if (material.celeb) {
      const celeb = profile(material.celeb, 'celeb', true)
      if (!celeb) continue
      const mine = data.reviews.filter((row) => row.celeb_id === celeb.id && isMovie(row.content_id))
      check('total', material.total, mine.length)
      // Legacy materials retain their original selection and unused usable-count snapshot.
      if (material.celeb.id) check('usable', material.usable, mine.filter((row) => personReview(row.review, row.id) && ko.get(row.content_id)?.title).length, false)
      material.picked.forEach((row: any, i: number) => {
        work(row, row.id, `picked[${i}]`)
        review(row, celeb.id, row.id, `picked[${i}]`, true, personReview)
      })
    } else if (material.list) {
      const list = data.lists.find((row) => row.slug === material.list.slug)
      if (!list) { check('list.identity', material.list.slug, null); continue }
      for (const [local, column] of [['title', 'title'], ['description', 'description'], ['method', 'method'], ['publishedYear', 'published_year'], ['sourceUrl', 'source_url'], ['isRanked', 'is_ranked'], ['isAnnual', 'is_annual']]) {
        check(`list.${local}`, material.list[local], list[column])
      }
      const curator = data.curators.find((row) => row.id === list.curator_id)
      check('curator', material.curator, curator ? { slug: curator.slug, name: curator.name, kind: curator.kind, homepage: curator.homepage_url } : null)
      const items = data.items.filter((row) => row.list_id === list.id && row.hidden === false)
        .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
      check('totalItems', material.totalItems, items.length)
      check('all.length', material.all.length, items.length)
      check('withVoice', material.withVoice, items.filter((row) => eligible(row.content_id).length).length)
      material.all.forEach((row: any, i: number) => {
        const item = items[i]
        if (!item) return
        for (const [local, column] of [['contentId', 'content_id'], ['rank', 'rank'], ['year', 'year'], ['note', 'note']]) check(`all[${i}].${local}`, row[local], item[column], local !== 'note')
        check(`all[${i}].title`, row.title, ko.get(item.content_id)?.title ?? item.raw_title)
        if (row.contentId) voices(row.voices, row.contentId, `all[${i}].voices`, 0)
      })
      material.picked.forEach((row: any, i: number) => {
        const original = material.all.find((item: any) => item.contentId === row.contentId && item.rank === row.rank && item.year === row.year)
        if (!original) check(`picked[${i}].inList`, row.contentId, null)
        if (row.contentId) { work(row, row.contentId, `picked[${i}]`); voices(row.voices, row.contentId, `picked[${i}].voices`, 3) }
      })
      if (material.closing) {
        const close = material.closing
        const matches = material.all.filter((row: any) => row.title === close.work && row.year === close.year && row.voices.some((voice: any) => voice.slug === close.slug))
        const celeb = profile(close, 'closing', true)
        if (matches.length === 1 && celeb) review(close, celeb.id, matches[0].contentId, 'closing', true)
        else check('closing.identity', { work: close.work, slug: close.slug, count: 1 }, { work: close.work, slug: close.slug, count: matches.length })
      }
    }
  }
  return differences
}

async function main() {
  const directory = path.join(ASSETS, 'tistory-cinema')
  const materials = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.json') && !name.startsWith('_') && name !== 'fn-reviews.json')
    .map((name) => ({ file: path.join(directory, name), value: JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')) }))
    .filter(({ value }) => value.work || value.celeb || value.list)
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
  const [contents, locales, celebs, reviews, lists, curators] = await Promise.all([
    readRows<any>(db, 'contents', 'id, type, external_id', (q) => q.eq('type', 'VIDEO')),
    readRows<any>(db, 'content_locales', 'content_id, locale, title', (q) => q.eq('locale', 'ko')),
    readRows<any>(db, 'celebs', 'id, slug, nickname, profession, title, headline, bio, avatar_url, publication_status'),
    readRows<any>(db, 'celeb_contents', 'id, celeb_id, content_id, review, source_url'),
    readRows<any>(db, 'curated_lists', 'id, slug, title, description, method, published_year, source_url, is_ranked, is_annual, curator_id'),
    readRows<any>(db, 'curators', 'id, slug, name, kind, homepage_url'),
  ])
  const targetListIds = lists.filter((list) => materials.some(({ value }) => value.list?.slug === list.slug)).map((list) => list.id)
  const items = targetListIds.length ? await readRows<any>(db, 'curated_list_items', 'list_id, content_id, rank, year, note, raw_title, raw_creator, sort_order, hidden', (q) => q.in('list_id', targetListIds).eq('hidden', false)) : []
  const data = { contents, locales, celebs, reviews, lists, items, curators }
  const differences = auditMaterials(materials, data)
  const { jobs } = selectCandidates(data)
  const existingPeople = savedPeople(directory, data)
  for (const job of jobs) if (job.kind === 'person' && job.id && existingPeople.has(job.id)) job.name = existingPeople.get(job.id)!
  const materialNames = materials.map(({ file }) => path.basename(file, '.json'))
  const expectedNames = jobs.map((job) => job.name)
  const headlinesFile = path.join(directory, 'headlines.json')
  const headlines: Record<string, string> = fs.existsSync(headlinesFile) ? JSON.parse(fs.readFileSync(headlinesFile, 'utf8')) : {}
  const artifactDifferences: any[] = []
  for (const { file, value } of materials) {
    const name = path.basename(file, '.json')
    const rendered = value.list ? renderList(value) : value.celeb ? renderPerson(value) : renderWork({ ...value, headline: headlines[name] ?? null })
    const bodyPath = path.join(directory, `_body-${name}.html`)
    const metaPath = path.join(directory, `_meta-${name}.json`)
    const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf8') : null
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null
    if (body !== rendered.html) artifactDifferences.push({ file: bodyPath, field: 'html', matchesCurrentRenderer: false })
    for (const field of ['title', 'tags'] as const) if (JSON.stringify(meta?.[field]) !== JSON.stringify(rendered[field])) artifactDifferences.push({ file: metaPath, field, before: meta?.[field] ?? null, after: rendered[field] })
  }
  const result = {
    checkedAt: new Date().toISOString(), materials: materials.length, candidates: jobs.length,
    missingMaterials: expectedNames.filter((name) => !materialNames.includes(name)),
    retiredMaterials: materialNames.filter((name) => !expectedNames.includes(name)),
    differences, artifactDifferences,
  }
  if (process.argv.includes('--write')) {
    const output = path.join(directory, '_audit-data.json')
    if (fs.existsSync(output)) {
      const backup = path.join(directory, '_backup', `audit-data-${Date.now()}`)
      fs.mkdirSync(backup, { recursive: true })
      fs.copyFileSync(output, path.join(backup, path.basename(output)))
    }
    const temporary = `${output}.${process.pid}.tmp`
    fs.writeFileSync(temporary, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
    fs.renameSync(temporary, output)
    console.log(`저장: ${output}`)
  }
  console.log(JSON.stringify({ materials: result.materials, candidates: result.candidates, missingMaterials: result.missingMaterials, retiredMaterials: result.retiredMaterials, differences: differences.length, visibleDifferences: differences.filter((row) => row.visible).length, artifactDifferences: artifactDifferences.length }, null, 2))
  if (differences.length || artifactDifferences.length || result.missingMaterials.length || result.retiredMaterials.length) process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main()
