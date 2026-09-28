/** Rebuild music-wiki targets: MUSIC contents with any empty ko/en locale.
 * iTunes lookup supplies wrapperType/artistName/trackName identity fields.
 * Lookup responses cached under music-wiki/itunes-cache.
 * node --env-file=.env --import tsx scripts/contents/prepare-music-wiki-targets.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DIR = resolve('../../data/celeb/book-introductions/music-wiki')
const cacheDir = resolve(DIR, 'itunes-cache')
mkdirSync(cacheDir, { recursive: true })
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function itunesLookup(id: string) {
  const file = resolve(cacheDir, `${createHash('sha1').update(id).digest('hex')}.json`)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const r = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`iTunes HTTP ${r.status}`)
  const body = await r.json()
  writeFileSync(file, JSON.stringify(body))
  return body
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('contents')
      .select('id,type,external_source,external_id,content_locales(content_id,locale,title,creator,description)')
      .eq('type', 'MUSIC').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  const targets: any[] = []
  let looked = 0, cached = 0
  for (const c of rows) {
    const locales = c.content_locales as any[]
    const ko = locales.find(l => l.locale === 'ko'), en = locales.find(l => l.locale === 'en')
    const koEmpty = !ko?.description?.trim(), enEmpty = !en?.description?.trim()
    if (!koEmpty && !enEmpty) continue
    const first = ko ?? en ?? locales[0] ?? {}
    let itunes: any = null
    const m = /^itunes-(\d+)$/.exec(c.external_id ?? '')
    if (c.external_source === 'itunes' && m) {
      const file = resolve(cacheDir, `${createHash('sha1').update(m[1]).digest('hex')}.json`)
      const wasCached = existsSync(file)
      try {
        const body = await itunesLookup(m[1])
        const hit = (body?.results ?? [])[0]
        if (hit) itunes = { wrapperType: hit.wrapperType, kind: hit.kind, artistName: hit.artistName, trackName: hit.trackName, collectionName: hit.collectionName, artistId: hit.artistId }
        if (wasCached) cached++; else { looked++; await sleep(200) }
      } catch (e) { console.error(JSON.stringify({ lookupFailed: c.id, error: String(e) })) }
    }
    targets.push({ content: { id: c.id, type: 'MUSIC', external_id: c.external_id, external_source: c.external_source }, itunes, title: first.title, creator: first.creator, koEmpty, enEmpty })
  }
  writeFileSync(resolve(DIR, 'targets.json'), JSON.stringify(targets, null, 2))
  console.log(JSON.stringify({ targets: targets.length, looked, cached }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
