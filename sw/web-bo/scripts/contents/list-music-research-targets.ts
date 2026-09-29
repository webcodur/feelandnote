/** 곡 조사 작성 대상 MUSIC을 뽑는다(읽기 전용): 한국어·영어 소개가 모두 빈 행을 인물 연결 수 순으로 출력한다.
 * 한쪽 언어에만 소개가 있는 행은 번역 큐 몫이라 개수만 센다.
 * node --env-file=.env --import tsx scripts/contents/list-music-research-targets.ts [skip] [take]
 * 규칙: docs/project/celeb/celeb-02-06-content-introduction-sources.md 「곡 조사 작성」 */
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const [skip = '0', take = '30'] = process.argv.slice(2)
async function all(build: (f: number, t: number) => any) {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}
const blank = (d: string | null) => !d?.trim()
async function main() {
  const locs = await all((f, t) => db.from('content_locales').select('content_id,locale,title,creator,description,contents!inner(type,external_id,external_source)')
    .eq('contents.type', 'MUSIC').order('content_id').order('locale').range(f, t))
  const by = new Map<string, any>()
  for (const l of locs) {
    const row = by.get(l.content_id) ?? by.set(l.content_id, { content: l.contents }).get(l.content_id)
    row[l.locale] = l
  }
  const links = await all((f, t) => db.from('celeb_contents').select('content_id').order('content_id').range(f, t))
  const count = new Map<string, number>()
  for (const l of links) count.set(l.content_id, (count.get(l.content_id) ?? 0) + 1)
  let oneSided = 0
  const targets: any[] = []
  for (const [id, r] of by) {
    const koBlank = !r.ko || blank(r.ko.description), enBlank = !r.en || blank(r.en.description)
    if (koBlank !== enBlank) { oneSided++; continue }
    if (!koBlank) continue
    targets.push({ id, n: count.get(id) ?? 0, ext: r.content.external_id, ko: r.ko ? [r.ko.title, r.ko.creator] : null,
      en: r.en ? [r.en.title, r.en.creator] : null })
  }
  targets.sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
  console.log(JSON.stringify({ research: targets.length, oneSided, linked: targets.filter(t => t.n > 0).length }))
  for (const t of targets.slice(Number(skip), Number(skip) + Number(take))) console.log(JSON.stringify(t))
}
main()
