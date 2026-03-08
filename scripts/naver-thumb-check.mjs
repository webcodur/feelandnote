/**
 * ko Naver 썸네일 URL 전수 생존 검사
 * 실행: node scripts/naver-thumb-check.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('sw/web/.env') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PAGE = 500
let offset = 0, alive = 0, dead = 0
const deadIds = []

while (true) {
  const { data } = await sb
    .from('content_locales')
    .select('content_id, thumbnail_url')
    .eq('locale', 'ko')
    .like('thumbnail_url', '%shopping-phinf.pstatic.net%')
    .range(offset, offset + PAGE - 1)

  if (!data || data.length === 0) break

  // 동시 50건씩 체크
  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50)
    const results = await Promise.all(batch.map(async (r) => {
      try {
        const res = await fetch(r.thumbnail_url, { method: 'HEAD' })
        return { id: r.content_id, ok: res.ok }
      } catch {
        return { id: r.content_id, ok: false }
      }
    }))
    for (const r of results) {
      if (r.ok) alive++
      else { dead++; deadIds.push(r.id) }
    }
  }

  offset += PAGE
  console.log(`진행: ${offset} | alive: ${alive} | dead: ${dead}`)
}

console.log(`\n최종: alive=${alive}, dead=${dead}, total=${alive + dead}, deadRate=${(dead / (alive + dead) * 100).toFixed(1)}%`)
console.log(`dead IDs (${deadIds.length}건) 저장: scripts/naver-dead-ids.json`)

import { writeFileSync } from 'fs'
writeFileSync(resolve('scripts/naver-dead-ids.json'), JSON.stringify(deadIds, null, 2))
