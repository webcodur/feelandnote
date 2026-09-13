import fs from 'node:fs'
import path from 'node:path'
import { personReview, type SelectionData, type Job } from './selection.mts'
import { renderPerson, TITLE_MAX, type PersonMaterial } from '../render.mts'

type MovieInfo = {
  overview?: string; runtime?: number; genres?: string[]; voteCount?: number
  vote?: number | null; release?: string | null; creator?: string | null; poster?: string | null
  trailer?: { key: string; name: string } | null
}
type CachedArticle = {
  work?: MovieInfo & { id: string }; tmdb?: MovieInfo & { director?: string[] }
  celeb?: object; list?: object; picked?: (MovieInfo & { id?: string; contentId?: string })[]
}
type TmdbMovie = {
  id: number; overview?: string; runtime?: number; genres?: { name: string }[]; vote_count?: number
  vote_average?: number; release_date?: string; poster_path?: string
  videos?: { results: { site: string; type: string; key: string; name: string; iso_639_1?: string }[] }
  credits?: { crew: { job: string; name: string }[] }
}
export type StoredPersonMaterial = PersonMaterial & {
  celeb: PersonMaterial['celeb'] & { id: string; publication_status: string | null }
  picked: (PersonMaterial['picked'][number] & { rid: string; source_url: string | null; external: string | null })[]
}

/** Metadata only: never borrow another person's review from a cached article. */
export class MovieCache {
  private saved = new Map<string, MovieInfo>()
  private pending = new Map<string, Promise<MovieInfo>>()
  private slots = 0
  private queue: (() => void)[] = []
  private failures = 0
  readonly stats = { reused: 0, fetched: 0, requests: 0 }
  constructor(private directory: string, private apiKey = process.env.TMDB_API_KEY, private request: typeof fetch = fetch) {
    if (!fs.existsSync(directory)) return
    for (const file of fs.readdirSync(directory).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      let m: CachedArticle
      try { m = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')) } catch { continue }
      if (m.work && m.tmdb) this.remember(m.work.id, { ...m.work, ...m.tmdb, creator: m.work.creator || m.tmdb.director?.join(', ') })
      if (m.celeb) for (const r of m.picked ?? []) if (r.id) this.remember(r.id, r)
      if (m.list) for (const r of m.picked ?? []) if (r.contentId) this.remember(r.contentId, r)
    }
  }
  private remember(id: string, value: MovieInfo) {
    if (!Object.hasOwn(value, 'overview')) return
    const old = this.saved.get(id)
    if (!old || (old.voteCount == null && value.voteCount != null)) {
      const { overview, runtime, genres, voteCount, vote, release, creator, poster, trailer } = value
      this.saved.set(id, { overview, runtime, genres, voteCount, vote, release, creator, poster, trailer })
    }
  }
  async get(contentId: string, tmdbId: string): Promise<MovieInfo> {
    const cached = this.saved.get(contentId)
    if (cached) { this.stats.reused++; return cached }
    let promise = this.pending.get(tmdbId)
    if (!promise) {
      promise = this.load(tmdbId)
      this.pending.set(tmdbId, promise)
    }
    const value = await promise
    this.saved.set(contentId, value)
    return value
  }
  private async load(id: string): Promise<MovieInfo> {
    const cacheDir = path.join(this.directory, '_tmdb-cache')
    const file = path.join(cacheDir, `movie-${id}.json`)
    if (fs.existsSync(file)) {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (cached.id === id && cached.info && typeof cached.info.overview === 'string') { this.stats.reused++; return cached.info }
      throw new Error(`Invalid cached movie metadata: ${id}`)
    }
    if (this.slots >= 3) await new Promise<void>((resolve) => this.queue.push(resolve))
    else this.slots++
    try {
      if (this.failures >= 3) throw new Error('TMDB repeated failures: batch stopped')
      if (!this.apiKey) throw new Error('TMDB_API_KEY is missing')
      let detail: TmdbMovie | undefined
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          this.stats.requests++
          const url = new URL(`https://api.themoviedb.org/3/movie/${id}`)
          url.search = new URLSearchParams({ api_key: this.apiKey, language: 'ko-KR', append_to_response: 'videos,credits', include_video_language: 'en,ko,null' }).toString()
          const response = await this.request(url, { signal: AbortSignal.timeout(25000) })
          if (!response.ok) {
            if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`TMDB permanent HTTP ${response.status}: movie ${id}`)
            throw new Error(`TMDB temporary HTTP ${response.status}: movie ${id}`)
          }
          detail = await response.json() as TmdbMovie
          if (detail.id !== Number(id)) throw new Error(`TMDB identity mismatch: movie ${id}`)
          break
        } catch (error) {
          if (attempt === 2 || /permanent|identity mismatch/.test((error as Error).message)) throw error
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
        }
      }
      if (!detail) throw new Error(`TMDB returned no movie: ${id}`)
      const trailers = (detail.videos?.results ?? []).filter((v) => v.site === 'YouTube' && /Trailer|Teaser/i.test(v.type))
      const trailer = trailers.find((v) => v.iso_639_1 === 'en') ?? trailers[0]
      const info: MovieInfo = {
        overview: detail.overview ?? '', runtime: detail.runtime || undefined, genres: (detail.genres ?? []).map((g) => g.name),
        voteCount: detail.vote_count ?? 0, vote: detail.vote_average ?? null, release: detail.release_date || null,
        creator: (detail.credits?.crew ?? []).filter((r) => r.job === 'Director').map((r) => r.name).join(', ') || null,
        poster: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
        trailer: trailer ? { key: trailer.key, name: trailer.name } : null,
      }
      fs.mkdirSync(cacheDir, { recursive: true })
      const temp = `${file}.cinema_generate_people-${process.pid}.tmp`
      fs.writeFileSync(temp, JSON.stringify({ id, fetchedAt: new Date().toISOString(), info }, null, 2))
      fs.renameSync(temp, file)
      this.failures = 0
      this.stats.fetched++
      return info
    } catch (error) {
      this.failures++
      throw error
    } finally {
      const next = this.queue.shift()
      if (next) next()
      else this.slots--
    }
  }
}

export function personContext(data: SelectionData, cache: MovieCache) {
  const works = new Map(data.contents.filter((r) => /^tmdb-movie-\d+$/.test(r.external_id ?? '')).map((r) => [r.id, r]))
  const locales = new Map(data.locales.filter((r) => r.locale === 'ko').map((r) => [r.content_id, r]))
  const byPerson = new Map<string, SelectionData['reviews']>()
  for (const r of data.reviews) if (works.has(r.content_id)) {
    const rows = byPerson.get(r.celeb_id) ?? []
    rows.push(r)
    byPerson.set(r.celeb_id, rows)
  }
  return { data, cache, works, locales, byPerson }
}

export async function buildPersonMaterial(context: ReturnType<typeof personContext>, personId: string, pick = 6): Promise<StoredPersonMaterial> {
  if (!Number.isInteger(pick) || pick < 1 || pick > 6) throw new Error('--pick must be between 1 and 6')
  const celeb = context.data.celebs.find((r) => r.id === personId)
  if (!celeb?.slug) throw new Error(`Person has no existing slug: ${personId}`)
  const all = context.byPerson.get(personId) ?? []
  const usable = all.filter((r) => personReview(r.review, r.id) && context.locales.get(r.content_id)?.title)
  const shortlist = [...usable].sort((a, b) => b.review!.length - a.review!.length || a.id.localeCompare(b.id)).slice(0, 20)
  if (!shortlist.length) throw new Error(`Person has no usable titled movie record: ${celeb.slug}`)
  const detailed = await Promise.all(shortlist.map(async (r) => {
    const w = context.works.get(r.content_id)!
    const l = context.locales.get(r.content_id)!
    const info = await context.cache.get(w.id, w.external_id!.slice('tmdb-movie-'.length))
    return { id: w.id, rid: r.id, source_url: r.source_url ?? null, title: l.title, poster: l.thumbnail_url || info.poster || null,
      creator: l.creator || info.creator || null, release: w.release_date || info.release || null,
      vote: w.metadata?.voteAverage ?? info.vote ?? null, external: w.external_id, review: r.review!,
      overview: info.overview ?? '', runtime: info.runtime, genres: info.genres, voteCount: info.voteCount ?? w.metadata?.voteCount ?? 0, trailer: info.trailer ?? null }
  }))
  detailed.sort((a, b) => b.voteCount - a.voteCount || b.review.length - a.review.length || a.rid.localeCompare(b.rid))
  return {
    celeb: { id: celeb.id, slug: celeb.slug, name: celeb.nickname, publication_status: celeb.publication_status ?? null,
      profession: celeb.profession ?? null, title: celeb.title ?? null, headline: celeb.headline ?? null, bio: celeb.bio ?? null, avatar: celeb.avatar_url ?? null },
    total: all.length, usable: usable.length, picked: detailed.slice(0, pick),
  }
}

export function savedPeople(directory: string, data: SelectionData) {
  const bySlug = new Map(data.celebs.filter((r) => r.slug).map((r) => [r.slug, r.id]))
  const result = new Map<string, string>()
  if (!fs.existsSync(directory)) return result
  for (const file of fs.readdirSync(directory).filter((f) => f.startsWith('인물-') && f.endsWith('.json'))) {
    const m = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))
    if (!m.celeb) continue
    const id = m.celeb.id ?? bySlug.get(m.celeb.slug)
    if (!id) throw new Error(`Unresolved existing person identity: ${file}`)
    if (m.celeb.id && bySlug.get(m.celeb.slug) !== id) throw new Error(`Existing person ID/slug disagree: ${file}`)
    if (result.has(id)) throw new Error(`Duplicate existing person material: ${file}`)
    result.set(id, file.slice(0, -5))
  }
  return result
}

/** A body file alone is not proof that the right person's complete article was saved. */
export function completedPerson(directory: string, job: Job): boolean {
  try {
    const material = JSON.parse(fs.readFileSync(path.join(directory, `${job.name}.json`), 'utf8'))
    if (!material.celeb || material.celeb.slug !== job.arg[1] || (material.celeb.id && material.celeb.id !== job.id) || !material.picked?.length) return false
    const body = fs.readFileSync(path.join(directory, `_body-${job.name}.html`), 'utf8')
    const meta = JSON.parse(fs.readFileSync(path.join(directory, `_meta-${job.name}.json`), 'utf8'))
    const rendered = renderPerson(material)
    return body === rendered.html && meta.title === rendered.title && meta.title.length <= TITLE_MAX &&
      JSON.stringify(meta.tags) === JSON.stringify(rendered.tags) && meta.length === body.length &&
      fs.existsSync(path.join(directory, `_preview-${job.name}.html`))
  } catch { return false }
}

export function backupArticle(directory: string, name: string) {
  const backup = path.join(directory, '_backup', `cinema_generate_people-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`, name)
  for (const file of [`${name}.json`, `_body-${name}.html`, `_meta-${name}.json`, `_preview-${name}.html`]) {
    const source = path.join(directory, file)
    if (!fs.existsSync(source)) continue
    fs.mkdirSync(backup, { recursive: true })
    fs.copyFileSync(source, path.join(backup, file))
  }
  return backup
}
