/** Targeted read-only follow-up using the completed GAME collection's evidence. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { getGameById } from '../../../../packages/content-search/src/igdb'
import { prepareMediaIntroduction, type ReviewedMediaIntroduction } from './media-introduction-contract'
async function main() {
const dir = path.resolve('../../data/celeb/book-introductions/game-provider')
const targets = JSON.parse(await fs.readFile(path.join(dir, 'game-residual-targets.json'), 'utf8'))
const games = (await Promise.all((await fs.readdir(path.join(dir, 'igdb'))).filter(name => name.startsWith('games-')).map(async name => JSON.parse(await fs.readFile(path.join(dir, 'igdb', name), 'utf8'))))).flat()
const save = (name: string, data: unknown) => fs.writeFile(path.join(dir, name), JSON.stringify(data, null, 2) + '\n', 'utf8')
const plans: ReviewedMediaIntroduction[] = []
function add(contentId: string, description: string, sourceUrl: string, note: string, sourceOverride?: string) {
  const row = targets.find((target: { id: string }) => target.id === contentId)
  const plan = { content: { id: row.id, type: row.type, external_id: row.external_id, external_source: sourceOverride ?? row.external_source }, target: row.content_locales.find((locale: { locale: string }) => locale.locale === 'en'), description, sourceUrl, sourceLocale: 'en' as const, method: 'provider' as const, identityEvidence: [{ url: sourceUrl, note }] }
  prepareMediaIntroduction(plan)
  plans.push(plan)
}
const knightmare = games.find(game => game.id === 13670)
add('db306096-eeac-5dd1-8658-50abfc161f24', knightmare.summary, knightmare.url, 'IGDB 13670 Knightmare, Konami MSX shooter; exact KO/EN title. Japanese original title in parentheses is not a Japanese-language introduction. Existing collector rejected any CJK character; reviewed text is English.')
const earthbound = games.find(game => game.id === 2899)
add('2049ef10-3dfa-4133-8f8f-a7cd9f1c526e', earthbound.summary, earthbound.url, 'IGDB 2899 EarthBound is the Mother 2 main game; alternate_names explicitly lists Mother 2: Giygas Strikes Back and MOTHER2 ギーグの逆襲, matching existing MOTHER 2 기그의 역습. Existing creator HAL Laboratory, Ape agrees. Identity independently reviewed by ko_intro_translate_c.')
const norm = (value: string) => value.toLowerCase().replace(/[™®©]/g, '').replace(/[^\p{L}\p{N}]/gu, '')
for (const [contentId, igdbId, appId] of [['f8feb131-96c5-5f67-a4bb-2bc6b42a5fe3', 265111, '2567870'], ['d41bcd48-1f0e-4c37-a98e-7bb8f96f8771', 19124, '397350']] as const) {
  const file = `game-residual-steam-${appId}-en.json`
  let raw
  try { raw = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) } catch {
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us`, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`Steam HTTP ${response.status}`)
    raw = await response.json()
    await save(file, raw)
  }
  const item = raw[appId]?.data
  const game = games.find(game => game.id === igdbId)
  if (!raw[appId]?.success || item.steam_appid !== Number(appId) || item.type !== 'game' || norm(item.name) !== norm(game.name)) throw new Error(`Steam identity failed ${appId}`)
  const plain = (text: string) => text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
  const description = [item.short_description, item.about_the_game].map(plain).find(text => text && !/[,;:…]$|\.\.\.$/.test(text))
  if (!description) throw new Error(`No complete Steam introduction ${appId}`)
  add(contentId, description, `https://store.steampowered.com/app/${appId}/?l=english`, `IGDB ${igdbId} exact name ${game.name}; previously collected external_games links Steam app ${appId}. Live appdetails name, steam_appid and game type match; full English publisher introduction replaces incomplete IGDB summary.`)
  await new Promise(resolve => setTimeout(resolve, 500))
}
const wartales = await getGameById('igdb-152257')
await save('game-residual-wartales-lookup.json', { externalId: 'igdb-152257', result: wartales, note: 'Null is inconclusive (wrapper masks HTTP failures and missing identities); do not reassign external ID.' })
if (wartales?.title === 'Wartales' && wartales.creator === 'Shiro Games' && wartales.metadata.summary) add('c6758f9c-455a-41e7-9652-f86a06f62786', wartales.metadata.summary, 'https://www.igdb.com/games/wartales', 'Existing IGDB external ID 152257 was requeried through the project wrapper; returned exact title Wartales and creator Shiro Games, both agree with existing KO/EN. Full English summary preserved. Requires separately backed-up CAS repair of contents.external_source null to igdb before application.', 'igdb')
await save('game-residual-plans.json', plans)
console.log(JSON.stringify({ proposed: plans.length, titles: plans.map(plan => plan.target.title), wartalesLookupReturned: !!wartales }))
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
