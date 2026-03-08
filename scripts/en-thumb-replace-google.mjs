/**
 * Google Books 영문 썸네일을 BookCover API(Goodreads)로 교체
 * - edge=curl 없는 Google Books URL 대상 (플레이스홀더 가능성 높음)
 * - Goodreads 표지가 있으면 교체, 없으면 유지
 *
 * 실행: node scripts/en-thumb-replace-google.mjs
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

async function getTargets() {
  const all = []
  const PAGE_SIZE = 500
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('content_locales')
      .select('content_id, isbn, title, creator, thumbnail_url, contents!inner(type)')
      .eq('locale', 'en')
      .like('thumbnail_url', '%books.google.com%')
      .not('thumbnail_url', 'like', '%edge=curl%')
      .eq('contents.type', 'BOOK')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data.map(r => ({
      content_id: r.content_id,
      isbn: r.isbn,
      title: r.title,
      creator: r.creator,
      old_url: r.thumbnail_url,
    })))
    offset += PAGE_SIZE
    if (data.length < PAGE_SIZE) break
  }

  return all
}

async function main() {
  const targets = await getTargets()
  console.log(`대상: ${targets.length}건 (Google Books, edge=curl 없음)`)

  let replaced = 0, kept = 0, failed = 0
  const BATCH = 5

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (row) => {
        let url = null
        if (row.isbn) url = await fetchByIsbn(row.isbn)
        if (!url && row.title) url = await fetchByTitle(row.title, row.creator)
        return { ...row, newUrl: url }
      })
    )

    for (const r of results) {
      if (r.newUrl) {
        const { error } = await supabase
          .from('content_locales')
          .update({ thumbnail_url: r.newUrl })
          .eq('content_id', r.content_id)
          .eq('locale', 'en')

        if (error) {
          failed++
          console.error(`  DB 실패 [${r.title}]:`, error.message)
        } else {
          replaced++
        }
      } else {
        kept++
      }
    }

    const done = Math.min(i + BATCH, targets.length)
    if (done % 100 === 0 || done >= targets.length) {
      console.log(`진행: ${done}/${targets.length} | 교체: ${replaced} | 유지: ${kept} | 실패: ${failed}`)
    }

    await sleep(500)
  }

  console.log(`\n===== 완료 =====`)
  console.log(`Goodreads로 교체: ${replaced}`)
  console.log(`Google Books 유지: ${kept}`)
  console.log(`DB 실패: ${failed}`)
}

main().catch(console.error)
