const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const batch = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'legacy-idol-wave1.json'), 'utf8'))
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function main() {
  const names = [...new Set(batch.flatMap((p) => [p.nickname, p.nickname_en]))]
  const select = 'id,slug,nickname,nickname_en,profession,gender,publication_status,title,celeb_tier'
  const [koResult, enResult, slugResult] = await Promise.all([
    db.from('celebs').select(select).in('nickname', batch.map((p) => p.nickname)),
    db.from('celebs').select(select).in('nickname_en', batch.map((p) => p.nickname_en)),
    db.from('celebs').select(select).in('slug', batch.map((p) => p.slug)),
  ])
  for (const result of [koResult, enResult, slugResult]) if (result.error) throw result.error

  const rows = [...(koResult.data || []), ...(enResult.data || []), ...(slugResult.data || [])]
    .filter((row, index, all) => all.findIndex((x) => x.id === row.id) === index)
  const byKo = new Map()
  const byEn = new Map()
  for (const row of rows) {
    if (row.nickname) byKo.set(row.nickname, [...(byKo.get(row.nickname) || []), row])
    if (row.nickname_en) byEn.set(row.nickname_en, [...(byEn.get(row.nickname_en) || []), row])
  }

  const exact = []
  const conflicts = []
  const missing = []
  for (const person of batch) {
    const matches = [...(byKo.get(person.nickname) || []), ...(byEn.get(person.nickname_en) || [])]
      .filter((row, index, all) => all.findIndex((x) => x.id === row.id) === index)
    if (matches.length === 0) missing.push(person)
    else if (matches.length === 1 && matches[0].nickname === person.nickname && matches[0].nickname_en === person.nickname_en) exact.push({ person, row: matches[0] })
    else conflicts.push({ person, rows: matches })
  }

  console.log(JSON.stringify({
    batchCount: batch.length,
    exactCount: exact.length,
    missingCount: missing.length,
    conflictCount: conflicts.length,
    exact,
    missing: missing.map(({ nickname, nickname_en, slug, groups }) => ({ nickname, nickname_en, slug, groups })),
    conflicts,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
