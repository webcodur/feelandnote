/**
 * 건국신화 배치 인물의 현재 채움 상태를 확인한다. 읽기 전용.
 * 실행: pnpm exec tsx scripts/founding-myth/verify.ts [--slugs a,b,c]
 */
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FIELDS = ['title', 'title_en', 'headline', 'headline_en', 'bio', 'bio_en', 'profession', 'gender', 'nationality', 'speech_tone'] as const

async function main() {
  const i = process.argv.indexOf('--slugs')
  const slugs = i > -1 ? process.argv[i + 1].split(',') : null

  let q = db.from('celebs').select('slug,nickname,celeb_reality,' + FIELDS.join(',')).order('nickname')
  if (slugs) q = q.in('slug', slugs)
  else q = q.gte('created_at', '2026-09-04T22:00:00').limit(600)
  const { data, error } = await q
  if (error) throw new Error(error.message)

  const rows = data as any[]
  const filled = rows.filter((r) => FIELDS.every((f) => r[f] !== null && r[f] !== undefined && String(r[f]).trim()))
  console.log(`대상 ${rows.length}명 / 10필드 전부 채워진 인물 ${filled.length}명\n`)
  for (const f of FIELDS) {
    const n = rows.filter((r) => r[f] === null || r[f] === undefined || !String(r[f]).trim()).length
    if (n) console.log(`  결손 ${String(n).padStart(3)}  ${f}`)
  }
  if (slugs) {
    console.log('')
    for (const r of rows) console.log(`[${r.nickname}] ${r.title} / ${r.title_en} · ${r.profession} · ${r.gender === true ? '남' : r.gender === false ? '여' : '?'} · ${r.nationality} · ${r.speech_tone}\n  EN: ${r.headline_en}`)
  }
}
main()
