/**
 * EN 도서 썸네일을 BookCover API(Goodreads)로 수집
 * - content_locales en + BOOK + thumbnail_url IS NULL 대상
 * - 1차: ISBN 조회, 2차: 제목+저자 검색
 *
 * 실행: node scripts/en-thumb-bookcover.mjs
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

const API_BASE = 'https://bookcover.longitood.com/bookcover'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// BookCover API - ISBN 조회
async function fetchByIsbn(isbn, retries = 2) {
  const clean = isbn.replace(/[-\s]/g, '')
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${API_BASE}/${clean}`)
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

// BookCover API - 제목+저자 검색
async function fetchByTitle(title, author, retries = 2) {
  const params = new URLSearchParams({ book_title: title })
  if (author) params.set('author_name', author)

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${API_BASE}?${params}`)
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

// 대상 조회: en + BOOK + thumbnail_url IS NULL (RPC로 직접 조인)
async function getTargets() {
  const { data, error } = await supabase.rpc('get_en_books_missing_thumb')
  if (error) {
    // RPC 없으면 raw SQL 대체
    console.log('RPC 미등록, SQL 직접 조회 시도...')
    return getTargetsFallback()
  }
  return data || []
}

async function getTargetsFallback() {
  const all = []
  const PAGE_SIZE = 500
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('content_locales')
      .select('content_id, isbn, title, creator, contents!inner(type)')
      .eq('locale', 'en')
      .is('thumbnail_url', null)
      .eq('contents.type', 'BOOK')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data.map(r => ({
      content_id: r.content_id,
      isbn: r.isbn,
      title: r.title,
      creator: r.creator,
    })))
    offset += PAGE_SIZE
    if (data.length < PAGE_SIZE) break
  }

  return all
}

async function main() {
  const targets = await getTargets()
  console.log(`대상: ${targets.length}건 (en BOOK, thumbnail NULL)`)

  let byIsbn = 0, byTitle = 0, notFound = 0, failed = 0
  const BATCH = 5
  const notFoundList = []

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (row) => {
        // 1차: ISBN
        let url = null
        if (row.isbn) {
          url = await fetchByIsbn(row.isbn)
          if (url) return { ...row, url, method: 'isbn' }
        }
        // 2차: 제목+저자
        if (row.title) {
          url = await fetchByTitle(row.title, row.creator)
          if (url) return { ...row, url, method: 'title' }
        }
        return { ...row, url: null, method: null }
      })
    )

    for (const r of results) {
      if (r.url) {
        const { error } = await supabase
          .from('content_locales')
          .update({ thumbnail_url: r.url })
          .eq('content_id', r.content_id)
          .eq('locale', 'en')

        if (error) {
          failed++
          console.error(`  DB 실패 [${r.title}]:`, error.message)
        } else {
          if (r.method === 'isbn') byIsbn++
          else byTitle++
        }
      } else {
        notFound++
        notFoundList.push({ id: r.content_id, title: r.title, isbn: r.isbn })
      }
    }

    const done = Math.min(i + BATCH, targets.length)
    if (done % 50 === 0 || done >= targets.length) {
      console.log(`진행: ${done}/${targets.length} | ISBN: ${byIsbn} | 제목: ${byTitle} | 미발견: ${notFound} | 실패: ${failed}`)
    }

    // Rate limit (fair-use)
    await sleep(500)
  }

  console.log(`\n===== 완료 =====`)
  console.log(`ISBN 매칭: ${byIsbn}`)
  console.log(`제목 매칭: ${byTitle}`)
  console.log(`미발견: ${notFound}`)
  console.log(`DB 실패: ${failed}`)

  if (notFoundList.length > 0) {
    console.log(`\n미발견 도서 목록:`)
    for (const item of notFoundList) {
      console.log(`  - ${item.title} (ISBN: ${item.isbn || 'N/A'})`)
    }
  }
}

main().catch(console.error)
