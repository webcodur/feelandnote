/**
 * BOOK en 데이터 재검증 파이프라인
 *
 * 1. OL 검증 (title+author → 매칭 확인 + ISBN 확보)
 * 2. BookCover 썸네일 (기존 양호 시 스킵)
 * 3. DB 업데이트 (verified=true, sources 갱신)
 * 4. OL 미매칭/한글 텍스트 → needs-review.json 출력
 *
 * 사용법:
 *   node scripts/en-book-verify.mjs                    # 전체 실행
 *   node scripts/en-book-verify.mjs --offset 100       # 100번째부터
 *   node scripts/en-book-verify.mjs --limit 50         # 50건만
 *   node scripts/en-book-verify.mjs --dry-run          # DB 미수정
 *   node scripts/en-book-verify.mjs --skip-thumb       # 썸네일 스킵
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { writeFileSync, existsSync, readFileSync } from 'fs'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_THUMB = args.includes('--skip-thumb')
const OFFSET = parseInt(args[args.indexOf('--offset') + 1]) || 0
const LIMIT = parseInt(args[args.indexOf('--limit') + 1]) || 99999

const REVIEW_FILE = resolve('scripts/needs-review.json')
const LOG_FILE = resolve('scripts/en-book-verify.log')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function hasKorean(str) {
  return str && /[\uAC00-\uD7AF\u3131-\u3163\u1100-\u11FF]/.test(str)
}

function hasCJK(str) {
  return str && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(str)
}

function hasNonLatin(str) {
  return hasKorean(str) || hasCJK(str)
}

// 부제 제거: "Title: Subtitle" → "Title"
function mainTitle(title) {
  if (!title) return title
  const sep = title.indexOf(':')
  if (sep > 3) return title.slice(0, sep).trim()
  const dash = title.indexOf(' - ')
  if (dash > 3) return title.slice(0, dash).trim()
  return title
}

function authorMatch(a, b) {
  if (!a || !b) return false
  const norm = s => s.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const na = norm(a), nb = norm(b)
  if (na === nb) return true
  const lastA = na.split(/\s+/).pop()
  const lastB = nb.split(/\s+/).pop()
  if (lastA && lastB && lastA.length > 2 && lastA === lastB) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

// ── Open Library 검색 ──

async function searchOL(title, author, retries = 2) {
  const params = new URLSearchParams({
    title,
    fields: 'title,author_name,isbn,cover_i,first_publish_year',
    limit: '5',
  })
  if (author) params.set('author', author)

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://openlibrary.org/search.json?${params}`)
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      const data = await res.json()
      if (!data.docs?.length) return null

      const titleLower = title.toLowerCase().trim()

      // 제목+저자 정확 일치
      for (const doc of data.docs) {
        if (doc.title?.toLowerCase().trim() === titleLower &&
            doc.author_name?.some(a => authorMatch(a, author))) {
          return parseOLDoc(doc)
        }
      }

      // 제목만 일치
      for (const doc of data.docs) {
        if (doc.title?.toLowerCase().trim() === titleLower) {
          return parseOLDoc(doc)
        }
      }

      // 첫 결과
      return parseOLDoc(data.docs[0])
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return null
}

function parseOLDoc(doc) {
  let isbn = null
  if (doc.isbn?.length) {
    isbn = doc.isbn.find(i => i.length === 13) || doc.isbn.find(i => i.length === 10) || null
  }
  return {
    title: doc.title,
    author: doc.author_name?.[0] || null,
    allAuthors: doc.author_name || [],
    isbn,
    coverId: doc.cover_i || null,
    year: doc.first_publish_year || null,
  }
}

// ── OL 다단계 검색: title+author → title only → mainTitle+author → mainTitle only ──

async function searchOLMulti(title, author) {
  // 1차: title + author
  let ol = author ? await searchOL(title, author) : null
  if (ol) return ol
  await sleep(1000)

  // 2차: title only
  ol = await searchOL(title, null)
  if (ol) return ol
  await sleep(1000)

  // 3차: 부제 제거 후 시도
  const short = mainTitle(title)
  if (short !== title) {
    ol = author ? await searchOL(short, author) : null
    if (ol) return ol
    await sleep(1000)

    ol = await searchOL(short, null)
    if (ol) return ol
    await sleep(1000)
  }

  return null
}

// ── BookCover API ──

async function fetchBookCover(title, author, retries = 2) {
  if (!author) return null
  const params = new URLSearchParams({ book_title: title, author_name: author })

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://bookcover.longitood.com/bookcover?${params}`)
      if (res.status === 429) { await sleep(3000); continue }
      if (res.status === 404) return null
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch {
      if (i < retries) await sleep(1000)
    }
  }
  return null
}

function olCoverUrl(coverId) {
  if (!coverId) return null
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
}

// 기존 썸네일이 양호한지
function hasGoodThumb(url) {
  if (!url) return false
  return url.includes('gr-assets.com') ||
    url.includes('covers.openlibrary.org')
  // Google Books URL은 오매칭 위험 → 양호 판정에서 제외
}

// ── 메인 ──

async function main() {
  console.log(`BOOK en 재검증 파이프라인`)
  console.log(`옵션: offset=${OFFSET}, limit=${LIMIT}, dry=${DRY_RUN}, skip-thumb=${SKIP_THUMB}\n`)

  // 대상 조회
  const { data: targets, error } = await supabase
    .from('content_locales')
    .select(`
      content_id, title, creator, isbn, thumbnail_url, sources,
      contents!inner(type, external_source)
    `)
    .eq('locale', 'en')
    .eq('verified', false)
    .eq('contents.type', 'BOOK')
    .eq('contents.external_source', 'kakao_book')
    .order('title')
    .range(OFFSET, OFFSET + LIMIT - 1)

  if (error) throw new Error(`DB 조회 실패: ${error.message}`)

  // ko locale 일괄 조회
  const contentIds = targets.map(t => t.content_id)
  const koMap = new Map()
  for (let i = 0; i < contentIds.length; i += 200) {
    const batch = contentIds.slice(i, i + 200)
    const { data: koData } = await supabase
      .from('content_locales')
      .select('content_id, title, creator')
      .eq('locale', 'ko')
      .in('content_id', batch)
    if (koData) koData.forEach(r => koMap.set(r.content_id, r))
  }

  const rows = targets.map(t => ({
    content_id: t.content_id,
    en_title: t.title,
    en_creator: t.creator,
    en_isbn: t.isbn,
    en_thumb: t.thumbnail_url,
    sources: t.sources,
    ko_title: koMap.get(t.content_id)?.title || null,
    ko_creator: koMap.get(t.content_id)?.creator || null,
  }))

  console.log(`대상: ${rows.length}건\n`)

  const stats = { verified: 0, thumbUpdated: 0, needsReview: 0, failed: 0 }
  const needsReview = []
  const logs = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const idx = i + OFFSET
    const label = row.ko_title || row.en_title || '(untitled)'

    // ── 한글/CJK 체크 ──
    if (hasNonLatin(row.en_title)) {
      needsReview.push({ ...row, reason: 'en_title 비라틴 문자' })
      stats.needsReview++
      logs.push(`[${idx}] ${label} | REVIEW(title_nonlatin)`)
      continue
    }

    if (!row.en_title) {
      needsReview.push({ ...row, reason: 'en_title NULL' })
      stats.needsReview++
      logs.push(`[${idx}] ${label} | REVIEW(title_null)`)
      continue
    }

    const creatorNonLatin = hasNonLatin(row.en_creator)
    const searchAuthor = creatorNonLatin ? null : row.en_creator

    // ── OL 검증 ──
    const ol = await searchOLMulti(row.en_title, searchAuthor)

    if (!ol) {
      needsReview.push({ ...row, reason: 'OL 검색 실패' })
      stats.needsReview++
      logs.push(`[${idx}] ${label} | REVIEW(ol_miss)`)
      continue
    }

    // 저자 판정
    let finalCreator = row.en_creator
    let creatorSource = 'existing'

    if (creatorNonLatin && ol.author) {
      if (hasNonLatin(ol.author)) {
        // OL도 비라틴 저자 → 수동 검토
        needsReview.push({
          ...row, reason: `en_creator 비라틴 + OL 저자도 비라틴: "${ol.author}"`, ol
        })
        stats.needsReview++
        logs.push(`[${idx}] ${label} | REVIEW(creator_both_nonlatin)`)
        continue
      }
      // OL 제목과 DB 제목 일치 확인 (다른 책 방지)
      const olTitleNorm = ol.title?.toLowerCase().trim()
      const dbTitleNorm = row.en_title?.toLowerCase().trim()
      const shortDbTitle = mainTitle(row.en_title)?.toLowerCase().trim()
      if (olTitleNorm !== dbTitleNorm && olTitleNorm !== shortDbTitle) {
        needsReview.push({
          ...row, reason: `OL 제목 불일치: "${row.en_title}" vs OL "${ol.title}"`, ol
        })
        stats.needsReview++
        logs.push(`[${idx}] ${label} | REVIEW(title_mismatch_on_replace)`)
        continue
      }
      // 한글 저자 → OL 영문 저자로 교체
      finalCreator = ol.author
      creatorSource = 'ol_replace'
    } else if (searchAuthor && ol.author) {
      if (authorMatch(ol.author, searchAuthor)) {
        // 일치 → 통과
        creatorSource = 'confirmed'
      } else {
        // 불일치 → 수동 검토
        needsReview.push({
          ...row, reason: `저자 불일치: "${row.en_creator}" vs OL "${ol.author}"`, ol
        })
        stats.needsReview++
        logs.push(`[${idx}] ${label} | REVIEW(mismatch: ${row.en_creator} vs ${ol.author})`)
        continue
      }
    } else if (!row.en_creator && ol.author) {
      finalCreator = ol.author
      creatorSource = 'ol_fill'
    }

    const finalIsbn = ol.isbn || row.en_isbn

    // ── 썸네일 ──
    let finalThumb = row.en_thumb
    let thumbSource = row.sources?.thumbnail || null

    if (!SKIP_THUMB && !hasGoodThumb(finalThumb)) {
      // BookCover API
      const bcUrl = await fetchBookCover(row.en_title, finalCreator)
      await sleep(500)

      if (bcUrl) {
        finalThumb = bcUrl
        thumbSource = 'goodreads'
      } else {
        // OL cover fallback
        const olUrl = olCoverUrl(ol.coverId)
        if (olUrl) {
          finalThumb = olUrl
          thumbSource = 'openlibrary'
        } else if (!finalThumb) {
          thumbSource = 'confirmed_unavailable'
        }
      }
    } else if (hasGoodThumb(finalThumb)) {
      // 기존 양호 → 유지
      if (finalThumb.includes('gr-assets.com')) thumbSource = 'goodreads'
      else if (finalThumb.includes('openlibrary')) thumbSource = 'openlibrary'
      else thumbSource = 'google_books'
    }

    // ── DB 업데이트 ──
    const update = {
      creator: finalCreator,
      isbn: finalIsbn,
      verified: true,
      sources: {
        primary: 'openlibrary',
        ...(thumbSource ? { thumbnail: thumbSource } : {}),
      },
    }
    if (finalThumb !== row.en_thumb) update.thumbnail_url = finalThumb

    if (!DRY_RUN) {
      const { error: err } = await supabase
        .from('content_locales')
        .update(update)
        .eq('content_id', row.content_id)
        .eq('locale', 'en')

      if (err) {
        stats.failed++
        logs.push(`[${idx}] ${label} | FAIL: ${err.message}`)
        continue
      }
    }

    stats.verified++
    if (finalThumb !== row.en_thumb) stats.thumbUpdated++
    const detail = creatorSource !== 'existing' && creatorSource !== 'confirmed'
      ? ` (creator: ${row.en_creator} → ${finalCreator})`
      : ''
    logs.push(`[${idx}] ${label} | VERIFIED${detail}`)

    // 진행 출력
    const done = i + 1
    if (done % 10 === 0 || done >= rows.length) {
      console.log(`[${done}/${rows.length}] ✓${stats.verified} ⚠${stats.needsReview} fail=${stats.failed}`)
    }
  }

  // ── 결과 ──
  console.log(`\n===== 완료 =====`)
  console.log(`검증: ${stats.verified} | 썸네일 갱신: ${stats.thumbUpdated} | 검토필요: ${stats.needsReview} | 실패: ${stats.failed}`)

  // needs-review.json 저장
  if (needsReview.length > 0) {
    let existing = []
    if (existsSync(REVIEW_FILE)) {
      try { existing = JSON.parse(readFileSync(REVIEW_FILE, 'utf8')) } catch {}
    }
    const existingIds = new Set(existing.map(e => e.content_id))
    const newItems = needsReview.filter(r => !existingIds.has(r.content_id))
    const merged = [...existing, ...newItems]
    writeFileSync(REVIEW_FILE, JSON.stringify(merged, null, 2), 'utf8')
    console.log(`검토 대상 ${newItems.length}건 추가 → ${REVIEW_FILE} (총 ${merged.length}건)`)
  }

  // 로그 저장
  writeFileSync(LOG_FILE, logs.join('\n'), 'utf8')
  console.log(`로그 → ${LOG_FILE}`)
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
