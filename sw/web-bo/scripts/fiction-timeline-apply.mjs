import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const dataPath = process.argv.find((a) => a.endsWith('.json'))
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const payload = JSON.parse(readFileSync(dataPath, 'utf-8'))
const profiles = []
for (let i = 0; i < payload.people.length; i += 1000) {
  const slugs = payload.people.slice(i, i + 1000).map((p) => p.slug)
  const { data } = await supabase.from('profiles').select('id, slug').in('slug', slugs)
  profiles.push(...data)
}
const bySlug = new Map(profiles.map((p) => [p.slug, p]))

let ok = 0
for (const person of payload.people) {
  const profile = bySlug.get(person.slug)
  if (!profile) { console.log(`✗ ${person.slug} — not found`); continue }
  try {
    const events = person.events.map((e) => ({
      sequence_label: e.sequence_label,
      sequence_label_en: e.sequence_label_en ?? null,
      title: e.title,
      title_en: e.titleEn ?? null,
      description: e.description ?? null,
      description_en: e.descriptionEn ?? null,
      kind: e.kind ?? 'other',
      place_name: e.placeName ?? null,
      place_name_en: e.placeNameEn ?? null,
      sort_order: e.sort_order,
    }))
    const { data, error } = await supabase.rpc('set_fiction_narrative_events', {
      p_celeb_id: profile.id,
      p_events: events,
    })
    if (error) throw error
    ok++
    console.log(`✓ ${person.slug} ${data}건`)
  } catch (e) { console.log(`✗ ${person.slug} — ${String(e?.message ?? e).slice(0, 200)}`) }
}
console.log(`\n완료 ${ok} / ${payload.people.length}`)
