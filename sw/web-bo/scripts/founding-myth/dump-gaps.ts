/**
 * 건국신화 배치(2026-09-04 22:56 등록) 427명의 현재값과 전승 배정을 덤프한다. 읽기 전용.
 *
 * 실행: pnpm exec tsx scripts/founding-myth/dump-gaps.ts [--out <경로>]
 */
import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BATCH_FROM = '2026-09-04T22:00:00'

async function main() {
  const outArg = process.argv.indexOf('--out')
  const out = outArg > -1 ? process.argv[outArg + 1] : 'founding-myth-gaps.json'

  const { data: celebs, error } = await db
    .from('celebs')
    .select('id,nickname,nickname_en,slug,celeb_reality,celeb_tier,publication_status,headline,headline_en,bio,bio_en,title,title_en,profession,gender,nationality,birth_date,death_date,avatar_url,speech_tone,wikidata_qid')
    .gte('created_at', BATCH_FROM)
    .order('nickname', { ascending: true })
    .limit(600)
  if (error) throw new Error(error.message)

  const ids = celebs!.map((c) => c.id)
  const assigns: any[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error: e2 } = await db
      .from('faction_members')
      .select('celeb_id,lv2_id,hidden,sort_order')
      .in('celeb_id', ids.slice(i, i + 100))
    if (e2) throw new Error(e2.message)
    assigns.push(...(data ?? []))
  }
  const { data: tags } = await db.from('faction_lv2').select('id,name,slug,published').eq('is_myth', true)
  const tagById = new Map((tags ?? []).map((t: any) => [t.id, t]))

  const tagOf = new Map<string, any>()
  for (const a of assigns) {
    const t = tagById.get(a.lv2_id)
    if (t) tagOf.set(a.celeb_id, { name: t.name, slug: t.slug, hidden: a.hidden, order: a.sort_order })
  }

  const rows = celebs!.map((c) => ({ ...c, myth: tagOf.get(c.id) ?? null }))
  fs.writeFileSync(out, JSON.stringify({ captured_at: new Date().toISOString(), count: rows.length, rows }, null, 2), 'utf8')
  console.log(`${rows.length}명 → ${out}`)

  const byTrad = new Map<string, number>()
  for (const r of rows) byTrad.set(r.myth?.name ?? '(배정없음)', (byTrad.get(r.myth?.name ?? '(배정없음)') ?? 0) + 1)
  console.log('\n신화별 인원')
  for (const [k, v] of [...byTrad].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`)
}
main()
