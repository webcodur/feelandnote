/** Second-pass Wikipedia collector for MUSIC rows still empty after collect-music-wiki/Last.fm.
 * Identity: normalized page title equals the track/album title AND the artist name appears in the lead.
 * Artist matching accepts the row's own creator strings (ko/en) or iTunes artist when present.
 * Read-only; writes data/celeb/music-wiki2/plan.json for apply-media-introductions.ts.
 * node --env-file=.env --import tsx scripts/contents/collect-music-wiki2.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { mediaIntroductionText, type ReviewedMediaIntroduction } from './media-introduction-contract'

const dir = path.resolve('../../data/celeb/music-wiki2')
fs.mkdirSync(dir, { recursive: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } })

const norm = (s: string) => (s || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC')
  .replace(/[^a-z0-9가-힣]/g, '')
const UA = { 'User-Agent': 'feelandnote/1.0 (https://feelandnote.com)', Accept: 'application/json' }
const fetchJson = async <T>(url: string): Promise<T | null> =>
  fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() as T : null).catch(() => null)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface WikiSummary { extract?: string; type?: string; titles?: { normalized?: string }; content_urls?: { desktop?: { page?: string } } }

const MUSIC_WORD_EN = /\b(song|single|album|track|ep\b|composition|aria|symphony|quartet|sonata|concerto|opera|cantata|recording|ballad|anthem|hymn|carol)\b/i
const MUSIC_WORD_KO = /노래|곡|싱글|음반|앨범|가요|가곡|교향곡|협주곡|소나타|사중주|오페라|칸타타|자장가|민요|찬송가/

/** creator 문자열에서 검증용 아티스트 토큰을 뽑는다 — "A·B" / "A, B" / "A (feat. B)" 분할 */
function artistTokens(creator: string): string[] {
  return (creator || '').split(/\(|\[|feat\.?|ft\.?| with |&|·|,|\/|\|/i)
    .map(s => norm(s)).filter(n => n.length >= 2)
}

/** 아티스트 토큰이 본문에 "단어로" 들어있는지 — 짧은 토큰은 부분일치 오탐(mot→promoted)이라 경계 매칭.
 *  한글 토큰은 뒤에 조사가 붙을 수 있어(아이유가) 앞 경계만 검사한다. */
function artistInText(extract: string, artists: string[]): boolean {
  const lx = (extract || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC')
  return artists.some(a => {
    if (a.length >= 5) return lx.includes(a)
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const tail = /[가-힣]$/.test(a) ? '' : '(?=$|[^a-z0-9가-힣])'
    return new RegExp(`(?:^|[^a-z0-9가-힣])${esc}${tail}`).test(lx)
  })
}

async function wikiIntro(title: string, artists: string[], locale: 'ko' | 'en'): Promise<{ text: string; url: string; page: string } | null> {
  const host = `https://${locale}.wikipedia.org`
  const hints = locale === 'ko' ? ['노래', '앨범', '곡', ''] : ['song', 'album', artistHint(artists), '']
  const parts = [title, title.replace(/\s*\([^)]*\)\s*$/, ''), /\(([^)]*)\)/.exec(title)?.[1] ?? '',
    title.replace(/\s*[-–—].*$/, '')] // "X (feat. Y)" / "X - Remix" → 본명
  const wants = new Set(parts.map(norm).filter(s => s.length >= 2))
  const seen = new Set<string>()
  const found: { key: string }[] = []
  for (const hint of hints) {
    const q = hint ? `${title} ${hint}` : title
    const search = await fetchJson<{ pages?: { key: string }[] }>(
      `${host}/w/rest.php/v1/search/page?q=${encodeURIComponent(q)}&limit=6`)
    await sleep(150)
    for (const page of search?.pages ?? []) {
      if (seen.has(page.key)) continue
      seen.add(page.key)
      found.push(page)
    }
  }
  for (const { key } of found
    .map(page => ({ key: page.key, t: norm(page.key.replace(/_\(.*\)$/, '').replace(/_/g, ' ')) }))
    .filter(x => wants.has(x.t))) {
    const summary = await fetchJson<WikiSummary>(`${host}/api/rest_v1/page/summary/${encodeURIComponent(key)}`)
    await sleep(120)
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') continue
    const landed = norm((summary?.titles?.normalized ?? '').replace(/\s*\([^)]*\)\s*$/, ''))
    if (landed && !wants.has(landed)) continue
    if (!(locale === 'ko' ? MUSIC_WORD_KO : MUSIC_WORD_EN).test(extract)) continue
    // 아티스트 정체: extract에 creator 토큰 중 하나라도 있어야 한다(동명 곡 방지)
    if (!artistInText(extract, artists)) continue
    if (!mediaIntroductionText(extract, locale)) continue
    const url = summary?.content_urls?.desktop?.page ?? `${host}/wiki/${key}`
    return { text: extract, url, page: summary?.titles?.normalized ?? key.replace(/_/g, ' ') }
  }
  return null
}

function artistHint(artists: string[]): string {
  return artists[0] ?? ''
}

async function main() {
  const rows: any[] = []
  let from = 0
  for (;;) {
    const { data, error } = await db.from('content_locales')
      .select('content_id, locale, title, creator, publisher, isbn, sources, description, contents!inner(type, external_id, external_source, subtype)')
      .eq('contents.type', 'MUSIC').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  const byC = new Map<string, any[]>()
  for (const r of rows) (byC.get(r.content_id) ?? byC.set(r.content_id, []).get(r.content_id)!).push(r)

  const plan: ReviewedMediaIntroduction[] = []
  const issues: any[] = []
  let done = 0
  for (const [id, rs] of byC) {
    const ko = rs.find(r => r.locale === 'ko'), en = rs.find(r => r.locale === 'en')
    // 로케일별 아티스트 토큰: 해당 행 creator + 형제 행 creator(en 라틴 이름이 ko extract에도 쓰일 수 있으니 양쪽 다)
    const artistByLocale = {
      ko: [...artistTokens(ko?.creator ?? ''), ...artistTokens(en?.creator ?? '')],
      en: [...artistTokens(en?.creator ?? ''), ...artistTokens(ko?.creator ?? '')],
    }
    for (const row of [ko, en]) {
      if (!row || row.description?.trim()) continue
      const locale = row.locale as 'ko' | 'en'
      const artists = artistByLocale[locale]
      if (!artists.length) { issues.push({ id, locale, title: row.title, reason: 'no-artist-token' }); continue }
      const found = await wikiIntro(row.title, artists, locale)
      done++
      if (done % 50 === 0) console.log(JSON.stringify({ progress: done }))
      if (!found) { issues.push({ id, locale, title: row.title }); continue }
      plan.push({
        content: { id, type: 'MUSIC', external_id: row.contents.external_id, external_source: row.contents.external_source },
        target: { content_id: id, locale, title: row.title, creator: row.creator, publisher: row.publisher, isbn: row.isbn, description: row.description, sources: row.sources },
        description: found.text,
        sourceUrl: found.url,
        sourceLocale: locale,
        method: 'provider',
        identityEvidence: [{ url: found.url, note: `wikipedia page "${found.page}" matches "${row.title}" and its lead names artist "${row.creator}"` }],
      })
      console.log(JSON.stringify({ ok: row.title, locale, page: found.page }))
    }
  }

  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 1))
  fs.writeFileSync(path.join(dir, 'issues.json'), JSON.stringify(issues, null, 1))
  console.log(JSON.stringify({ plan: plan.length, issues: issues.length }))
}

main().catch(e => { console.error(e); process.exit(1) })
