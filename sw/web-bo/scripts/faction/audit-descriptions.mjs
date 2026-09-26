// 일반 팩션(is_myth=false) 개요글 품질 점검 — 조회 전용, 쓰기 없음
// 실행: node --env-file=../../web/.env audit-descriptions.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env 누락'); process.exit(1) }

const H = { apikey: key, Authorization: `Bearer ${key}` }
async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
  return r.json()
}

const [lv1, lv2, lv3, members] = await Promise.all([
  get('faction_lv1?select=id,name,is_fiction&order=sort_order'),
  get('faction_lv2?select=id,lv1_id,name,name_en,slug,description,description_en,is_myth,is_fiction,published,is_featured,sort_order,start_date,end_date&order=sort_order'),
  get('faction_lv3?select=id,lv2_id,name,description'),
  get('faction_members?select=lv2_id,celeb_id,hidden,short_desc,long_desc'),
])

const lv1ById = new Map(lv1.map((r) => [r.id, r]))
const memberCount = new Map()
const descMemberCount = new Map()
for (const m of members) {
  if (m.hidden) continue
  memberCount.set(m.lv2_id, (memberCount.get(m.lv2_id) ?? 0) + 1)
  if ((m.short_desc ?? '').trim() || (m.long_desc ?? '').trim())
    descMemberCount.set(m.lv2_id, (descMemberCount.get(m.lv2_id) ?? 0) + 1)
}
const lv3ByLv2 = new Map()
for (const g of lv3) {
  if (!lv3ByLv2.has(g.lv2_id)) lv3ByLv2.set(g.lv2_id, [])
  lv3ByLv2.get(g.lv2_id).push(g)
}

console.log('lv1 | lv2 | myth | fic | pub | feat | 멤버(설명있음) | lv3 | ko자수 | en자수')
for (const f of lv2) {
  const t = lv1ById.get(f.lv1_id)
  console.log([
    `${t?.name ?? '?'}${t?.is_fiction ? '(F)' : ''}`,
    f.name, f.is_myth ? 'M' : '-', f.is_fiction ? 'F' : '-',
    f.published ? 'P' : '-', f.is_featured ? '*' : '-',
    `${memberCount.get(f.id) ?? 0}(${descMemberCount.get(f.id) ?? 0})`,
    (lv3ByLv2.get(f.id) ?? []).length,
    (f.description ?? '').length, (f.description_en ?? '').length,
  ].join(' | '))
}
