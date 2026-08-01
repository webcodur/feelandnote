/**
 * 기관 선정 목록에서 아직 우리에게 없는 책을 등록한다
 *
 * curated_list_items 중 content_id가 비어 있는 항목을 네이버 책·Open Library에서 찾아
 * contents + content_locales로 등록하고 목록 항목에 이어 붙인다.
 * 한국어 번역본이 있으면 그쪽을 우선한다 — 한국 독자에게 보일 표지와 제목이기 때문이다.
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/register-curated-books.ts --dry              # 무엇이 등록될지 보기만
 *   npx tsx scripts/register-curated-books.ts --limit 30         # 30건만
 *   npx tsx scripts/register-curated-books.ts --list <slug>      # 특정 목록만
 *   npx tsx scripts/register-curated-books.ts                    # 전량
 *
 * ⚠️ packages/content-search를 쓰지 않고 API를 직접 부른다 — 그 패키지가 편집 중이라
 *    미완성 상태에 이 작업이 발목 잡히지 않게 하기 위함이다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(p: string) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ────────────────────────────────────────────────────
// #region 대조 규칙 — match-curated-items.ts와 같은 기준을 쓴다
function normTitle(s: string): string {
  let t = s.normalize('NFKC').toLowerCase()
  t = t.replace(/<[^>]*>/g, ' ') // 네이버 응답의 <b> 강조 태그
  t = t.replace(/[「」『』《》〈〉<>"'"'']/g, ' ')
  t = t.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
  t = t.split(/[:：]/)[0]
  t = t.replace(/^(the|a|an)\s+/i, '')
  t = t.replace(/&/g, 'and')
  t = t.replace(/[^\p{L}\p{N}]+/gu, '')
  return t
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0 || n === 0) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

function titleClose(a: string, b: string): boolean {
  const x = normTitle(a)
  const y = normTitle(b)
  if (!x || !y) return false
  if (x === y) return true
  // 부제가 붙거나 떨어진 경우까지 인정하되, 한쪽이 다른 쪽에 온전히 들어 있을 때만
  if (x.length >= 6 && y.length >= 6 && (x.startsWith(y) || y.startsWith(x))) return true
  const len = Math.max(x.length, y.length)
  return len >= 6 && 1 - editDistance(x, y) / len >= 0.9
}

function authorKeys(s: string | null | undefined): string[] {
  if (!s) return []
  const base = s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/;.*$/, '')
    .replace(/\b(translated|edited|trans\.|ed\.)\b.*$/i, '')
    .replace(/\s*(지음|옮김|저|역|편|글|엮음)\s*/g, ' ')
  const parts = base
    .split(/[,&/·^|]|\band\b/)
    .map((p) => p.trim())
    .filter(Boolean)
  const keys = new Set<string>()
  for (const p of parts) {
    const clean = p.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
    if (!clean) continue
    keys.add(clean.replace(/\s+/g, ''))
    const words = clean.split(/\s+/).filter((w) => w.length > 1)
    if (words.length > 1) keys.add(words[words.length - 1])
  }
  const out = [...keys].filter((k) => k.length >= 2)
  return out.length > 0 ? out : [...keys]
}

function authorClose(a: string | null, b: string | null): boolean {
  const x = authorKeys(a)
  const y = authorKeys(b)
  if (x.length === 0 || y.length === 0) return false
  return x.some((p) =>
    y.some((q) => {
      if (p === q) return true
      if (p.length >= 4 && (q.includes(p) || p.includes(q))) return true
      const len = Math.max(p.length, q.length)
      return len >= 4 && 1 - editDistance(p, q) / len >= 0.8
    })
  )
}
// #endregion

// ────────────────────────────────────────────────────
// #region 외부 검색
interface Found {
  source: 'kakao_book' | 'openlibrary' | 'tmdb'
  locale: 'ko' | 'en'
  title: string
  /** 영상의 원제 — 한국어 제목과 함께 양쪽 언어에 담기 위해 보관한다 */
  originalTitle?: string | null
  creator: string | null
  thumbnail: string | null
  description: string | null
  publisher: string | null
  isbn: string | null
  releaseDate: string | null
  tmdbId?: number
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()

/**
 * 카카오가 돌려주는 표지 주소는 두 형태가 섞여 있다.
 * 하나는 원본(456×687 등)이고, 하나는 `search1.kakaocdn.net/thumb/R120x174...` 로
 * **120픽셀까지 줄여놓은 썸네일**이다. 후자를 그대로 쓰면 목록 화면에서 흐릿하게 늘어난다.
 * 다행히 줄인 주소 안에 원본 주소가 `fname`으로 들어 있으므로 꺼내 쓴다.
 */
function fullSizeCover(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/[?&]fname=([^&]+)/)
  if (!m) return url
  try {
    return decodeURIComponent(m[1]).replace(/^http:\/\//, 'https://')
  } catch {
    return url
  }
}

/**
 * 카카오 책 검색.
 *
 * 🔴 네이버 책 검색 API는 종료됐다 — 호출하면 404 `SE05 존재하지 않는 검색 api`가 온다(26.08.01 실측).
 *    한국어 책 메타의 창구는 카카오다.
 */
async function searchKakao(query: string): Promise<Found[]> {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('.env에 KAKAO_REST_API_KEY 없음')

  const url = `https://dapi.kakao.com/v3/search/book?size=10&query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) {
    if (res.status === 429) await sleep(2000)
    return []
  }
  const data = (await res.json()) as {
    documents?: {
      title?: string
      authors?: string[]
      translators?: string[]
      publisher?: string
      thumbnail?: string
      contents?: string
      isbn?: string
      datetime?: string
    }[]
  }
  return (data.documents ?? []).map((b) => ({
    source: 'kakao_book' as const,
    locale: 'ko' as const,
    title: stripTags(b.title ?? ''),
    creator: (b.authors ?? []).join(', ') || null,
    thumbnail: fullSizeCover(b.thumbnail),
    description: stripTags(b.contents ?? '') || null,
    publisher: b.publisher || null,
    // isbn 필드는 "10자리 13자리"가 공백으로 붙어 온다. 13자리를 정본으로 쓴다
    isbn: (b.isbn ?? '').split(' ').filter(Boolean).pop() || null,
    releaseDate: b.datetime ? b.datetime.slice(0, 10) : null,
  }))
}

async function searchOpenLibrary(title: string, author: string | null): Promise<Found[]> {
  const params = new URLSearchParams({ title, limit: '10' })
  if (author) params.set('author', author)
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { 'User-Agent': 'feelandnote/1.0 (curated list import)' },
  })
  if (!res.ok) return []
  const data = (await res.json()) as {
    docs?: { title?: string; author_name?: string[]; cover_i?: number; isbn?: string[]; first_publish_year?: number; publisher?: string[] }[]
  }
  return (data.docs ?? []).map((d) => ({
    source: 'openlibrary' as const,
    locale: 'en' as const,
    title: d.title ?? '',
    creator: d.author_name?.[0] ?? null,
    thumbnail: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    description: null,
    publisher: d.publisher?.[0] ?? null,
    isbn: d.isbn?.[0] ?? null,
    releaseDate: d.first_publish_year ? `${d.first_publish_year}` : null,
  }))
}

/**
 * TMDB 영화 검색.
 *
 * 개봉 연도가 목록에 있으므로 제목 + 연도(±1년)로 좁힌다.
 * 같은 제목의 리메이크가 흔해서 연도 대조가 감독 대조보다 확실하다.
 */
async function searchTmdbMovie(title: string, year: number | null): Promise<Found[]> {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('.env에 TMDB_API_KEY 없음')

  // 🔴 영문으로 검색한다. ko-KR로 부르면 제목이 한국어로만 오고(『My Neighbour Totoro』→「이웃집 토토로」)
  //    원제는 현지어(「となりのトトロ」)라, 영문 목록과 대조할 문자열이 응답 어디에도 없다.
  //    한국어 제목·포스터는 대상을 확정한 뒤 상세 조회로 따로 받는다.
  const params = new URLSearchParams({ api_key: key, query: title, language: 'en-US' })
  if (year) params.set('year', String(year))
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`)
  if (!res.ok) {
    if (res.status === 429) await sleep(2000)
    return []
  }
  const data = (await res.json()) as {
    results?: { id: number; title?: string; original_title?: string; overview?: string; poster_path?: string | null; release_date?: string }[]
  }
  return (data.results ?? []).slice(0, 8).map((m) => ({
    source: 'tmdb' as const,
    locale: 'ko' as const,
    title: m.title || m.original_title || '',
    originalTitle: m.original_title ?? null,
    creator: null, // 감독은 상세 조회에서 채운다
    thumbnail: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    description: m.overview || null,
    publisher: null,
    isbn: null,
    releaseDate: m.release_date || null,
    tmdbId: m.id,
  }))
}

async function tmdbDirector(id: number): Promise<string | null> {
  const key = process.env.TMDB_API_KEY
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${key}&language=en-US`)
  if (!res.ok) return null
  const data = (await res.json()) as { crew?: { job?: string; name?: string }[] }
  return (data.crew ?? []).find((c) => c.job === 'Director')?.name ?? null
}

/** 확정한 작품의 한국어 제목·포스터를 받아 채운다 */
async function fillKorean(found: Found): Promise<Found> {
  if (!found.tmdbId) return found
  const key = process.env.TMDB_API_KEY
  const res = await fetch(`https://api.themoviedb.org/3/movie/${found.tmdbId}?api_key=${key}&language=ko-KR`)
  if (!res.ok) return found
  const d = (await res.json()) as {
    title?: string
    overview?: string
    poster_path?: string | null
    release_date?: string
  }
  return {
    ...found,
    // 영문 제목은 원제 자리로 옮기고 한국어 제목을 앞세운다
    originalTitle: found.title,
    title: d.title || found.title,
    description: d.overview || found.description,
    thumbnail: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : found.thumbnail,
    releaseDate: d.release_date || found.releaseDate,
  }
}

/**
 * 제목으로 못 가른 후보를 감독으로 확정한다.
 *
 * 『Sunset Blvd.』↔『Sunset Boulevard』처럼 표기가 크게 갈리면 제목 대조가 듣지 않는다.
 * 감독명은 양쪽 다 로마자라 정확히 맞출 수 있어, 제목이 어긋나도 감독이 같으면 같은 작품이다.
 * 제목만 비슷하면 채택하는 방식(『Close-up』이 다른 감독의 동명작에 붙던 사고)의 대안이다.
 */
async function pickByDirector(cands: Found[], rawCreator: string | null): Promise<Found | null> {
  if (!rawCreator) return null
  for (const c of cands.slice(0, 5)) {
    if (!c.tmdbId) continue
    const director = await tmdbDirector(c.tmdbId)
    await sleep(100)
    if (director && authorClose(rawCreator, director)) return { ...c, creator: director }
  }
  return null
}

/**
 * 영상은 제목뿐 아니라 개봉 연도까지 맞아야 채택한다.
 *
 * `loose`는 2차 시도용이다. 영화 제목은 표기가 흔들린다 —
 * 『Sunset Blvd.』↔『Sunset Boulevard』, 『My Neighbour/Neighbor Totoro』,
 * 『Fear Eats the Soul』↔『Ali: Fear Eats the Soul』처럼 줄임·철자·머리말이 갈린다.
 * 대신 연도 대조가 오연결을 막아주므로 제목 쪽만 느슨하게 푼다.
 */
function bestVideo(cands: Found[], rawTitle: string, year: number | null, loose = false): Found | null {
  const hit = (a: string, b: string | null | undefined) => {
    if (!b) return false
    if (titleClose(a, b)) return true
    if (!loose) return false
    const x = normTitle(a)
    const y = normTitle(b)
    return x.length >= 8 && y.length >= 8 && (x.includes(y) || y.includes(x))
  }

  const titleOk = cands.filter((c) => hit(rawTitle, c.title) || hit(rawTitle, c.originalTitle))
  if (titleOk.length === 0) return null
  if (!year) return titleOk.find((c) => c.thumbnail) ?? titleOk[0]

  const tolerance = loose ? 3 : 1
  const yearOk = titleOk.filter((c) => {
    const y = c.releaseDate ? Number(c.releaseDate.slice(0, 4)) : null
    return y != null && Math.abs(y - year) <= tolerance
  })
  if (yearOk.length === 0) return null
  return yearOk.find((c) => c.thumbnail) ?? yearOk[0]
}

/**
 * 검색어에 넣을 저자명을 다듬는다.
 * 괄호 안 본명·필명(『Émile Ajar (Romain Gary)』)이나 악센트(Éric)가 그대로 들어가면
 * 검색처가 한 건도 돌려주지 않는다. 첫 저자만 남기고 악센트를 풀어 쓴다.
 */
function queryAuthor(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;&]|\band\b/)[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 이름이 어느 문자로 적혔는지 — 체계가 다르면 글자 대조로는 같은 사람인지 알 수 없다 */
function scriptOf(s: string): 'ko' | 'ja' | 'cjk' | 'latin' | 'other' {
  if (/[가-힣]/.test(s)) return 'ko'
  if (/[ぁ-んァ-ヶ]/.test(s)) return 'ja'
  if (/[一-鿿]/.test(s)) return 'cjk'
  if (/[A-Za-z]/.test(s)) return 'latin'
  return 'other'
}

/**
 * @param authorInQuery 저자까지 넣어 검색한 결과인가.
 *   그렇다면 검색처가 이미 저자로 걸러준 셈이라, 이름 표기가 서로 다른 문자여서
 *   글자 대조가 불가능한 경우에 한해 제목 완전일치만으로 채택한다.
 */
function bestOf(cands: Found[], rawTitle: string, rawCreator: string | null, authorInQuery = false): Found | null {
  const titleOk = cands.filter((c) => c.title && titleClose(rawTitle, c.title))
  if (titleOk.length === 0) return null
  if (!rawCreator) {
    // 저자가 없는 항목은 표지가 있는 쪽을 고른다 — 목록 화면이 표지로 읽히기 때문이다
    return titleOk.find((c) => c.thumbnail) ?? titleOk[0]
  }

  const both = titleOk.filter((c) => authorClose(rawCreator, c.creator))
  if (both.length > 0) return both.find((c) => c.thumbnail) ?? both[0]

  // 저자 이름이 서로 다른 문자로 적혀 있으면(「Marguerite Duras」 ↔ 「마르그리트 뒤라스」)
  // 글자 대조로는 같은 사람인지 알 수 없다. 검색처가 저자로 걸러준 경우에만 제목 완전일치에 기댄다.
  // ⚠️ 저자 없이 제목만으로 검색한 결과에 이 규칙을 쓰면 엉뚱한 책이 붙는다
  //    (『One-Way』가 같은 제목의 영어교재에 붙은 사례, 26.08.01).
  if (!authorInQuery) return null
  const crossScript = titleOk.filter(
    (c) => c.creator && scriptOf(rawCreator) !== scriptOf(c.creator) && normTitle(rawTitle) === normTitle(c.title)
  )
  return crossScript.find((c) => c.thumbnail) ?? crossScript[0] ?? null
}
// #endregion

interface ItemRow {
  id: string
  list_id: string
  raw_title: string
  raw_creator: string | null
  year: number | null
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity
  const listIdx = args.indexOf('--list')
  const onlyList = listIdx >= 0 ? args[listIdx + 1] : null

  loadEnv(resolve(__dirname, '..', '.env'))
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string, string>
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('.env 누락')
  const sb: SupabaseClient = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 대상: 도서·영상 목록의 미연결 항목
  let lq = sb.from('curated_lists').select('id, slug, title, content_type').in('content_type', ['BOOK', 'VIDEO'])
  if (onlyList) lq = lq.eq('slug', onlyList)
  const { data: lists, error: lErr } = await lq
  if (lErr) throw new Error(`목록 조회 실패: ${lErr.message}`)
  const listById = new Map(
    (lists ?? []).map((l) => [l.id as string, l as { id: string; slug: string; title: string; content_type: string }])
  )

  const { data: items, error: iErr } = await sb
    .from('curated_list_items')
    .select('id, list_id, raw_title, raw_creator, year')
    .is('content_id', null)
    .in('list_id', [...listById.keys()])
    .order('id', { ascending: true })
  if (iErr) throw new Error(`항목 조회 실패: ${iErr.message}`)

  const targets = (items ?? []).slice(0, limit === Infinity ? undefined : limit) as ItemRow[]
  console.log(`${dry ? '[점검만]' : '[등록]'} 미연결 항목 ${targets.length}건\n`)

  let linkedExisting = 0
  let created = 0
  let notFound = 0
  const failures: { list: string; title: string; creator: string | null }[] = []

  for (const [idx, it] of targets.entries()) {
    const listSlug = listById.get(it.list_id)?.slug ?? '?'
    const label = `${it.raw_title}${it.raw_creator ? ` / ${it.raw_creator}` : ''}`

    const isVideo = listById.get(it.list_id)?.content_type === 'VIDEO'
    // 한글 제목은 국내 서적 창구에서만 찾는다.
    // Open Library에 던지면 한국 고전이 로마자 표기(『춘향전』→"In-jun Paek")로 잡혀 엉뚱한 책이 붙는다.
    const isKorean = /[가-힣]/.test(it.raw_title)
    let found: Found | null = null

    if (isVideo) {
      const cands = await searchTmdbMovie(it.raw_title, it.year)
      await sleep(120)
      found = bestVideo(cands, it.raw_title, it.year)

      if (!found) {
        // 연도 힌트를 빼고 다시 — 목록의 연도 기준이 개봉과 어긋나는 경우가 있다
        const wide = await searchTmdbMovie(it.raw_title, null)
        await sleep(120)
        found = bestVideo(wide, it.raw_title, it.year)
        // 그래도 못 가르면 감독으로 확정한다. 제목 표기가 갈리는 고전 영화의 마지막 관문이다
        if (!found) found = await pickByDirector(wide.length ? wide : cands, it.raw_creator)
      }

      if (found) {
        if (!found.creator && found.tmdbId) {
          found = { ...found, creator: await tmdbDirector(found.tmdbId) }
          await sleep(100)
        }
        found = await fillKorean(found)
        await sleep(120)
      }
    } else if (isKorean) {
      found = bestOf(
        await searchKakao(it.raw_creator ? `${it.raw_title} ${it.raw_creator}` : it.raw_title),
        it.raw_title,
        it.raw_creator,
        !!it.raw_creator
      )
      await sleep(120)
      if (!found) {
        found = bestOf(await searchKakao(it.raw_title), it.raw_title, it.raw_creator)
        await sleep(120)
      }
    } else {
      // 원서를 먼저 본다. 저자 표기가 로마자 그대로라 오연결 위험이 가장 낮다
      found = bestOf(await searchOpenLibrary(it.raw_title, it.raw_creator), it.raw_title, it.raw_creator)
      await sleep(200)
      if (!found && it.raw_creator) {
        // 국내 출간본을 저자까지 넣어 찾는다 — 검색처가 저자로 걸러주므로
        // 「Marguerite Duras」↔「마르그리트 뒤라스」처럼 표기가 갈려도 이을 수 있다
        found = bestOf(await searchKakao(`${it.raw_title} ${queryAuthor(it.raw_creator)}`), it.raw_title, it.raw_creator, true)
        await sleep(120)
      }
      if (!found) {
        // 마지막으로 제목만. 이 결과에는 표기가 갈린 저자를 인정하지 않는다
        found = bestOf(await searchKakao(it.raw_title), it.raw_title, it.raw_creator)
        await sleep(120)
      }
    }

    if (!found) {
      notFound++
      failures.push({ list: listSlug, title: it.raw_title, creator: it.raw_creator })
      console.log(`  ✗ ${label}`)
      continue
    }

    console.log(`  ✓ ${label}  →  ${found.title}${found.creator ? ` / ${found.creator}` : ''} [${found.source}]`)
    if (dry) continue

    // 3) 이미 있는 작품인지 확인 — 같은 작품을 두 벌 만들지 않는다
    const externalId = isVideo ? (found.tmdbId ? `tmdb-movie-${found.tmdbId}` : null) : found.isbn
    let contentId: string | null = null
    if (externalId) {
      const { data: existing } = await sb.from('contents').select('id').eq('external_id', externalId).limit(1)
      if (existing?.length) contentId = existing[0].id as string
    }

    if (contentId) {
      linkedExisting++
    } else {
      const { data: ins, error: cErr } = await sb
        .from('contents')
        .insert({
          type: isVideo ? 'VIDEO' : 'BOOK',
          subtype: isVideo ? 'movie' : null,
          external_source: found.source,
          external_id: externalId,
          release_date: found.releaseDate,
        })
        .select('id')
        .single()
      if (cErr) throw new Error(`콘텐츠 등록 실패(${label}): ${cErr.message}`)
      contentId = ins.id as string

      const sources = { primary: found.source, note: 'curated-list import' }
      const rows: Record<string, unknown>[] = [
        {
          content_id: contentId,
          locale: found.locale,
          title: found.title,
          creator: found.creator,
          thumbnail_url: found.thumbnail,
          description: found.description,
          publisher: found.publisher,
          isbn: found.isbn,
          verified: true,
          sources,
        },
      ]
      // 영상은 한국어 제목과 원제가 따로 있다. 양쪽 언어를 함께 채워 영문 화면에서도 제대로 뜨게 한다
      if (isVideo && found.originalTitle && found.originalTitle !== found.title) {
        rows.push({
          content_id: contentId,
          locale: 'en',
          title: found.originalTitle,
          creator: found.creator,
          thumbnail_url: found.thumbnail,
          verified: true,
          sources,
        })
      }

      const { error: locErr } = await sb.from('content_locales').insert(rows)
      if (locErr) throw new Error(`콘텐츠 언어정보 등록 실패(${label}): ${locErr.message}`)
      created++
    }

    const { error: uErr } = await sb.from('curated_list_items').update({ content_id: contentId }).eq('id', it.id)
    if (uErr) throw new Error(`연결 실패(${label}): ${uErr.message}`)

    if ((idx + 1) % 25 === 0) console.log(`  ... ${idx + 1}/${targets.length}`)
  }

  console.log(
    `\n완료 — 새로 등록 ${created} / 기존 책에 연결 ${linkedExisting} / 못 찾음 ${notFound}`
  )

  const reportPath = resolve(__dirname, '..', '..', '..', 'docs', 'curated-lists', '_register-report.json')
  writeFileSync(reportPath, JSON.stringify({ created, linkedExisting, notFound, failures }, null, 2), 'utf-8')
  console.log(`못 찾은 항목 명단: ${reportPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
