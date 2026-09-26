/**
 * seed-contents가 만든 베어 contents 행에 현대 판본·외부 레코드를 이어 붙인다
 *
 * celeb-02-02 규칙:
 * - BOOK: 카카오(한국어판) → OpenLibrary(영문 원서)로 판본 실재 확인.
 *   external_id = 대표 판본 ISBN-13 (한국어판 우선). 판본이 없으면
 *   content_locales.sources.primary='none' + sources.title 표식의 표시용 행.
 * - VIDEO: tmdb-{movie|tv}-{id} / GAME: igdb-{id} / MUSIC: itunes-{trackId}
 *
 * 대상: external_id IS NULL 이고 최근 시드가 만든 행(기본 created_at >= 2026-09-16).
 * 기존 값은 절대 덮어쓰지 않는다 — 비어 있는 필드만 채운다.
 *
 *   pnpm exec tsx scripts/celeb/enrich-round3-contents.ts          # dry-run
 *   pnpm exec tsx scripts/celeb/enrich-round3-contents.ts --apply  # 반영
 *   --since YYYY-MM-DD  대상 시작일 조정
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { titleMatches, creatorMatches } from '../curated/lib/match'

// ⚠️ content-search 래퍼들은 모듈 로드 시점에 API 키를 읽는다.
// 정적 import는 env 로딩보다 먼저 평가되므로 env를 먼저 채운 뒤 동적 import한다.
const ROOT = join(__dirname, '../../../..')
for (const p of ['.env', 'sw/web-bo/.env', 'sw/web/.env']) {
  const f = join(ROOT, p)
  if (!existsSync(f)) continue
  for (const raw of readFileSync(f, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
let searchBooks: any, toIsbn13: any, searchVideo: any, searchGames: any, searchMusic: any

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_DB_API_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DB_SECRET_KEY!,
)

const APPLY = process.argv.includes('--apply')
const sinceIdx = process.argv.indexOf('--since')
const SINCE = sinceIdx > -1 ? process.argv[sinceIdx + 1] : '2026-09-16'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Loc = {
  content_id: string
  locale: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  isbn: string | null
  publisher: string | null
  verified: boolean
  sources: Record<string, unknown> | null
}

const UNKNOWN = new Set(['미상', 'unknown', '미상(전승)', '전승', 'anon', 'anonymous'])

// ── BOOK ──────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { last = e; await sleep(1500 * (i + 1)) }
  }
  throw last
}

function pickBook(items: any[], title: string, creator: string | null) {
  const knownCreator = !!creator && !UNKNOWN.has(creator.toLowerCase())
  const okStatus = (st: string) => !st || ['정상판매', '품절', '절판'].includes(st)
  // 1차: 제목+제작자 대조 — 정상판매 우선
  const wantTitle = title.normalize('NFKC')
  const pass1 = items.filter((it) => {
    const creatorOk = knownCreator && creatorMatches(creator, it.creator)
    if (!titleMatches(wantTitle, it.title.normalize('NFKC'), creatorOk)) return false
    if (knownCreator && !creatorOk) return false
    return okStatus(it.metadata.salesStatus)
  })
  const hit = pass1.find((it) => it.metadata.salesStatus === '정상판매') || pass1[0]
  if (hit) return hit
  // 2차: 제작자가 판본 표기(역자·출판사)와 달라 대조 불가한 경우 — 제목 정확일치만(접두 매칭은 해설서 오인 위험)
  const n = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[:：].*$/, ' ').replace(/[^\p{L}\p{N}]/gu, '')
  const exact = items.filter((it) => n(it.title) === n(title) && okStatus(it.metadata.salesStatus))
  return exact.find((it) => it.metadata.salesStatus === '정상판매') || exact[0] || null
}

async function resolveBookKo(title: string, creator: string | null) {
  const knownCreator = !!creator && !UNKNOWN.has(creator.toLowerCase())
  const { items } = await withRetry(() => searchBooks(knownCreator ? `${title} ${creator}` : title))
  const hit = pickBook(items, title, creator)
  if (hit) return hit
  // 제작자 포함 검색에서 정확 제목 판본이 빠지면 제목만으로 재검색
  if (knownCreator) {
    const { items: items2 } = await withRetry(() => searchBooks(title))
    return pickBook(items2, title, creator)
  }
  return null
}

const hasHangul = (s: string | null) => !!s && /[가-힣]/.test(s)

async function resolveBookEn(title: string, creator: string | null) {
  await sleep(1000) // openlibrary 1req/s
  const params = new URLSearchParams({ limit: '8', fields: 'key,title,author_name,isbn,publisher,first_publish_year,cover_i' })
  if (title) params.set('title', title)
  const res = await withRetry(() => fetch(`https://openlibrary.org/search.json?${params}`))
  if (!res.ok) return null
  const { docs } = (await res.json()) as { docs: any[] }
  // 한글 제작자 표기는 OL의 영문 저자명과 대조할 수 없다 — 제목으로만 확인한다
  const checkCreator = creator && !UNKNOWN.has(creator.toLowerCase()) && !hasHangul(creator)
  const wantTitle = title.normalize('NFKC')
  for (const d of docs || []) {
    if (!titleMatches(wantTitle, (d.title || '').normalize('NFKC'), false)) continue
    const authors = (d.author_name || []).join(' ')
    if (checkCreator && !creatorMatches(creator, authors)) continue
    const isbn = (d.isbn || []).find((x: string) => /^\d{13}$/.test(x)) || d.isbn?.[0]
    if (!isbn) continue
    return {
      isbn: toIsbn13(isbn) || isbn,
      publisher: d.publisher?.[0] || null,
      workKey: d.key as string,
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    }
  }
  return null
}

// ── VIDEO / GAME / MUSIC ─────────────────────────────
async function resolveMedia(type: string, title: string, titleEn: string | null, creator: string | null, year: number | null) {
  const q = titleEn || title
  try {
    if (type === 'VIDEO') {
      const { items } = await searchVideo(q)
      for (const it of items) {
        const y = (it.metadata.releaseDate as string || '').slice(0, 4)
        if (!titleMatches(titleEn || title, it.title, false) && !titleMatches(title, it.title, false) && !(it.metadata.originalTitle && titleMatches(titleEn || title, it.metadata.originalTitle as string, false))) continue
        if (year && y && Math.abs(Number(y) - year) > 1) continue
        return { externalId: it.externalId, source: 'tmdb', releaseDate: it.metadata.releaseDate || null, cover: it.coverImageUrl }
      }
    } else if (type === 'GAME') {
      const { items } = await searchGames(q)
      for (const it of items) {
        if (!titleMatches(titleEn || title, it.title, false) && !titleMatches(title, it.title, false)) continue
        const ts = it.metadata.firstReleaseDate as number | undefined
        return { externalId: it.externalId, source: 'igdb', releaseDate: ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null, cover: it.coverImageUrl }
      }
    } else if (type === 'MUSIC') {
      const { items } = await searchMusic(q)
      // 한글 아티스트 표기는 iTunes의 원문 표기와 대조 불가 — 제목으로만 확인
      const checkCreator = creator && !UNKNOWN.has(creator.toLowerCase()) && !hasHangul(creator)
      for (const it of items) {
        if (!titleMatches(titleEn || title, it.title, false) && !titleMatches(title, it.title, false)) continue
        if (checkCreator && !creatorMatches(creator, it.creator)) continue
        return { externalId: it.externalId, source: 'itunes', releaseDate: (it.metadata.releaseDate as string) || null, cover: it.coverImageUrl }
      }
    }
  } catch (e) {
    return { error: String(e) }
  }
  return null
}

// ── 표시용 제목 행 표식 ──────────────────────────────
function displayTitleKind(loc: Loc): 'translated' | 'romanized' | 'original' {
  if (loc.locale === 'en') return 'original'
  // ko 행: 한국어 번역 제목이면 translated, 음차면 romanized
  const t = loc.title || ''
  if (/[가-힣]/.test(t) && t.length <= 4 && !/[\u4e00-\u9fff]/.test(t)) return 'romanized'
  return 'translated'
}

async function main() {
  ;({ searchBooks, toIsbn13 } = await import('@feelandnote/content-search/kakao-books'))
  ;({ searchVideo } = await import('@feelandnote/content-search/tmdb'))
  ;({ searchGames } = await import('@feelandnote/content-search/igdb'))
  ;({ searchMusic } = await import('@feelandnote/content-search/itunes-music'))
  const { data: rows, error } = await db
    .from('contents')
    .select('id,type,subtype,release_date,created_at')
    .is('external_id', null)
    .gte('created_at', SINCE)
    .order('created_at')
  if (error) throw error
  console.log(`베어 행 ${rows?.length ?? 0}개 (>= ${SINCE})`)

  const results: string[] = []
  for (const c of rows ?? []) {
    const { data: locs } = await db.from('content_locales').select('*').eq('content_id', c.id)
    const ko = (locs as Loc[] | null)?.find((l) => l.locale === 'ko')
    const en = (locs as Loc[] | null)?.find((l) => l.locale === 'en')
    const title = ko?.title || en?.title || ''
    const titleEn = en?.title || null
    const creator = ko?.creator || en?.creator || null
    const label = `${c.type} ${ko?.title ?? '?'} / ${en?.title ?? '?'}`

    if (c.type === 'BOOK') {
      let koHit: any = null, enHit: any = null
      try {
        koHit = ko ? await resolveBookKo(ko.title, ko.creator) : null
        enHit = en ? await resolveBookEn(en.title, en.creator) : null
      } catch (e) {
        console.log(`⚠️ ${label} → 조회 실패: ${String(e).slice(0, 120)}`)
        results.push(`조회 실패: ${label}`)
        continue
      }
      if (koHit || enHit) {
        const rep = koHit || enHit!
        const repSource = koHit ? 'kakao_book' : 'openlibrary'
        const isbn = koHit ? toIsbn13(koHit.metadata.isbn) || koHit.metadata.isbn : enHit!.isbn
        const release = koHit ? koHit.metadata.publishDate || null : null
        console.log(`✅ ${label} → ${repSource} ${isbn} | ko:[${koHit ? `${koHit.title} / ${koHit.creator}` : '미확인'}] en:[${enHit ? 'OL일치' : '미확인'}]${koHit?.metadata.salesStatus === '절판' ? ' (절판)' : ''}`)
        if (APPLY) {
          await db.from('contents').update({ external_source: repSource, external_id: isbn, release_date: release || c.release_date }).eq('id', c.id)
          if (ko && koHit) {
            const salesOop = koHit.metadata.salesStatus === '절판' || koHit.metadata.salesStatus === '품절'
            await db.from('content_locales').update({
              isbn: ko.isbn || (toIsbn13(koHit.metadata.isbn) || koHit.metadata.isbn),
              publisher: ko.publisher || koHit.metadata.publisher,
              thumbnail_url: ko.thumbnail_url || koHit.coverImageUrl,
              verified: true,
              sources: { ...(ko.sources || {}), primary: 'kakao_book', title: koHit.metadata.link, creator: koHit.metadata.link, isbn: koHit.metadata.link, ...(salesOop ? { availability: 'out_of_print' } : {}) },
            }).eq('content_id', c.id).eq('locale', 'ko')
          }
          if (en && enHit) {
            await db.from('content_locales').update({
              isbn: en.isbn || enHit.isbn,
              publisher: en.publisher || enHit.publisher,
              thumbnail_url: en.thumbnail_url || enHit.cover,
              verified: true,
              sources: { ...(en.sources || {}), primary: 'openlibrary', thumbnail: 'openlibrary', description: `https://openlibrary.org${enHit.workKey}` },
            }).eq('content_id', c.id).eq('locale', 'en')
          }
          // 확인 못한 쪽 언어는 표시용 표식
          if (ko && !koHit) await markDisplay(c.id, ko)
          if (en && !enHit) await markDisplay(c.id, en)
        }
      } else {
        console.log(`⬜ ${label} → 판본 미확인 (표시용 행)`)
        results.push(`BOOK 미확인: ${label}`)
        if (APPLY) {
          if (ko) await markDisplay(c.id, ko)
          if (en) await markDisplay(c.id, en)
        }
      }
    } else {
      const hit = await resolveMedia(c.type, title, titleEn, creator, c.release_date ? Number(String(c.release_date).slice(0, 4)) : null)
      if (hit && !('error' in hit) && hit.externalId) {
        console.log(`✅ ${label} → ${hit.externalId}`)
        if (APPLY) {
          await db.from('contents').update({ external_source: hit.source, external_id: hit.externalId, release_date: hit.releaseDate || c.release_date }).eq('id', c.id)
          for (const loc of [ko, en].filter(Boolean) as Loc[]) {
            await db.from('content_locales').update({
              thumbnail_url: loc.thumbnail_url || hit.cover,
              verified: true,
              sources: { ...(loc.sources || {}), primary: hit.source },
            }).eq('content_id', c.id).eq('locale', loc.locale)
          }
        }
      } else {
        const msg = hit && 'error' in hit ? `오류: ${hit.error}` : '레코드 미확인'
        console.log(`⬜ ${label} → ${msg}`)
        results.push(`${c.type} 미확인: ${label}${hit && 'error' in hit ? ` (${hit.error})` : ''}`)
        if (APPLY) {
          if (ko) await markDisplay(c.id, ko)
          if (en) await markDisplay(c.id, en)
        }
      }
    }
    await sleep(300)
  }
  if (results.length) console.log('\n미확인 목록:\n' + results.join('\n'))
}

async function markDisplay(contentId: string, loc: Loc) {
  if (loc.sources?.primary && loc.sources.primary !== 'none') return
  await db.from('content_locales').update({
    verified: false,
    sources: { ...(loc.sources || {}), primary: 'none', title: (loc.sources?.title as string) || displayTitleKind(loc) },
  }).eq('content_id', contentId).eq('locale', loc.locale)
}

main().catch((e) => { console.error(e); process.exit(1) })
