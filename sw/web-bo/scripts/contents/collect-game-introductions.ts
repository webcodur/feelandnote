/** Read-only provider recovery. Writes evidence and review plans, never DB data. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type LocaleRow = { content_id: string; locale: string; title: string | null; creator: string | null; publisher: string | null; isbn: string | null; description: string | null; sources: Record<string, unknown> | null }
type Content = { id: string; type: string; external_id: string | null; external_source: string | null; content_locales: LocaleRow[] }
type Game = { id: number; name: string; slug: string; url?: string; summary?: string; storyline?: string; alternative_names?: { name: string }[]; game_type?: number; parent_game?: number }
type External = { id: number; game: number; uid: string; url?: string }
type Evidence = { url: string; note: string }
type Plan = { content: Omit<Content, 'content_locales'>; target: LocaleRow; description: string; sourceUrl: string; sourceLocale: 'ko' | 'en'; method: 'provider'; identityEvidence: Evidence[] }
const out = path.resolve(process.cwd(), '../../data/celeb/book-introductions/game-provider')
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg < 0 ? Infinity : Number(process.argv[limitArg + 1])
const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
if (!dbUrl || new URL(dbUrl).hostname !== 'db.feelandnote.com' || !process.env.DB_SECRET_KEY) throw new Error('Expected production DB read-only credentials')
const db = createClient(dbUrl, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const norm = (value: string | null | undefined) => (value ?? '').normalize('NFKC').toLowerCase().replace(/[™®©]/gu, '').replace(/[^\p{L}\p{N}]/gu, '')
const empty = (row: LocaleRow) => !row.description?.trim()
async function save(name: string, value: unknown) {
  const file = path.join(out, name)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(`${file}.tmp`, JSON.stringify(value, null, 2) + '\n', 'utf8')
  await fs.rename(`${file}.tmp`, file)
}
async function cached(name: string, fetcher: () => Promise<unknown>): Promise<unknown> {
  try { return JSON.parse(await fs.readFile(path.join(out, name), 'utf8')) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const result = await fetcher()
  await save(name, result)
  return result
}
function plain(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g, value => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' })[value]!)
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
function completeIntroduction(text: string): boolean {
  if (!text || /[,;:…]$|\.\.\.$/.test(text)) return false
  // These are platform/release notes, not descriptions of the game itself.
  if (text.length < 200 && /^(?:(?:The|A)\s+)?(?:Amiga\s+port|Master System port|remaster of the original)/i.test(text)) return false
  return true
}
async function main() {
  const contents: Content[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('contents').select('id,type,external_id,external_source,content_locales(content_id,locale,title,creator,publisher,isbn,description,sources)').eq('type', 'GAME').order('id').range(offset, offset + 499)
    if (error) throw error
    contents.push(...data as Content[])
    if (data.length < 500) break
  }
  const targets = contents.filter(row => row.content_locales.some(empty)).slice(0, limit)
  await save('targets.json', targets)
  const valid = targets.filter(row => row.external_source === 'igdb' && /^igdb-\d+$/.test(row.external_id ?? ''))
  const ids = [...new Set(valid.map(row => Number(row.external_id!.slice(5))))]
  const id = process.env.TWITCH_CLIENT_ID
  const secret = process.env.TWITCH_CLIENT_SECRET
  if (!id || !secret) throw new Error('Missing Twitch credentials')
  let token: string | undefined
  async function query(endpoint: string, body: string) {
    if (!token) {
      const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: id!, client_secret: secret!, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(30000) })
      if (!response.ok) throw new Error(`Twitch HTTP ${response.status}`)
      token = (await response.json()).access_token
    }
    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, { method: 'POST', headers: { 'Client-ID': id!, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' }, body, signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`IGDB ${endpoint} HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`)
    await pause(300)
    return response.json()
  }
  const games = new Map<number, Game>()
  const links = new Map<number, External[]>()
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200)
    const cacheKey = createHash('sha256').update(chunk.join(',')).digest('hex').slice(0, 16)
    // Existing collector uses 200-game chunks; batch retrieval retains IGDB identity and source links.
    const gameRows = await cached(`igdb/games-${cacheKey}.json`, () => query('games', `fields id,name,slug,url,summary,storyline,alternative_names.name,game_type,parent_game; where id = (${chunk.join(',')}); limit 500;`)) as Game[]
    for (const game of gameRows) if (chunk.includes(game.id)) games.set(game.id, game)
    const externalRows = await cached(`igdb/external-${cacheKey}.json`, () => query('external_games', `fields id,game,uid,url; where game = (${chunk.join(',')}) & external_game_source = 1; limit 500;`)) as External[]
    for (const row of externalRows) links.set(row.game, [...(links.get(row.game) ?? []), row])
  }
  const plans: Plan[] = []
  const translations: unknown[] = []
  const holds: unknown[] = []
  async function checkpoint(done: number) {
    await save('plans.json', plans)
    await save('translation-waiting.json', translations)
    await save('holds.json', holds)
    const stats = { total: targets.length, processed: done, providerRows: plans.length, ko: plans.filter(p => p.target.locale === 'ko').length, en: plans.filter(p => p.target.locale === 'en').length, translationWaiting: translations.length, holds: holds.length }
    await save('status.json', stats)
    console.log(JSON.stringify(stats))
  }
  for (const [index, row] of targets.entries()) {
    if (row.id === '81086420-c36f-4f42-880f-a46f3706c5ab') {
      holds.push({ content: row, reason: 'KO title names Spore base game but EN/IGDB identify separate Spore Creature Creator software; identity repair required.' })
      if ((index + 1) % 20 === 0) await checkpoint(index + 1)
      continue
    }
    const game = games.get(Number(row.external_id?.slice(5)))
    const en = row.content_locales.find(locale => locale.locale === 'en')
    const ko = row.content_locales.find(locale => locale.locale === 'ko')
    const names = game ? [game.name, ...(game.alternative_names ?? []).map(item => item.name)] : []
    if (!game || !en?.title || !names.some(name => norm(name) === norm(en.title))) {
      holds.push({ content: row, provider: game, reason: !game ? 'No verified IGDB identity' : 'English title does not match IGDB name or alternate name' })
      if ((index + 1) % 20 === 0) await checkpoint(index + 1)
      continue
    }
    const content = { id: row.id, type: row.type, external_id: row.external_id, external_source: row.external_source }
    const sourceUrl = game.url || `https://www.igdb.com/games/${game.slug}`
    const identityEvidence: Evidence[] = [{ url: sourceUrl, note: `Stored ${row.external_id} resolves to IGDB ${game.id}; EN title matches provider name/alternate name. game_type=${game.game_type ?? 'unknown'}, parent_game=${game.parent_game ?? 'none'}.` }]
    const english = [game.summary, game.storyline].map(text => plain(text ?? '')).find(text => completeIntroduction(text) && /[a-z]{3}/i.test(text) && !/[\uac00-\ud7a3\u4e00-\u9fff]/u.test(text)) ?? ''
    const englishValid = !!english
    if (empty(en)) {
      if (englishValid) plans.push({ content, target: en, description: english, sourceUrl, sourceLocale: 'en', method: 'provider', identityEvidence })
      else holds.push({ content, target: en, reason: 'No usable English summary/storyline', provider: game })
    }
    if (ko && empty(ko)) {
      let koreanPlan: Plan | undefined
      const external = (links.get(game.id) ?? []).filter(link => /^\d+$/.test(link.uid) && new RegExp(`^https?://store\\.steampowered\\.com/app/${link.uid}(?:/|$)`).test(link.url ?? ''))
      for (const link of external) {
        const steam = await cached(`steam/${link.uid}-ko.json`, async () => {
          const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${link.uid}&l=korean&cc=kr`, { signal: AbortSignal.timeout(30000) })
          if (!response.ok) throw new Error(`Steam HTTP ${response.status}`)
          const body = await response.json()
          await pause(500)
          return body
        }) as Record<string, { success: boolean; data?: { steam_appid: number; name: string; type: string; fullgame?: unknown; short_description?: string; about_the_game?: string } }>
        const item = steam[link.uid]?.data
        if (!steam[link.uid]?.success || !item || String(item.steam_appid) !== link.uid) continue
        const knownNames = [...names, ko.title ?? '']
        if (!knownNames.some(name => norm(name) === norm(item.name))) {
          holds.push({ content, steamAppId: link.uid, steamName: item.name, reason: 'Steam name differs from verified titles' })
          continue
        }
        if ((item.type === 'dlc' && !game.parent_game) || !['game', 'dlc'].includes(item.type)) {
          holds.push({ content, steamAppId: link.uid, steamType: item.type, reason: 'Steam item scope uncertain' })
          continue
        }
        const korean = [item.short_description, item.about_the_game].map(text => plain(text ?? '')).find(text => completeIntroduction(text) && (text.match(/[\uac00-\ud7a3]/gu) ?? []).length >= 10 && !(text.length > 500 && /\bDLC\b/i.test(text)))
        if (!korean) continue
        const steamUrl = `https://store.steampowered.com/app/${link.uid}/?l=koreana`
        koreanPlan = { content, target: ko, description: korean, sourceUrl: steamUrl, sourceLocale: 'ko', method: 'provider', identityEvidence: [...identityEvidence, { url: steamUrl, note: `IGDB external_games entry ${link.id} links app ${link.uid}; response steam_appid and exact title agree; Steam type=${item.type}. Publisher Korean store introduction, untruncated.` }] }
        break
      }
      if (koreanPlan) plans.push(koreanPlan)
      else if (englishValid) translations.push({ content, target: ko, sourceText: english, sourceUrl, sourceLocale: 'en', identityEvidence })
      else holds.push({ content, target: ko, reason: 'No validated Korean store introduction or English original' })
    }
    if ((index + 1) % 20 === 0) await checkpoint(index + 1)
  }
  await checkpoint(targets.length)
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
