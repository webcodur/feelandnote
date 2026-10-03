// 신화 게임 체험 표본을 실제 DB에서 뽑아 JSON으로 쓴다. 읽기 전용이다(select만 한다).
// 로컬 sw/web/.env에 DB 키가 없으면 DB 키가 든 다른 앱의 .env를 넘긴다.
//   node --env-file=../web-bo/.env scripts/build-myth-game-fixture.mjs
// 표본은 한 판이 성립하는 만큼만 담는다. 신화마다 대표 사진·관계가 많은 인물부터 고른다.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@feelandnote/db'

const OUT = resolve(import.meta.dirname, '../src/components/features/game/myth/shared/fixture.json')
// 표본에 담을 신화와 신화당 인원 상한. 오디세이아는 항해 게임이 등장인물 전원을 쓴다
const MYTHS = {
  'greek-roman-myth': 34,
  'myth-norse': 26,
  'myth-egypt': 22,
  'myth-japan': 20,
  'myth-mesopotamia': 20,
  'myth-korea-jeju-bonpuri': 13,
  'myth-hindu-ramayana': 16,
  'myth-china-xiyou': 16,
  'homer-odyssey': 56,
}

const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY || process.env.DB_SECRET_KEY
if (!url || !key) throw new Error('DB 주소·키가 없다. --env-file로 DB 키가 든 .env를 넘긴다.')
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function must(query) {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
async function inChunks(ids, build) {
  const out = []
  for (let i = 0; i < ids.length; i += 200) out.push(...await must(build(ids.slice(i, i + 200))))
  return out
}
const pair = (ko, en) => ({ ko: ko?.trim() || null, en: en?.trim() || null })

const regions = await must(db.from('faction_lv1').select('id,name,name_en').eq('is_myth', true))
const myths = await must(db.from('faction_lv2')
  .select('id,lv1_id,slug,name,name_en,published,theme_music,lead_person_ids,sort_order')
  .eq('is_myth', true).eq('published', true).in('slug', Object.keys(MYTHS)).order('sort_order'))
const mythIds = myths.map((m) => m.id)
const members = await must(db.from('faction_member_rows')
  .select('lv2_id,celeb_id,short_desc,short_desc_en,sort_order,image_url,group_name,group_name_en,group_position')
  .eq('hidden', false).in('lv2_id', mythIds).order('lv2_id').order('sort_order').order('celeb_id'))
const groupRows = await must(db.from('faction_lv3').select('lv2_id,name,description,description_en').in('lv2_id', mythIds))
const allIds = [...new Set(members.map((m) => m.celeb_id))]
const people = await inChunks(allIds, (ids) => db.from('celebs')
  .select('id,slug,nickname,nickname_en,title,title_en,headline,headline_en,gender,avatar_url,portrait_url,publication_status')
  .in('id', ids))
const personById = new Map(people.filter((p) => p.slug && p.publication_status === 'active').map((p) => [p.id, p]))
const allRelations = await inChunks([...personById.keys()], (ids) => db.from('celeb_relations')
  .select('from_id,to_id,rel_type,rel_group,note,note_en').in('from_id', ids))

// 신화 안에서 관계가 많은 인물일수록 관계 게임의 판이 넓어진다
const degree = new Map()
for (const r of allRelations) {
  if (!personById.has(r.to_id)) continue
  degree.set(r.from_id, (degree.get(r.from_id) ?? 0) + 1)
  degree.set(r.to_id, (degree.get(r.to_id) ?? 0) + 1)
}
const chosen = new Set()
for (const myth of myths) {
  const rows = members.filter((m) => m.lv2_id === myth.id && personById.has(m.celeb_id))
  const score = (row) => (personById.get(row.celeb_id).portrait_url ? 4 : 0) + Math.min(degree.get(row.celeb_id) ?? 0, 8) * 0.5
  const picked = [...rows].sort((a, b) => score(b) - score(a) || (a.sort_order ?? 0) - (b.sort_order ?? 0)).slice(0, MYTHS[myth.slug])
  for (const row of picked) chosen.add(row.celeb_id)
}
const ids = [...chosen]

const fixture = {
  source: 'db-snapshot',
  generatedAt: new Date().toISOString().slice(0, 10),
  myths: myths.map((m) => {
    const region = regions.find((r) => r.id === m.lv1_id)
    const rows = members.filter((row) => row.lv2_id === m.id && chosen.has(row.celeb_id))
    const labels = [...new Set(rows.map((row) => row.group_name?.trim()).filter(Boolean))]
    return {
      id: m.id, slug: m.slug, name: pair(m.name, m.name_en), region: pair(region?.name, region?.name_en),
      musicUrl: m.theme_music?.url ?? null,
      leadIds: (m.lead_person_ids ?? []).filter((id) => chosen.has(id)),
      groups: labels.map((label) => {
        const sample = rows.find((row) => row.group_name?.trim() === label)
        const info = groupRows.find((g) => g.lv2_id === m.id && g.name === label)
        const position = Math.min(...rows.filter((row) => row.group_name?.trim() === label).map((row) => row.group_position ?? 999))
        return { key: label, name: pair(label, sample?.group_name_en), description: pair(info?.description, info?.description_en), position }
      }).sort((a, b) => a.position - b.position),
    }
  }),
  figures: ids.map((id) => {
    const p = personById.get(id)
    return {
      id, slug: p.slug, name: pair(p.nickname, p.nickname_en), title: pair(p.title, p.title_en),
      headline: pair(p.headline, p.headline_en), gender: p.gender === true ? 'male' : p.gender === false ? 'female' : null,
      avatarUrl: p.avatar_url, portraitUrl: p.portrait_url,
      roles: members.filter((row) => row.celeb_id === id).map((row) => ({
        mythId: row.lv2_id, group: row.group_name?.trim() || null, summary: pair(row.short_desc, row.short_desc_en),
        imageUrl: row.image_url ?? null, order: row.sort_order ?? 0,
      })),
    }
  }),
  relations: allRelations.filter((r) => chosen.has(r.from_id) && chosen.has(r.to_id)).map((r) => ({
    from: r.from_id, to: r.to_id, type: r.rel_type, group: r.rel_group, note: pair(r.note, r.note_en),
  })),
}
writeFileSync(OUT, `${JSON.stringify(fixture)}\n`)
console.log(`신화 ${fixture.myths.length} · 인물 ${fixture.figures.length} · 관계 ${fixture.relations.length}`)
for (const m of fixture.myths) console.log(`  ${m.slug}: ${fixture.figures.filter((f) => f.roles.some((r) => r.mythId === m.id)).length}명, 그룹 ${m.groups.length}`)
