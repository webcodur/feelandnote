// 일반 팩션(is_myth=false) 리스팅용 소스 데이터 추출 — 조회 전용
// 출력: data/faction/desc/source/<slug>.json
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: key, Authorization: `Bearer ${key}` }
async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
  return r.json()
}
import fs from 'node:fs'
import path from 'node:path'
const OUT = path.resolve('../../../../data/faction/desc/source')
fs.mkdirSync(OUT, { recursive: true })

async function getAll(base) {
  const rows = []
  for (let off = 0; ; off += 1000) {
    const page = await get(`${base}&limit=1000&offset=${off}`)
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

const [lv1, lv2, lv3, members] = await Promise.all([
  get('faction_lv1?select=id,name,name_en'),
  get('faction_lv2?select=id,lv1_id,name,name_en,slug,description,description_en,is_fiction,is_featured,start_date,end_date&is_myth=eq.false&order=sort_order'),
  get('faction_lv3?select=id,lv2_id,name,name_en,description,sort_order&order=sort_order'),
  getAll('faction_members?select=lv2_id,lv3_id,celeb_id,hidden,short_desc,short_desc_en,sort_order&order=sort_order'),
])
const lv1ById = new Map(lv1.map((r) => [r.id, r]))

const celebIds = [...new Set(members.filter((m) => !m.hidden).map((m) => m.celeb_id))]
const celebs = []
for (let i = 0; i < celebIds.length; i += 200) {
  const rows = await get(`celebs?select=id,nickname,nickname_en,title,title_en,headline&id=in.(${celebIds.slice(i, i + 200).join(',')})`)
  celebs.push(...rows)
}
const cById = new Map(celebs.map((c) => [c.id, c]))

let n = 0
for (const f of lv2) {
  const theme = lv1ById.get(f.lv1_id)
  const groups = lv3.filter((g) => g.lv2_id === f.id)
  const roster = members
    .filter((m) => m.lv2_id === f.id && !m.hidden)
    .map((m) => {
      const c = cById.get(m.celeb_id)
      return {
        name: c?.nickname, title: c?.title, headline: c?.headline,
        group: groups.find((g) => g.id === m.lv3_id)?.name ?? null,
        role_in_faction: m.short_desc, role_in_faction_en: m.short_desc_en,
      }
    })
    .filter((r) => r.name)
  const doc = {
    theme: theme?.name, theme_en: theme?.name_en,
    name: f.name, name_en: f.name_en, slug: f.slug,
    start: f.start_date, end: f.end_date, is_fiction: f.is_fiction, featured: f.is_featured,
    current_ko: f.description, current_en: f.description_en,
    groups: groups.map((g) => ({ name: g.name, name_en: g.name_en, desc: g.description })),
    roster,
  }
  fs.writeFileSync(path.join(OUT, `${f.slug ?? f.id}.json`), JSON.stringify(doc, null, 2) + '\n')
  n++
}
console.log(`${n}개 추출 → ${OUT}`)
