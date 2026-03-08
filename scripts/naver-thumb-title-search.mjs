/**
 * 제목 기반 Naver 도서 검색 → 표지 복구
 * ISBN이 재사용되어 오매칭되는 문제 대응
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('sw/web/.env') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CID = process.env.NAVER_CLIENT_ID
const CSC = process.env.NAVER_CLIENT_SECRET

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// 오매칭 롤백 + NOT_FOUND + 원래 실패한 것들
const targetIds = [
  'dc77271c-cfb4-4ba4-8b02-59c9ab62d277',  // 빅서
  '94675b53-288e-4613-8c6d-fd1c8be07cdd',  // 순수와 경험의 노래
  '3e367046-69a3-4c95-98c1-e5606135ab18',  // 울부짖음
  '545b31a8-02f3-4cd8-930f-e912be203f2b',  // 고백
  '38945033-35e7-4914-809f-19b04af857b5',  // 일뤼미나시옹
  '3f805d78-d2e6-48dd-9dd7-d4d05f2a73b7',  // 지옥에서 보낸 한 철
  '6ddf69ab-39b1-4377-be1d-98bc03920203',  // 야생의 소년들
  'f6f4b51e-cdba-43db-9c30-f3f7c19b6f53',  // 이태백 명시문 선집
  '4ac53e77-35ba-45b6-8a29-23552219c194',  // 워런 버핏만 알고 있는 주식투자의 비밀
]

const { data: targets } = await sb
  .from('content_locales')
  .select('content_id, title, creator')
  .eq('locale', 'ko')
  .in('content_id', targetIds)

console.log(`대상: ${targets.length}건\n`)

let updated = 0, failed = 0

for (const row of targets) {
  // 제목으로 검색
  const query = encodeURIComponent(row.title)
  const res = await fetch(
    `https://openapi.naver.com/v1/search/book.json?query=${query}&display=5`,
    { headers: { 'X-Naver-Client-Id': CID, 'X-Naver-Client-Secret': CSC } }
  )
  await sleep(200)

  if (!res.ok) {
    console.log(`[ERR] ${row.title} - API 에러 ${res.status}`)
    failed++
    continue
  }

  const data = await res.json()
  if (!data.items?.length) {
    console.log(`[FAIL] ${row.title} - 검색 결과 없음`)
    failed++
    continue
  }

  // 제목 매칭: API 결과에서 DB 제목을 포함하는 항목 찾기
  const titleClean = row.title.replace(/\s/g, '').toLowerCase()
  const match = data.items.find(item => {
    const apiTitle = item.title.replace(/<[^>]*>/g, '').replace(/\s/g, '').toLowerCase()
    return apiTitle.includes(titleClean) || titleClean.includes(apiTitle)
  })

  if (!match) {
    // 첫 번째 결과의 제목 보여주기
    const firstTitle = data.items[0].title.replace(/<[^>]*>/g, '')
    console.log(`[NOMATCH] ${row.title} - 1st result: "${firstTitle}"`)
    failed++
    continue
  }

  const apiTitle = match.title.replace(/<[^>]*>/g, '')
  const newThumb = match.image

  if (!newThumb) {
    console.log(`[NOIMG] ${row.title} => ${apiTitle} - 이미지 없음`)
    failed++
    continue
  }

  // URL 생존 확인
  try {
    const check = await fetch(newThumb, { method: 'HEAD' })
    if (!check.ok) {
      console.log(`[DEAD] ${row.title} => ${apiTitle} - URL 404`)
      failed++
      continue
    }
  } catch {
    console.log(`[DEAD] ${row.title} - URL 접근 불가`)
    failed++
    continue
  }

  const { error } = await sb
    .from('content_locales')
    .update({ thumbnail_url: newThumb, updated_at: new Date().toISOString() })
    .eq('content_id', row.content_id)
    .eq('locale', 'ko')

  if (error) {
    console.log(`[DBERR] ${row.title} - ${error.message}`)
    failed++
  } else {
    console.log(`[OK] ${row.title} => ${apiTitle} | ${newThumb.slice(-40)}`)
    updated++
  }
}

console.log(`\n완료: updated=${updated}, failed=${failed}`)
