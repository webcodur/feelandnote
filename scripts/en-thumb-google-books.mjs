/**
 * EN 에디션 썸네일을 Google Books API로 교체
 * - Open Library URL 또는 빈 값인 EN 에디션 대상
 * - ISBN 기반 조회, API 키 14개 라운드로빈
 *
 * 실행: node scripts/en-thumb-google-books.mjs
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

// API 키 14개 로드
const API_KEYS = []
for (let i = 0; i <= 13; i++) {
  const suffix = i === 0 ? '' : `_${i}`
  const key = process.env[`GOOGLE_BOOKS_API_KEY${suffix}`]
  if (key) API_KEYS.push(key)
}
console.log(`API 키 ${API_KEYS.length}개 로드`)

let keyIndex = 0
function nextKey() {
  const key = API_KEYS[keyIndex % API_KEYS.length]
  keyIndex++
  return key
}

// Google Books ISBN 조회 → 썸네일 URL
async function getGoogleThumb(isbn, retries = 2) {
  const key = nextKey()
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1&key=${key}`

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) {
        await sleep(2000)
        continue
      }
      if (!res.ok) return null

      const data = await res.json()
      if (!data.items || data.items.length === 0) return null

      const thumb = data.items[0].volumeInfo?.imageLinks?.thumbnail
      if (!thumb) return null

      // 고해상도로 변환
      return thumb.replace('zoom=1', 'zoom=2').replace('http://', 'https://')
    } catch {
      if (i < retries) await sleep(1000)
    }
  }
  return null
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// 대상 조회 (페이징)
async function getTargets() {
  const all = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('content_editions')
      .select('content_id, isbn, thumbnail_url')
      .eq('locale', 'en')
      .not('isbn', 'is', null)
      .neq('isbn', '')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...data)
    offset += PAGE_SIZE
    if (data.length < PAGE_SIZE) break
  }

  console.log(`EN 에디션 총 ${all.length}건 조회`)

  return all.filter(row =>
    !row.thumbnail_url ||
    row.thumbnail_url === '' ||
    row.thumbnail_url.includes('openlibrary')
  )
}

// 배치 처리
async function main() {
  const targets = await getTargets()
  console.log(`교체 대상: ${targets.length}건`)

  let updated = 0, notFound = 0, failed = 0
  const BATCH = 10 // 동시 요청 수

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (row) => {
        const thumb = await getGoogleThumb(row.isbn)
        return { ...row, newThumb: thumb }
      })
    )

    for (const r of results) {
      if (r.newThumb) {
        const { error } = await supabase
          .from('content_editions')
          .update({ thumbnail_url: r.newThumb })
          .eq('content_id', r.content_id)
          .eq('locale', 'en')

        if (error) {
          failed++
          console.error(`실패 ${r.content_id}:`, error.message)
        } else {
          updated++
        }
      } else {
        notFound++
      }
    }

    if ((i + BATCH) % 100 === 0 || i + BATCH >= targets.length) {
      console.log(`진행: ${Math.min(i + BATCH, targets.length)}/${targets.length} | 교체: ${updated} | 미발견: ${notFound} | 실패: ${failed}`)
    }

    // Rate limit 보호
    await sleep(200)
  }

  console.log(`\n완료 — 교체: ${updated}, 미발견: ${notFound}, 실패: ${failed}`)
}

main().catch(console.error)
