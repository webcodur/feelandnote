import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const dataPath = process.argv.find((a) => a.endsWith('.json'))
if (!dataPath) throw new Error('JSON 경로가 필요하다')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const payload = JSON.parse(readFileSync(dataPath, 'utf-8'))
if (!Array.isArray(payload.people)) throw new Error('people 배열이 필요하다')

const celebs = []
for (let i = 0; i < payload.people.length; i += 1000) {
  const slugs = payload.people.slice(i, i + 1000).map((p) => p.slug)
  const { data, error } = await supabase.from('celebs').select('id, slug').in('slug', slugs)
  if (error) throw error
  celebs.push(...(data ?? []))
}
const bySlug = new Map(celebs.map((celeb) => [celeb.slug, celeb]))
const missingSlugs = payload.people
  .map((person) => person.slug)
  .filter((slug) => !bySlug.has(slug))
if (missingSlugs.length) throw new Error(`없는 slug: ${missingSlugs.join(', ')}`)

console.log(`대상 ${payload.people.length}명`)
if (!APPLY) {
  console.log('대상만 확인했다. 적재하려면 --apply를 붙여라.')
  process.exit(0)
}

let ok = 0
for (const person of payload.people) {
  const celeb = bySlug.get(person.slug)
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
      p_celeb_id: celeb.id,
      p_events: events,
    })
    if (error) throw error
    ok++
    console.log(`✓ ${person.slug} ${data}건`)
  } catch (e) { console.log(`✗ ${person.slug} — ${String(e?.message ?? e).slice(0, 200)}`) }
}
console.log(`\n완료 ${ok} / ${payload.people.length}`)
