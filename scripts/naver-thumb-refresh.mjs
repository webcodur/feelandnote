/**
 * 만료된 Naver 썸네일 URL 재수집 (ISBN 기반)
 * 실행: node scripts/naver-thumb-refresh.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

dotenv.config({ path: resolve('sw/web/.env') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function searchNaverBook(isbn) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn}`,
    {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0]?.image || null
}

// 대상 로드
const deadIds = JSON.parse(readFileSync(resolve('scripts/naver-dead-ids.json'), 'utf-8'))

const { data: targets } = await sb
  .from('content_locales')
  .select('content_id, title, isbn, thumbnail_url')
  .eq('locale', 'ko')
  .in('content_id', deadIds)

console.log(`대상: ${targets.length}건\n`)

let updated = 0, failed = 0

for (const row of targets) {
  if (!row.isbn) {
    console.log(`[SKIP] ${row.title} - ISBN 없음`)
    failed++
    continue
  }

  const newThumb = await searchNaverBook(row.isbn)
  await sleep(200)

  if (!newThumb) {
    console.log(`[FAIL] ${row.title} (${row.isbn}) - Naver API 결과 없음`)
    failed++
    continue
  }

  const { error } = await sb
    .from('content_locales')
    .update({ thumbnail_url: newThumb, updated_at: new Date().toISOString() })
    .eq('content_id', row.content_id)
    .eq('locale', 'ko')

  if (error) {
    console.log(`[ERR] ${row.title} - DB 업데이트 실패: ${error.message}`)
    failed++
  } else {
    console.log(`[OK] ${row.title}: ${newThumb.slice(-40)}`)
    updated++
  }
}

console.log(`\n완료: updated=${updated}, failed=${failed}`)
