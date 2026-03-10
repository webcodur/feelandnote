/**
 * Google Books 썸네일 → BookCover/OL 교체
 * 오매칭 위험 제거 (e.g. Republic → Star Wars: Old Republic)
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

async function main() {
  const { data: targets, error } = await supabase
    .from('content_locales')
    .select('content_id, title, creator, thumbnail_url')
    .eq('locale', 'en')
    .like('thumbnail_url', '%books.google.com%')

  if (error) throw error
  console.log(`Google Books 썸네일 대상: ${targets.length}건\n`)

  let replaced = 0, kept = 0, failed = 0

  for (let i = 0; i < targets.length; i++) {
    const { content_id, title, creator, thumbnail_url } = targets[i]

    // BookCover API 시도
    const bcUrl = await fetchBookCover(title, creator)
    await sleep(500)

    if (bcUrl) {
      const { error: err } = await supabase
        .from('content_locales')
        .update({
          thumbnail_url: bcUrl,
          sources: { primary: 'openlibrary', thumbnail: 'goodreads' },
        })
        .eq('content_id', content_id)
        .eq('locale', 'en')

      if (err) { failed++; continue }
      replaced++
    } else {
      kept++ // BookCover에서 못 찾으면 기존 유지
    }

    if ((i + 1) % 20 === 0 || i + 1 >= targets.length) {
      console.log(`[${i + 1}/${targets.length}] replaced=${replaced} kept=${kept} failed=${failed}`)
    }
  }

  console.log(`\n완료: 교체 ${replaced} | 유지 ${kept} | 실패 ${failed}`)
}

main().catch(console.error)
