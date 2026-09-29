/** 조사 작성 대상 BOOK을 뽑는다(읽기 전용): 한국어·영어 소개가 모두 빈 행을 인물 연결 수 순으로 출력한다.
 * 영어 소개(또는 예약값)가 있는 한국어 공란은 번역 큐 몫이라 개수만 센다.
 * node --env-file=.env --import tsx scripts/contents/list-book-research-targets.ts [skip] [take]
 * 규칙: docs/project/celeb/celeb-02-06-content-introduction-sources.md 「번역 백엔드」 */
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
  const locs = await all((f, t) => db.from('content_locales').select('content_id,locale,title,creator,publisher,isbn,description,contents!inner(type)')
    .eq('contents.type', 'BOOK').order('content_id').order('locale').range(f, t))
  const by = new Map<string, any>()
  for (const l of locs) (by.get(l.content_id) ?? by.set(l.content_id, {}).get(l.content_id))[l.locale] = l
  const links = await all((f, t) => db.from('celeb_contents').select('content_id').order('content_id').range(f, t))
  const count = new Map<string, number>()
  for (const l of links) count.set(l.content_id, (count.get(l.content_id) ?? 0) + 1)
  let enText = 0
  const targets: any[] = []
  for (const [id, r] of by) {
    if (!r.ko || !blank(r.ko.description)) continue
    const en = r.en?.description
    if (!blank(en)) { enText++; continue }
    targets.push({ id, n: count.get(id) ?? 0, ko: [r.ko.title, r.ko.creator, r.ko.publisher, r.ko.isbn], en: r.en ? [r.en.title, r.en.creator] : null })
  }
  targets.sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
  console.log(JSON.stringify({ koBlank: targets.length + enText, enHasText: enText, research: targets.length,
    linked: targets.filter(t => t.n > 0).length }))
  for (const t of targets.slice(Number(skip), Number(skip) + Number(take))) console.log(JSON.stringify(t))
}
main()
