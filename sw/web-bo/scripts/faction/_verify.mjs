import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY)
const { count: l1 } = await db.from('faction_lv1').select('*', { count: 'exact', head: true })
const { count: l1m } = await db.from('faction_lv1').select('*', { count: 'exact', head: true }).eq('is_myth', true)
const { count: l2 } = await db.from('faction_lv2').select('*', { count: 'exact', head: true })
const { count: l2m } = await db.from('faction_lv2').select('*', { count: 'exact', head: true }).eq('is_myth', true)
const { count: mem } = await db.from('faction_members').select('*', { count: 'exact', head: true })
const { count: rows } = await db.from('faction_member_rows').select('*', { count: 'exact', head: true })
console.log(`lv1=${l1}(myth ${l1m}) lv2=${l2}(myth ${l2m}) members=${mem} view=${rows}`)
const { data: leads } = await db.from('faction_lv2').select('slug,lead_person_ids').eq('is_myth', true)
const empty = (leads ?? []).filter(t => !t.lead_person_ids || t.lead_person_ids.length < 3)
console.log(`대표인물 3인 미만 신화: ${empty.length}개`, empty.map(t => t.slug))
// 신화 지역 배정 확인
const { data: regions } = await db.from('faction_lv1').select('id,slug,name').eq('is_myth', true).order('sort_order')
const { data: myths } = await db.from('faction_lv2').select('slug,lv1_id').eq('is_myth', true)
const byRegion = {}; const rid = new Map(regions.map(r => [r.id, r.slug]))
for (const m of myths ?? []) { const r = rid.get(m.lv1_id); byRegion[r] = (byRegion[r] || 0) + 1 }
console.log('지역별 신화:', byRegion)
