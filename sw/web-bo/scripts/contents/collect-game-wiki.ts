/** Collect Wikipedia (ko+en) introductions for GAME rows whose provider (IGDB) has no summary.
 * Identity: normalized page title equals the locale title, and the lead says it is a game.
 * Read-only; writes data/celeb/game-wiki/plan.json for apply-media-introductions.ts.
 * node --env-file=.env --import tsx scripts/contents/collect-game-wiki.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { mediaIntroductionText, type ReviewedMediaIntroduction } from './media-introduction-contract'

const dir = path.resolve('../../data/celeb/game-wiki')
fs.mkdirSync(dir, { recursive: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } })

const norm = (s: string) => (s || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC')
  .replace(/[^a-z0-9가-힣]/g, '')
const UA = { 'User-Agent': 'feelandnote/1.0 (https://feelandnote.com)', Accept: 'application/json' }
const fetchJson = async <T>(url: string): Promise<T | null> =>
  fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() as T : null).catch(() => null)

interface WikiSummary { extract?: string; type?: string; titles?: { normalized?: string }; content_urls?: { desktop?: { page?: string } } }

const GAME_WORD_EN = /\b(video game|board game|card game|role-playing game|mobile game|online game|game)\b/i
const GAME_WORD_KO = /게임/

// 검색으로는 못 찾거나 오탐하는 항목의 수동 문서 지정 — 제목 정규화키 → [로케일, 위키 문서명, 별칭 사유]
// 랜딩 제목이 다르게 검증된 별칭(바람의 지휘봉/콘트랙트 브리지 등)만 넣는다
const OVERRIDE: Record<string, string> = {
  'thelegendofzelda|en': 'The Legend of Zelda (video game)',
  '젤다의전설바람의택트|ko': '젤다의 전설 바람의 지휘봉',
  '스트리트파이터|ko': '스트리트 파이터 (비디오 게임)',
  'pentominoes|en': 'Pentomino',
  '펜토미노|ko': '펜토미노',
  'bridge|en': 'Contract bridge',
  '브리지|ko': '콘트랙트 브리지',
  'superfamista|en': 'Super Batter Up',
  'derbystallion|en': 'Derby Stallion',
  'empire|en': 'Empire: Wargame of the Century',
  'amazons|en': 'Game of the Amazons',
  '커블스페이스프로그램|ko': '커벌 스페이스 프로그램',
  '카탄의개척자들|ko': '카탄의 개척자',
  'settlersofcatan|en': 'Catan',
  '포켓몬고|ko': '포켓몬 GO',
  '스타크래프트2|ko': '스타크래프트 II',
  '던전앤드래건스|ko': '던전 & 드래곤',
  'dungeonsdragons|en': 'Dungeons & Dragons',
  '네오펫츠|ko': '네오펫',
  '마이크로소프트플라이트시뮬레이터|ko': '마이크로소프트 플라이트 시뮬레이터',
}

async function wikiIntro(title: string, locale: 'ko' | 'en', relYear: number | null): Promise<{ text: string; url: string; page: string; manual?: boolean } | null> {
  const host = `https://${locale}.wikipedia.org`
  const hint = locale === 'ko' ? '게임' : 'game'
  const ovKey = OVERRIDE[`${norm(title)}|${locale}`]
  if (ovKey) {
    const summary = await fetchJson<WikiSummary>(`${host}/api/rest_v1/page/summary/${encodeURIComponent(ovKey)}`)
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') return null
    if (!mediaIntroductionText(extract, locale)) return null
    const url = summary?.content_urls?.desktop?.page ?? `${host}/wiki/${ovKey}`
    return { text: extract, url, page: summary?.titles?.normalized ?? ovKey, manual: true }
  }
  const search = await fetchJson<{ pages?: { key: string }[] }>(
    `${host}/w/rest.php/v1/search/page?q=${encodeURIComponent(`${title} ${hint}`)}&limit=8`)
  // 제목에 괄호 설명이 있으면 앞부분·괄호 속도 후보로 둔다 — "Clue (Cluedo)" → Cluedo 문서
  const parts = [title, title.replace(/\s*\([^)]*\)\s*$/, ''), /\(([^)]*)\)/.exec(title)?.[1] ?? '']
  const wants = new Set(parts.map(norm).filter(Boolean))
  const pages = (search?.pages ?? [])
    .filter(page => wants.has(norm(page.key.replace(/_\(.*\)$/, '').replace(/_/g, ' '))))
    .map(page => ({ page, py: /[((\uFF08](\d{4})/.exec(page.key)?.[1] }))
    // 출시연도 구분자가 콘텐츠 연도와 다르면 다른 판본이다(리메이크·리부트) — 탈락
    .filter(x => !(x.py && relYear && +x.py !== relYear))
    // 연도가 일치하는 구분 페이지를 최우선, 무구분 본문서를 다음에 둔다
    .sort((a, b) => (a.py === String(relYear) ? -1 : b.py === String(relYear) ? 1 : a.py ? 1 : b.py ? -1 : 0))
  for (const { page } of pages) {
    const summary = await fetchJson<WikiSummary>(`${host}/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`)
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') continue
    const landed = norm((summary?.titles?.normalized ?? '').replace(/\s*\([^)]*\)\s*$/, ''))
    if (landed && !wants.has(landed)) continue
    if (!(locale === 'ko' ? GAME_WORD_KO : GAME_WORD_EN).test(extract)) continue
    if (!mediaIntroductionText(extract, locale)) continue
    const url = summary?.content_urls?.desktop?.page ?? `${host}/wiki/${page.key}`
    return { text: extract, url, page: summary?.titles?.normalized ?? page.key.replace(/_/g, ' ') }
  }
  return null
}

async function main() {
  const rows: any[] = []
  let from = 0
  for (;;) {
    const { data, error } = await db.from('content_locales')
      .select('content_id, locale, title, creator, publisher, isbn, sources, description, contents!inner(type, external_id, external_source, release_date)')
      .eq('contents.type', 'GAME').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const plan: ReviewedMediaIntroduction[] = []
  const issues: any[] = []
  for (const row of rows.filter(r => !r.description?.trim())) {
    const locale = row.locale as 'ko' | 'en'
    if (!['ko', 'en'].includes(locale)) continue
    const relYear = row.contents.release_date ? new Date(row.contents.release_date).getUTCFullYear() : null
    const found = await wikiIntro(row.title, locale, relYear)
    if (!found) { issues.push({ id: row.content_id, locale, title: row.title }); continue }
    plan.push({
      content: { id: row.content_id, type: 'GAME', external_id: row.contents.external_id, external_source: row.contents.external_source },
      target: { content_id: row.content_id, locale, title: row.title, creator: row.creator, publisher: row.publisher, isbn: row.isbn, description: row.description, sources: row.sources },
      description: found.text,
      sourceUrl: found.url,
      sourceLocale: locale,
      method: 'provider',
      identityEvidence: [{ url: found.url, note: found.manual
      ? `wikipedia page "${found.page}" is a manually verified alias of game "${row.title}" and its lead describes a game`
      : `wikipedia page "${found.page}" matches game "${row.title}" and its lead describes a game` }],
    })
    console.log(JSON.stringify({ ok: row.title, locale, page: found.page }))
  }

  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 1))
  fs.writeFileSync(path.join(dir, 'issues.json'), JSON.stringify(issues, null, 1))
  console.log(JSON.stringify({ plan: plan.length, issues: issues.length }))
}

main().catch(e => { console.error(e); process.exit(1) })
