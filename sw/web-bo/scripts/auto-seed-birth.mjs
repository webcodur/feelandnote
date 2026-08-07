import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: profiles } = await supabase.from('profiles').select('id, slug, nickname, nickname_en, profession, nationality, birth_date')
  .eq('profile_type', 'CELEB').eq('status', 'active')
  .in('celeb_tier', ['full', 'light'])
  .filter('id', 'not.in', `(select celeb_id from celeb_timeline_events where source='research')`)

console.log(`대상 ${profiles.length}명`)

for (const p of profiles) {
  const events = [{
    year: p.birth_date ? Number(p.birth_date.match(/-?\d+/)?.[0]) : null,
    year_end: null, month: null, day: null,
    title: '태어나다', title_en: `Is born`,
    description: `${p.nickname}이/가 태어났다.`,
    description_en: `${p.nickname_en || p.nickname} is born.`,
    kind: 'birth',
    place_name: null, place_name_en: null,
    lat: null, lng: null, place_qid: null,
    source: 'research', source_url: null,
  }]
  if (!events[0].year) continue

  events[0].sort_order = 0
  try {
    const rows = events.map((e, i) => ({ ...e, celeb_id: p.id, sort_order: i }))
    const { error } = await supabase.from('celeb_timeline_events').insert(rows)
    if (!error) console.log(`✓ ${p.slug}`)
    else console.log(`✗ ${p.slug} — ${error.message}`)
  } catch (e) { console.log(`✗ ${p.slug}`) }
}
