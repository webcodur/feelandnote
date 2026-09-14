/** Read-only MUSIC introduction recovery. Saves reviewed provider candidates; never writes DB. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type Locale = 'ko' | 'en'
interface Row { content_id: string; locale: Locale; title: string | null; creator: string | null; publisher: string | null; isbn: string | null; description: string | null; sources: Record<string, unknown> | null }
interface Content { id: string; type: 'MUSIC'; external_id: string | null; external_source: string | null; metadata: Record<string, unknown>; content_locales: Row[] }
interface Summary { type?: string; title?: string; extract?: string; titles?: { normalized?: string }; content_urls?: { desktop?: { page?: string } } }
const OUT = path.resolve(process.cwd(), '../../data/celeb/book-introductions/music-provider')
const IDENTITY_FILE = path.join(OUT, 'itunes-identities.json')
const IDENTITIES: Record<string, { kind?: 'album' | 'track'; url?: string }> = fs.existsSync(IDENTITY_FILE) ? JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf8')) : {}
const LIMIT = Number(process.argv[process.argv.indexOf('--limit') + 1]) || 50
const INTERVAL_MS = 2000
const TIMEOUT_MS = 12000
const RETRY_ERRORS = process.argv.includes('--retry-errors')
const SOURCE_MODE = process.argv.includes('--search-missing')
const LINKS_MODE = process.argv.includes('--language-links')
const REMAINING_MODE = process.argv.includes('--remaining')
const LASTFM_MODE = process.argv.includes('--lastfm')
const IDENTITY_MODE = process.argv.includes('--identity')
const KO_MODE = process.argv.includes('--korean-search')
const MODE = KO_MODE ? 'korean' : IDENTITY_MODE ? 'identity' : LASTFM_MODE ? 'lastfm' : LINKS_MODE ? 'links' : REMAINING_MODE ? 'remaining' : SOURCE_MODE ? 'search' : 'stored'
const remainderMode = ['links', 'remaining', 'lastfm', 'identity', 'korean'].includes(MODE)
const remainderFile = /-(links|remaining|lastfm|identity|korean)\.json$/
fs.mkdirSync(path.join(OUT, 'results'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true })
function save(file: string, data: unknown) { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n'); fs.renameSync(tmp, file) }
function normalize(text: string) { return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '') }
function cleanTitle(text: string) { return text.replace(/\s*[([][^)\]]*(?:remaster|deluxe|expanded|bonus|edition|mono|stereo|anniversary|reissue)[^)\]]*[)\]]/gi, '').replace(/\s+-\s+(?:single|ep)$/i, '').trim() }
function unit(content: Content): 'album' | 'track' | null {
  const meta = content.metadata || {}
  if (meta.entityType === 'track' || meta.albumType === 'track') return 'track'
  if (meta.entityType === 'album' || meta.albumType === 'album') return 'album'
  if (typeof meta.itunesUrl === 'string') return /[?&]i=/.test(meta.itunesUrl) ? 'track' : /music\.apple\.com\/[^/]+\/album\//.test(meta.itunesUrl) ? 'album' : null
  return IDENTITIES[content.id]?.kind || null
}
let consecutiveErrors = 0
let lastRequest = 0
let rateLimited = false
async function getJson(url: string, plain = false): Promise<unknown> {
  const cache = path.join(OUT, 'raw', createHash('sha256').update(url).digest('hex') + '.json')
  if (fs.existsSync(cache)) { const saved = JSON.parse(fs.readFileSync(cache, 'utf8')); if (saved.status === 200 || saved.status === 404) return saved.body }
  const host = new URL(url).hostname.endsWith('.wikipedia.org') ? 'wikipedia' : new URL(url).hostname
  const backoffFile = path.join(OUT, 'network-backoff.json')
  const backoff = fs.existsSync(backoffFile) ? JSON.parse(fs.readFileSync(backoffFile, 'utf8')) : {}
  if (Date.parse(backoff[host]?.retryAt || '') > Date.now()) { rateLimited = true; throw new Error(`Retry-After remains active until ${backoff[host].retryAt}; no request sent`) }
  const delay = INTERVAL_MS - (Date.now() - lastRequest)
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
  lastRequest = Date.now()
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'feelandnote/1.0 (https://feelandnote.com)', Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const raw = await response.text()
    if (response.status === 404) { consecutiveErrors = 0; save(cache, { url, status: 404, body: null, fetchedAt: new Date().toISOString() }); return null }
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after')
      save(cache, { url, status: response.status, body: raw, retryAfter, fetchedAt: new Date().toISOString() })
      if (response.status === 429) {
        rateLimited = true
        const retryAt = retryAfter ? /^\d+$/.test(retryAfter) ? Date.now() + Number(retryAfter) * 1000 : Date.parse(retryAfter) : NaN
        save(backoffFile, { ...backoff, [host]: { retryAfter, retryAt: Number.isFinite(retryAt) ? new Date(retryAt).toISOString() : null, observedAt: new Date().toISOString() } })
      }
      throw new Error(`HTTP ${response.status}${retryAfter ? `; Retry-After ${retryAfter}` : ''}`)
    }
    const body = plain ? raw : JSON.parse(raw)
    consecutiveErrors = 0
    save(cache, { url, status: response.status, body, fetchedAt: new Date().toISOString() })
    return body
  } catch (error) {
    consecutiveErrors += 1
    throw new Error(`${(error as Error).message}; request ${url}`)
  }
}
function htmlText(html: string) {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…' }
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&([a-z]+);/gi, (full, code) => named[code] ?? full).replace(/\n{3,}/g, '\n\n').trim()
}
async function lastfmSummary(content: Content): Promise<Summary | null> {
  const row = content.content_locales.find(row => row.locale === 'en')
  const kind = unit(content)
  if (!row?.title || !row.creator || !kind) return null
  const segment = (value: string) => encodeURIComponent(value).replace(/%20/g, '+')
  const url = `https://www.last.fm/music/${segment(row.creator)}/${kind === 'track' ? '_/' : ''}${segment(cleanTitle(row.title))}/+wiki`
  const html = await getJson(url, true) as string | null
  if (!html) return null
  const heading = htmlText(html.match(/<meta property="og:title"\s+content="([^"]+)"/)?.[1] || '')
  if (normalize(heading) !== normalize(`Wiki - ${cleanTitle(row.title)} — ${row.creator} | Last.fm`)) return null
  const body = html.match(/<div class="wiki-content"[^>]*>([\s\S]*?)<\/div>/)?.[1]
  if (!body) return null
  const extract = htmlText(body)
  if (/&[a-z]+;/i.test(extract) || /\[(?:verse|chorus|bridge|intro)\b/i.test(extract) || extract.length > 7000) return null
  return { type: 'standard', title: cleanTitle(row.title), extract, content_urls: { desktop: { page: url } } }
}
function reject(summary: Summary, content: Content, locale: Locale) {
  const text = summary.extract?.trim() || ''
  const title = summary.titles?.normalized || summary.title || ''
  const row = content.content_locales.find(row => row.locale === locale)
  if (!row || summary.type !== 'standard' || text.length < 80) return 'missing-or-short-standard-introduction'
  const wantedTitle = normalize(cleanTitle(row.title || ''))
  if (!wantedTitle || normalize(title.replace(/\s*\([^)]*\)\s*$/, '')) !== wantedTitle) return 'title-mismatch'
  if (/\b(live|remix|cover version)\b/i.test(row.title || '')) return 'recording-version-needs-review'
  const kind = unit(content)
  if (!kind) return 'unknown-music-unit'
  const lead = text.slice(0, 500)
  const definition = lead.match(/\bis\s+(?:the|an?)\s+([^\n]{0,220})/i)?.[1] || ''
  const firstCategory = definition.match(/\b(album|EP|box set|compilation|song|single|singer|musician|band|rapper|producer|symphony|composition)\b/i)?.[1].toLowerCase()
  const kindMatch = locale === 'en'
    ? kind === 'album' ? ['album', 'ep', 'box set', 'compilation'].includes(firstCategory || '') : ['song', 'single'].includes(firstCategory || '')
    : kind === 'album' ? /(?:음반|앨범|EP)(?:이다|이며|으로)/.test(lead) : /(?:노래|싱글|곡)(?:이다|이며|으로)/.test(lead)
  if (!kindMatch) return 'wrong-or-unconfirmed-work-kind'
  // Check the opening identification, not a later mention of a cover performer.
  const creator = normalize(row.creator || '')
  const openingSentence = text.split(/\.(?=\s+(?:[A-Z][a-z]|It\s|The\s|In\s|"[A-Z]))/)[0].slice(0, 400)
  if (!creator || !normalize(openingSentence).includes(creator)) return 'creator-not-in-opening-identification'
  if (locale === 'ko' && !/[가-힣]/.test(text)) return 'wrong-language'
  if (locale === 'en' && /[가-힣]/.test(text.slice(0, 100))) return 'wrong-language'
  return null
}
async function candidates(content: Content): Promise<Array<{ url: string; locale: Locale }>> {
  const out: Array<{ url: string; locale: Locale }> = []
  if (KO_MODE) {
    const row = content.content_locales.find(row => row.locale === 'ko')
    if (!row?.title || !row.creator) return []
    const query = new URLSearchParams({ q: `${cleanTitle(row.title)} ${row.creator} ${unit(content) === 'album' ? '음반' : '노래'}`, limit: '4' })
    const response = await getJson(`https://ko.wikipedia.org/w/rest.php/v1/search/page?${query}`) as { pages?: { key: string }[] } | null
    for (const page of response?.pages || []) if (normalize(page.key.replace(/_\(.*\)$/, '').replace(/_/g, ' ')) === normalize(cleanTitle(row.title))) out.push({ url: `https://ko.wikipedia.org/wiki/${encodeURIComponent(page.key)}`, locale: 'ko' })
    return out
  }
  for (const row of content.content_locales) {
    const source = row.sources?.description
    if (typeof source !== 'string') continue
    const match = source.match(/^https:\/\/(en|ko)\.wikipedia\.org\/wiki\/(.+)$/)
    if (match && (LINKS_MODE || REMAINING_MODE || !content.content_locales.find(row => row.locale === match[1])?.description?.trim())) out.push({ url: source, locale: match[1] as Locale })
    if (LINKS_MODE && match?.[1] === 'ko') {
      const query = new URLSearchParams({ action: 'query', prop: 'langlinks', titles: decodeURIComponent(match[2]).replace(/_/g, ' '), lllang: 'en', lllimit: '1', redirects: '1', format: 'json' })
      const response = await getJson(`https://ko.wikipedia.org/w/api.php?${query}`) as { query?: { pages?: Record<string, { langlinks?: Array<{ '*': string }> }> } } | null
      for (const page of Object.values(response?.query?.pages || {})) for (const link of page.langlinks || []) out.unshift({ url: `https://en.wikipedia.org/wiki/${encodeURIComponent(link['*'].replace(/ /g, '_'))}`, locale: 'en' })
    }
  }
  if ((SOURCE_MODE && !out.length) || REMAINING_MODE || IDENTITY_MODE) {
    const row = content.content_locales.find(row => row.locale === 'en')
    if (row?.title && row.creator) {
      const query = new URLSearchParams({ q: `${cleanTitle(row.title)} ${row.creator} ${unit(content) === 'album' ? 'album' : 'song'}`, limit: '4' })
      const response = await getJson(`https://en.wikipedia.org/w/rest.php/v1/search/page?${query}`) as { pages?: { key: string }[] } | null
      for (const page of response?.pages || []) if (normalize(page.key.replace(/_\(.*\)$/, '').replace(/_/g, ' ')) === normalize(cleanTitle(row.title))) out.push({ url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`, locale: 'en' })
    }
  }
  return Array.from(new Map(out.map(candidate => [candidate.url, candidate])).values())
}
async function main() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  if (!url || new URL(url).hostname !== 'db.feelandnote.com' || !process.env.DB_SECRET_KEY) throw new Error('Expected production read-only DB credentials')
  const db = createClient(url, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const contents: Content[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('contents').select('id,type,external_id,external_source,metadata,content_locales(content_id,locale,title,creator,publisher,isbn,description,sources)').eq('type', 'MUSIC').order('id').range(from, from + 499)
    if (error) throw error
    contents.push(...data as unknown as Content[])
    if (data.length < 500) break
  }
  save(path.join(OUT, 'snapshot.json'), contents)
  const targets = contents.filter(content => KO_MODE ? content.content_locales.some(row => !row.description?.trim()) && content.content_locales.some(row => row.locale === 'ko' && /[가-힣]/.test(row.title || '')) : IDENTITY_MODE ? Boolean(IDENTITIES[content.id]?.kind) && content.content_locales.some(row => !row.description?.trim()) : LASTFM_MODE
    ? content.content_locales.some(row => !row.description?.trim()) && (() => { const file = path.join(OUT, 'results', `${content.id}-remaining.json`); return fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).status === 'unresolved' })()
    : SOURCE_MODE
    ? content.content_locales.some(row => row.locale === 'ko' && !row.description?.trim() && !row.sources?.introMissing)
    : LINKS_MODE ? content.content_locales.some(row => typeof row.sources?.description === 'string' && /^https:\/\/ko\.wikipedia\.org\/wiki\//.test(row.sources.description)) && content.content_locales.some(row => row.locale === 'en' && !row.description?.trim())
    : REMAINING_MODE ? content.content_locales.some(row => !row.description?.trim())
    : content.content_locales.some(row => typeof row.sources?.description === 'string' && /^https:\/\/(en|ko)\.wikipedia\.org\/wiki\//.test(row.sources.description) && !content.content_locales.find(other => other.locale === (row.sources!.description as string).split('//')[1].split('.')[0])?.description?.trim()))
  console.log(JSON.stringify({ totalMusic: contents.length, targets: targets.length, mode: MODE }))
  let processed = 0
  for (const content of targets) {
    if (process.argv.includes('--recheck')) break
    const output = path.join(OUT, 'results', `${content.id}-${MODE}.json`)
    if (fs.existsSync(output)) { const previous = JSON.parse(fs.readFileSync(output, 'utf8')); if (!RETRY_ERRORS || previous.status !== 'error') continue }
    if (processed >= LIMIT) break
    processed += 1
    const plans: unknown[] = [], translationQueue: unknown[] = [], rejected: unknown[] = []
    try {
      const lastfm = LASTFM_MODE ? await lastfmSummary(content) : null
      const candidateList = LASTFM_MODE ? (lastfm ? [{ url: lastfm.content_urls!.desktop!.page!, locale: 'en' as Locale }] : []) : await candidates(content)
      for (const candidate of candidateList) {
        const key = decodeURIComponent(new URL(candidate.url).pathname.slice('/wiki/'.length))
        const summary = LASTFM_MODE ? lastfm : await getJson(`https://${candidate.locale}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`) as Summary | null
        if (!summary) { rejected.push({ url: candidate.url, reason: 'no-page' }); continue }
        const reason = reject(summary, content, candidate.locale)
        if (reason) { rejected.push({ url: candidate.url, reason, title: summary.title, excerpt: summary.extract?.slice(0, 400) }); continue }
        const sourceUrl = summary.content_urls?.desktop?.page || candidate.url
        const identityEvidence = [{ url: sourceUrl, note: `Verified ${unit(content)} title and creator against the opening definition; saved full provider response locally.` }]
        if (IDENTITIES[content.id]?.url) identityEvidence.push({ url: IDENTITIES[content.id].url!, note: 'Apple lookup independently confirmed external ID, track/album kind, exact title and artist; raw response saved.' })
        for (const target of content.content_locales.filter(row => !row.description?.trim())) {
          const value = { content: { id: content.id, type: content.type, external_id: content.external_id, external_source: content.external_source }, target, description: summary.extract!.trim(), sourceUrl, sourceLocale: candidate.locale, method: 'provider', identityEvidence }
          if (target.locale === candidate.locale) plans.push(value)
          else translationQueue.push(value)
        }
        break
      }
      save(output, { status: plans.length || translationQueue.length ? 'candidate' : 'unresolved', contentId: content.id, plans, translationQueue, rejected })
      console.log(JSON.stringify({ processed, id: content.id, title: content.content_locales.find(row => row.locale === 'en')?.title, plans: plans.length, translations: translationQueue.length, rejected: rejected.map(item => (item as { reason: string }).reason) }))
    } catch (error) {
      save(output, { status: 'error', contentId: content.id, error: (error as Error).message })
      console.log(JSON.stringify({ processed, id: content.id, status: 'error', error: (error as Error).message }))
      if (rateLimited) throw new Error('Stopped on provider rate limit; honor Retry-After before explicitly resuming')
      if (consecutiveErrors >= 3) throw new Error('Stopped after three consecutive network failures; rerun with --retry-errors')
    }
  }
  const results = fs.readdirSync(path.join(OUT, 'results')).filter(name => name.endsWith('.json') && (remainderMode ? remainderFile.test(name) : !remainderFile.test(name))).map(name => JSON.parse(fs.readFileSync(path.join(OUT, 'results', name), 'utf8')))
  const contentById = new Map(contents.map(content => [content.id, content]))
  const holdsFile = path.join(OUT, 'review-holds.json')
  const holds: Record<string, string> = fs.existsSync(holdsFile) ? JSON.parse(fs.readFileSync(holdsFile, 'utf8')) : {}
  const recheckRejected: unknown[] = []
  const keep = (plan: { content: { id: string }; description: string; sourceUrl: string; sourceLocale: Locale }) => {
    const content = contentById.get(plan.content.id)
    const source = new URL(plan.sourceUrl)
    const title = source.hostname === 'www.last.fm' ? cleanTitle(content?.content_locales.find(row => row.locale === plan.sourceLocale)?.title || '') : decodeURIComponent(source.pathname.slice('/wiki/'.length)).replace(/_/g, ' ')
    const reason = holds[plan.content.id] || (content ? reject({ type: 'standard', title, extract: plan.description }, content, plan.sourceLocale) : 'content-no-longer-present')
    if (reason) recheckRejected.push({ contentId: plan.content.id, reason, sourceUrl: plan.sourceUrl })
    return !reason
  }
  const dedupe = (items: Array<{ content: { id: string }; target: Row }>) => Array.from(new Map(items.map(item => [`${item.content.id}:${item.target.locale}`, item])).values())
  const plans = dedupe(results.flatMap(result => result.plans || []).filter(keep))
  const translations = dedupe(results.flatMap(result => result.translationQueue || []).filter(keep))
  const prefix = remainderMode ? 'remainder-' : ''
  save(path.join(OUT, `${prefix}provider-plan.json`), plans)
  save(path.join(OUT, `${prefix}translation-queue.json`), translations)
  save(path.join(OUT, `${prefix}recheck-rejected.json`), recheckRejected)
  console.log(JSON.stringify({ processed, totalResults: results.length, plans: plans.length, translations: translations.length, recheckRejected: recheckRejected.length }))
}
main().catch(error => { console.error((error as Error).message); process.exitCode = 1 })
