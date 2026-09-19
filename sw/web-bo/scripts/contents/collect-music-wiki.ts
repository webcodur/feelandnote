/** MUSIC 잔여 공란 소개문 수집: Last.fm 곡/앨범 위키 + 위키백과 ko·en.
 *  iTunes 메타(artistName·wrapperType)를 기준으로 제목+아티스트 정체성을 검증한다.
 *  Last.fm autocorrect=0 필수 — 유명곡으로 보정되어 다른 아티스트 곡으로 이동하는 사고 방지.
 *  결과는 music-wiki/results.json에 누적 저장(재실행 시 스킵). */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DIR = resolve('../../data/celeb/book-introductions/music-wiki')
const LASTFM = process.env.LASTFM_API_KEY
if (!LASTFM) throw new Error('LASTFM_API_KEY missing (sw/web/.env)')

const UA = { 'User-Agent': 'feelandnote-content-research/1.0 (contact: admin@feelandnote.com)' }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s*\(.*?\)\s*/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

const lastfmSummary = (wiki: any): string | null => {
  // wiki.summary는 문장 중간에 끊기는 티저다 — 전문인 wiki.content를 우선한다
  const s = (wiki?.content || wiki?.summary)?.trim()
  if (!s || s.length < 80) return null
  return s.replace(/<a href="https?:\/\/www\.last\.fm[^"]*"[^>]*>Read more on Last\.fm<\/a>\.?/g, '')
    .replace(/User-contributed text is available under the Creative Commons[^.]+\.?\s*/g, '').trim()
}

interface Result {
  contentId: string; kind: 'track' | 'album' | 'unresolved'
  lastfm?: { url: string; summary: string; matchedName: string; matchedArtist: string } | null
  wiki?: Record<string, { url: string; extract: string; title: string } | null>
  hold?: string
}

async function lastfmTrack(artist: string, track: string) {
  const u = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&autocorrect=0&format=json`
  const j = await fetch(u).then(r => r.json()).catch(() => null)
  const t = j?.track
  if (!t || j?.error) return null
  if (norm(t.artist?.name || '') !== norm(artist) || norm(t.name || '') !== norm(track)) return null
  const summary = lastfmSummary(t.wiki)
  return summary ? { url: t.url, summary, matchedName: t.name, matchedArtist: t.artist.name } : null
}

async function lastfmAlbum(artist: string, album: string) {
  const u = `https://ws.audioscrobbler.com/2.0/?method=album.getInfo&api_key=${LASTFM}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&autocorrect=0&format=json`
  const j = await fetch(u).then(r => r.json()).catch(() => null)
  const a = j?.album
  if (!a || j?.error) return null
  if (norm(a.artist || '') !== norm(artist) || norm(a.name || '') !== norm(album)) return null
  const summary = lastfmSummary(a.wiki)
  return summary ? { url: a.url, summary, matchedName: a.name, matchedArtist: a.artist } : null
}

async function wikiApi(locale: string, params: string, retry = 2): Promise<any> {
  for (let i = 0; i <= retry; i++) {
    const r = await fetch(`https://${locale}.wikipedia.org/w/api.php?${params}&format=json&origin=*`, { headers: UA })
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (i + 1)); continue }
    return r.json().catch(() => null)
  }
  return null
}

async function wikiSearch(locale: string, query: string, wantTitle: string, wantArtist: string, kind: 'track' | 'album') {
  const suffixes = kind === 'track' ? ['song', '노래'] : ['album', '음반']
  const cands = [
    `${wantTitle} (${wantArtist} ${suffixes[0]})`, `${wantTitle} (${suffixes[0]})`,
    `${wantTitle} (${wantArtist} ${suffixes[1]})`, `${wantTitle} (${wantArtist}의 ${suffixes[1]})`,
    wantTitle,
  ]
  const search = await wikiApi(locale, `action=opensearch&search=${encodeURIComponent(query)}&limit=5`)
  const titles = new Set<string>(cands)
  if (Array.isArray(search?.[1])) for (const t of search[1]) titles.add(t)
  for (const t of titles) {
    const j = await wikiApi(locale, `action=query&prop=extracts|pageprops&explaintext&exintro&titles=${encodeURIComponent(t)}&redirects=1`)
    const p = j && Object.values(j.query.pages)[0] as any
    // 동음이의 문서 배제
    if (!p || p.missing !== undefined || p.pageprops?.disambiguation !== undefined || !p.extract || p.extract.length < 80) continue
    if (/다음과 같은 뜻이 있다|may refer to/i.test(p.extract)) continue
    // 정체성: 제목 근사 + 아티스트 언급(또는 곡/앨범 지시어)
    const head = norm(p.extract.slice(0, 500))
    const tOk = head.includes(norm(wantTitle).slice(0, 12)) || norm(p.title).includes(norm(wantTitle).slice(0, 12))
    const aOk = !wantArtist || head.includes(norm(wantArtist).split(' ')[0])
    if (tOk && aOk) {
      const url = `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`
      // 발췌는 문장 경계에서 자른다 — 중간 절단 원문이 번역 큐로 새지 않게 한다
      const cut = p.extract.length <= 1500 ? p.extract : (p.extract.slice(0, 1500).match(/[\s\S]*[.!?…](?=\s|$)/)?.[0] ?? p.extract.slice(0, 1500))
      return { url, extract: cut, title: p.title }
    }
  }
  return null
}

async function main() {
  const targets = JSON.parse(readFileSync(resolve(DIR, 'targets.json'), 'utf8'))
  const outPath = resolve(DIR, 'results.json')
  const results: Record<string, Result> = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {}
  let done = Object.keys(results).length, found = 0

  const work = async (t: any) => {
    const kind = t.itunes?.wrapperType === 'collection' ? 'album' : t.itunes ? 'track' : 'unresolved'
    const artist = t.itunes?.artistName || t.creator || ''
    const name = t.itunes?.trackName || t.itunes?.collectionName || t.title || ''
    const r: Result = { contentId: t.content.id, kind, lastfm: null, wiki: {} }
    if (kind === 'unresolved') r.hold = 'iTunes lookup unresolved — entity removed from catalog'
    if (artist && name) {
      if (kind === 'track') r.lastfm = await lastfmTrack(artist, name)
      else if (kind === 'album') r.lastfm = await lastfmAlbum(artist, name)
      for (const locale of ['en', 'ko']) {
        r.wiki![locale] = await wikiSearch(locale, `${name} ${artist}`, name, artist, kind === 'album' ? 'album' : 'track')
        await sleep(200)
      }
    } else r.hold = 'missing artist/title metadata'
    results[t.content.id] = r
    done++
    if (r.lastfm || r.wiki?.en || r.wiki?.ko) found++
    if (done % 50 === 0) {
      writeFileSync(outPath, JSON.stringify(results, null, 1))
      console.log(JSON.stringify({ done, total: targets.length, found }))
    }
  }

  const pending = targets.filter((t: any) => !results[t.content.id])
  const CONCURRENCY = 5
  for (let i = 0; i < pending.length; i += CONCURRENCY)
    await Promise.all(pending.slice(i, i + CONCURRENCY).map(work))
  writeFileSync(outPath, JSON.stringify(results, null, 1))
  const stat = { lastfm: 0, wikiEn: 0, wikiKo: 0, any: 0, held: 0 }
  for (const r of Object.values(results)) {
    if (r.lastfm) stat.lastfm++
    if (r.wiki?.en) stat.wikiEn++
    if (r.wiki?.ko) stat.wikiKo++
    if (r.lastfm || r.wiki?.en || r.wiki?.ko) stat.any++
    if (r.hold) stat.held++
  }
  console.log(JSON.stringify({ event: 'summary', ...stat, total: Object.keys(results).length }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
