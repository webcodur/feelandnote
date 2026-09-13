/**
 * 패치의 title이 DB 전체에서 이미 쓰이고 있는지 확인한다. 읽기 전용.
 * 실행: pnpm exec tsx scripts/founding-myth/check-title-dup.ts <패치파일...>
 */
import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const files = process.argv.slice(2)
  if (!files.length) throw new Error('패치 파일을 인자로 준다')

  const patches: { slug: string; title: string }[] = []
  for (const f of files) {
    for (const p of JSON.parse(fs.readFileSync(f, 'utf8'))) {
      if (p.celeb?.title) patches.push({ slug: p.slug, title: p.celeb.title })
    }
  }

  const existing = new Map<string, string[]>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('celebs').select('slug,title').order('slug').range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      if (!r.title) continue
      const list = existing.get(r.title) ?? []
      list.push(r.slug)
      existing.set(r.title, list)
    }
    if ((data ?? []).length < 1000) break
  }

  const patchSlugs = new Set(patches.map((p) => p.slug))
  let hit = 0
  for (const p of patches) {
    const owners = (existing.get(p.title) ?? []).filter((s) => !patchSlugs.has(s))
    if (owners.length) { hit++; console.log(`중복  ${p.slug} "${p.title}" ← 이미 ${owners.join(', ')}`) }
  }
  const seen = new Map<string, string[]>()
  for (const p of patches) { const l = seen.get(p.title) ?? []; l.push(p.slug); seen.set(p.title, l) }
  for (const [t, l] of seen) if (l.length > 1) { hit++; console.log(`패치 내부 중복  "${t}" ← ${l.join(', ')}`) }

  console.log(hit ? `\n중복 ${hit}건` : `\n중복 없음 (패치 ${patches.length}건 / DB title ${existing.size}종)`)
}
main()
