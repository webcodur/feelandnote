/**
 * EN 도서 썸네일 수집 v2 - ISBN 사용 금지, 올바른 저자 검증
 *
 * 파이프라인:
 *  1. Open Library 검색 (en_title) → 올바른 영문 저자 확보
 *  2. BookCover API (en_title + 올바른 저자) → Goodreads 고품질 표지
 *  3. 실패 시 Open Library 커버 fallback
 *
 * 실행: node scripts/en-thumb-bookcover-v2.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Open Library 검색 → 저자 + 커버 ID
async function searchOpenLibrary(title, retries = 2) {
  const params = new URLSearchParams({
    title,
    limit: '5',
    fields: 'title,author_name,cover_i',
  })

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://openlibrary.org/search.json?${params}`)
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      const data = await res.json()
      if (!data.docs?.length) return null

      // 제목이 가장 비슷한 결과 선택 (정확한 일치 우선)
      const titleLower = title.toLowerCase().trim()
      const exact = data.docs.find(d =>
        d.title?.toLowerCase().trim() === titleLower
      )
      const doc = exact || data.docs[0]

      return {
        author: doc.author_name?.[0] || null,
        allAuthors: doc.author_name || [],
        coverId: doc.cover_i || null,
        matchedTitle: doc.title,
      }
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return null
}

// BookCover API (제목 + 저자)
async function fetchBookCover(title, author, retries = 2) {
  if (!author) return null
  const params = new URLSearchParams({ book_title: title, author_name: author })

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://bookcover.longitood.com/bookcover?${params}`)
      if (res.status === 429) { await sleep(3000); continue }
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch {
      if (i < retries) await sleep(1000)
    }
  }
  return null
}

// Open Library 커버 URL 생성
function olCoverUrl(coverId) {
  if (!coverId) return null
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
}

// 대상 조회
async function getTargets() {
  const all = []
  const PAGE_SIZE = 500
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('content_locales')
      .select('content_id, title, creator, isbn, contents!inner(type)')
      .eq('locale', 'en')
      .is('thumbnail_url', null)
      .not('sources->>thumbnail', 'eq', 'confirmed_unavailable')
      .eq('contents.type', 'BOOK')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data.map(r => ({
      content_id: r.content_id,
      title: r.title,
      en_creator: r.creator,
      en_isbn: r.isbn,
    })))
    offset += PAGE_SIZE
    if (data.length < PAGE_SIZE) break
  }

  return all
}

async function main() {
  const targets = await getTargets()
  console.log(`대상: ${targets.length}건\n`)

  let goodreads = 0, olFallback = 0, notFound = 0, failed = 0, creatorFixed = 0
  const BATCH = 1 // Open Library 레이트리밋 (1 req/sec)
  const mismatches = []
  const notFoundList = []

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i]

    // 1단계: Open Library에서 올바른 저자 확보
    const ol = await searchOpenLibrary(row.title)
    await sleep(1000) // Open Library 레이트리밋

    const olAuthor = ol?.author || null
    const useAuthor = olAuthor || row.en_creator

    // 저자 불일치 감지
    if (olAuthor && row.en_creator && olAuthor.toLowerCase() !== row.en_creator.toLowerCase()) {
      const olLast = olAuthor.split(/\s+/).pop()?.toLowerCase()
      const enLast = row.en_creator.split(/\s+/).pop()?.toLowerCase()
      if (olLast !== enLast) {
        creatorFixed++
        mismatches.push({
          title: row.title,
          en_creator: row.en_creator,
          ol_author: olAuthor,
        })
      }
    }

    // 2단계: BookCover API (Goodreads)
    let thumbUrl = null
    if (useAuthor) {
      thumbUrl = await fetchBookCover(row.title, useAuthor)
    }

    // 3단계: Goodreads 없으면 Open Library fallback
    if (!thumbUrl && ol?.coverId) {
      thumbUrl = olCoverUrl(ol.coverId)
      if (thumbUrl) olFallback++
    }

    if (thumbUrl) {
      const { error } = await supabase
        .from('content_locales')
        .update({ thumbnail_url: thumbUrl })
        .eq('content_id', row.content_id)
        .eq('locale', 'en')

      if (error) {
        failed++
        console.error(`  DB 실패 [${row.title}]:`, error.message)
      } else if (!thumbUrl.includes('openlibrary')) {
        goodreads++
      }
    } else {
      notFound++
      notFoundList.push(row.title)
    }

    const done = i + 1
    if (done % 50 === 0 || done >= targets.length) {
      console.log(`진행: ${done}/${targets.length} | Goodreads: ${goodreads} | OL fallback: ${olFallback} | 미발견: ${notFound} | 저자교정: ${creatorFixed}`)
    }
  }

  console.log(`\n===== 완료 =====`)
  console.log(`Goodreads 표지: ${goodreads}`)
  console.log(`Open Library fallback: ${olFallback}`)
  console.log(`미발견: ${notFound}`)
  console.log(`DB 실패: ${failed}`)
  console.log(`저자 불일치 감지: ${creatorFixed}`)

  if (mismatches.length > 0) {
    console.log(`\n저자 불일치 목록:`)
    for (const m of mismatches) {
      console.log(`  - "${m.title}": DB="${m.en_creator}" → OL="${m.ol_author}"`)
    }
  }

  if (notFoundList.length > 0 && notFoundList.length <= 50) {
    console.log(`\n미발견 도서:`)
    for (const t of notFoundList) {
      console.log(`  - ${t}`)
    }
  }
}

main().catch(console.error)
