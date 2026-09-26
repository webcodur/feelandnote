// faction_lv2 개요 전량 덤프 — 조회 전용
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: key, Authorization: `Bearer ${key}` }
async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r.json()
}
const [lv1, lv2, members] = await Promise.all([
  get('faction_lv1?select=id,name'),
  get('faction_lv2?select=id,lv1_id,name,name_en,slug,description,description_en,is_myth,is_fiction,is_featured,start_date,end_date&order=sort_order'),
  get('faction_members?select=lv2_id,celeb_id,hidden'),
])
const lv1ById = new Map(lv1.map((r) => [r.id, r.name]))
const cnt = new Map()
for (const m of members) if (!m.hidden) cnt.set(m.lv2_id, (cnt.get(m.lv2_id) ?? 0) + 1)
const out = lv2.map((f) => ({
  theme: lv1ById.get(f.lv1_id), name: f.name, name_en: f.name_en, slug: f.slug,
  is_myth: f.is_myth, is_fiction: f.is_fiction, featured: f.is_featured,
  members: cnt.get(f.id) ?? 0, start: f.start_date, end: f.end_date,
  ko: f.description, en: f.description_en,
}))
await import('fs').then((fs) =>
  fs.writeFileSync(new URL('./descriptions-dump.json', import.meta.url), JSON.stringify(out, null, 2)))
console.log(`${out.length} rows dumped`)
