import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
async function main() {
  const { data: cards } = await db.from('faction_lv2').select('id,name,slug,is_myth,is_fiction,is_featured,published')
  const mythCards = (cards ?? []).filter(t => t.is_myth)
  const otherCards = (cards ?? []).filter(t => !t.is_myth)
  const tf = (arr: any[]) => `${arr.filter(t => t.is_fiction).length}/${arr.length} is_fiction=true`
  console.log(`신화 카드 ${mythCards.length}개 → ${tf(mythCards)}`)
  console.log(`일반 팩션 카드 ${otherCards.length}개 → ${tf(otherCards)}`)
  console.log('\nis_fiction=true인데 신화가 아닌 것:')
  for (const t of otherCards.filter(t => t.is_fiction)) console.log(` - ${t.name} (${t.slug})`)
  console.log('\nis_fiction=false인데 신화인 것:')
  for (const t of mythCards.filter(t => !t.is_fiction)) console.log(` - ${t.name} (${t.slug})`)
}
main().catch(e => { console.error(e); process.exit(1) })
