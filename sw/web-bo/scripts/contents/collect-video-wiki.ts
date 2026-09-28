/** Collect Wikipedia (ko+en) introductions for VIDEO rows whose provider (TMDB) has no overview.
 * Identity: normalized page title equals the locale title, the lead describes a film/TV work,
 * and a year disambiguator must equal the content release year when both exist.
 * Read-only; writes data/celeb/video-wiki/plan.json for apply-media-introductions.ts.
 * node --env-file=.env --import tsx scripts/contents/collect-video-wiki.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { mediaIntroductionText, type ReviewedMediaIntroduction } from './media-introduction-contract'

const dir = path.resolve('../../data/celeb/video-wiki')
fs.mkdirSync(dir, { recursive: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } })

const norm = (s: string) => (s || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC')
  .replace(/[^a-z0-9가-힣]/g, '')
const UA = { 'User-Agent': 'feelandnote/1.0 (https://feelandnote.com)', Accept: 'application/json' }
const fetchJson = async <T>(url: string): Promise<T | null> =>
  fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() as T : null).catch(() => null)

interface WikiSummary { extract?: string; type?: string; titles?: { normalized?: string }; content_urls?: { desktop?: { page?: string } } }

const VIDEO_WORD_EN = /\b(film|movie|documentary|television|tv series|series|serial|miniseries|animated|opera|show|talk|video|drama|play|tragedy|musical)\b/i
const VIDEO_WORD_KO = /영화|드라마|다큐멘터리|애니메이션|시리즈|오페라|프로그램|연극|희곡|희극|강연|비디오|쇼|연설/

// 검색으로는 못 찾거나 오탐하는 항목의 수동 문서 지정 — content_id|로케일 → 위키 문서명
// 랜딩 제목이 다르게 검증된 별칭만 넣는다
const OVERRIDE: Record<string, string> = {
  'f404cba2-845b-487c-a9f1-0332f75bdaaf|en': 'Star Trek: The Original Series',
  'f404cba2-845b-487c-a9f1-0332f75bdaaf|ko': '스타 트렉 (드라마)',
  '84e31dd5-ae2f-4b8f-843d-387dda2ee9e8|en': 'ALF (TV series)',
  '84e31dd5-ae2f-4b8f-843d-387dda2ee9e8|ko': '외계인 알프',
  'eeeccf44-20a2-4548-8623-87a5f69e5444|ko': '형사 콜롬보',
  'd1db319b-d308-431f-88f4-e88dad516bad|en': 'Wallenstein (trilogy of plays)',
  '0ec94ecf-9dd0-4bb2-b2f7-ad10374d1264|ko': '삼체 (드라마)',
  'bddb7d4a-aac6-48c8-b9e1-a8a0f7556387|ko': '타우리스의 이피게네이아',
  '645db02c-23b2-4a83-b907-6c0972bc66e7|ko': '플래쉬 고든 (영화)',
  'ef52a770-2a52-4186-9338-0551b1aeab4a|en': 'Amar Deep (1979 film)',
  '527217c1-7273-4890-8e21-9231d91f59fd|en': 'Naani',
  '94001752-9c8c-4a30-b046-9bbf43087d85|en': 'Super Bowl LVII halftime show',
    '36387ff8-adc5-4a1f-97a0-74838fc1b3d6|en': 'Purab Aur Paschim',
  'a8f53eeb-a8fb-4ec2-b469-40153df3f8cc|en': 'Apoorva Sagodharargal (1989 film)',
  '85e4bef9-421f-4c98-9ab0-6e48ce35f3e1|en': 'Awaara',
  '16ffdd3d-566d-4f63-87ec-e91864d2bdcf|en': 'War and Remembrance (miniseries)',
  'fb508f35-89e1-4ba1-848f-2afe35e7edc1|en': 'Jem (TV series)',
  '96df2246-3657-4be7-be14-49f90b49082e|en': 'Naan Sigappu Manithan (1985 film)',
  'ac495bc6-a9e9-4d97-b0d2-32b0c26e2c8d|en': 'Waqt: The Race Against Time',
  '51795e9a-0ce4-47a9-b675-596acc5cfa0b|en': 'Casper the Friendly Ghost',
  '135b6503-f405-4917-b6d3-2d0586e3e563|en': 'Love & Basketball',
}
// 동명 타작으로 수집되면 안 되는 행 — 명시적 제외
const DROP = new Set<string>([
  'abad5612-5c04-4f8c-874a-7d37063ae5a4|en', // Border → 보몽피디아 Bhojpuri 영화는 tmdb-581953(BORDER 贖罪, 일본)과 다른 작품
])

async function wikiIntro(id: string, title: string, locale: 'ko' | 'en', relYear: number | null): Promise<{ text: string; url: string; page: string; manual?: boolean } | null> {
  const host = `https://${locale}.wikipedia.org`
  const ovKey = OVERRIDE[`${id}|${locale}`]
  if (ovKey) {
    const summary = await fetchJson<WikiSummary>(`${host}/api/rest_v1/page/summary/${encodeURIComponent(ovKey)}`)
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') return null
    if (!mediaIntroductionText(extract, locale)) return null
    const url = summary?.content_urls?.desktop?.page ?? `${host}/wiki/${ovKey}`
    return { text: extract, url, page: summary?.titles?.normalized ?? ovKey, manual: true }
  }
  const hints = locale === 'ko' ? ['영화', '드라마', ''] : ['film', 'television', '']
  // 제목에 괄호 설명이 있으면 앞부분·괄호 속도 후보로 둔다 — "Clue (Cluedo)" → Cluedo 문서
  const parts = [title, title.replace(/\s*\([^)]*\)\s*$/, ''), /\(([^)]*)\)/.exec(title)?.[1] ?? '']
  const wants = new Set(parts.map(norm).filter(Boolean))
  const seen = new Set<string>()
  const found: { key: string }[] = []
  for (const hint of hints) {
    const search = await fetchJson<{ pages?: { key: string }[] }>(
      `${host}/w/rest.php/v1/search/page?q=${encodeURIComponent(hint ? `${title} ${hint}` : title)}&limit=8`)
    for (const page of search?.pages ?? []) {
      if (seen.has(page.key)) continue
      seen.add(page.key)
      found.push(page)
    }
  }
  const pages = found
    .filter(page => wants.has(norm(page.key.replace(/_\(.*\)$/, '').replace(/_/g, ' '))))
    .map(page => ({ page, py: /[((\uFF08](\d{4})/.exec(page.key)?.[1] }))
    // 출시연도 구분자가 콘텐츠 연도와 다르면 다른 판본이다(리메이크·동명작) — 탈락
    // 콘텐츠 연도가 없는데 연도 구분 문서뿐이면 어느 판본인지 검증할 수 없다 — 탈락
    .filter(x => !(x.py && (!relYear || Math.abs(+x.py - relYear) > 1)))
    // 연도가 일치하는 구분 페이지를 최우선, 무구분 본문서를 다음에 둔다
    .sort((a, b) => (a.py === String(relYear) ? -1 : b.py === String(relYear) ? 1 : a.py ? 1 : b.py ? -1 : 0))
  for (const { page, py } of pages) {
    const summary = await fetchJson<WikiSummary>(`${host}/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`)
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') continue
    const landed = norm((summary?.titles?.normalized ?? '').replace(/\s*\([^)]*\)\s*$/, ''))
    if (landed && !wants.has(landed)) continue
    if (!(locale === 'ko' ? VIDEO_WORD_KO : VIDEO_WORD_EN).test(extract)) continue
    // 무구분 구분자(〈영화〉 등)는 문서명에 연도가 없어 구분자 검사를 못 한다 — 리드의 첫 연도로 판본을 한 번 더 검증한다
    const ey = /(?:19|20)\d{2}/.exec(extract)?.[0]
    if (relYear && !py && ey && Math.abs(+ey - relYear) > 1) continue
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
      .eq('contents.type', 'VIDEO').range(from, from + 999)
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
    const found = DROP.has(`${row.content_id}|${locale}`) ? null : await wikiIntro(row.content_id, row.title, locale, relYear)
    if (!found) { issues.push({ id: row.content_id, locale, title: row.title }); continue }
    plan.push({
      content: { id: row.content_id, type: 'VIDEO', external_id: row.contents.external_id, external_source: row.contents.external_source },
      target: { content_id: row.content_id, locale, title: row.title, creator: row.creator, publisher: row.publisher, isbn: row.isbn, description: row.description, sources: row.sources },
      description: found.text,
      sourceUrl: found.url,
      sourceLocale: locale,
      method: 'provider',
      identityEvidence: [{ url: found.url, note: found.manual
        ? `wikipedia page "${found.page}" is a manually verified alias of video "${row.title}" and its lead describes a video work`
        : `wikipedia page "${found.page}" matches video "${row.title}" and its lead describes a video work` }],
    })
    console.log(JSON.stringify({ ok: row.title, locale, page: found.page }))
  }

  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 1))
  fs.writeFileSync(path.join(dir, 'issues.json'), JSON.stringify(issues, null, 1))
  console.log(JSON.stringify({ plan: plan.length, issues: issues.length }))
}

main().catch(e => { console.error(e); process.exit(1) })
