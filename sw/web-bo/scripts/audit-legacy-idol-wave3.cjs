const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const batch = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'legacy-idol-wave3.json'), 'utf8'))
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function main() {
  const select = 'id,slug,nickname,nickname_en,profile_type,profession,gender,status,title,title_en,nationality,celeb_tier,bio,bio_en'
  const [koResult, enResult, slugResult] = await Promise.all([
    db.from('profiles').select(select).eq('profile_type', 'CELEB').in('nickname', batch.map((p) => p.nickname)),
    db.from('profiles').select(select).eq('profile_type', 'CELEB').in('nickname_en', batch.map((p) => p.nickname_en)),
    db.from('profiles').select(select).eq('profile_type', 'CELEB').in('slug', batch.map((p) => p.slug)),
  ])
  for (const result of [koResult, enResult, slugResult]) if (result.error) throw result.error

  const rows = [...(koResult.data || []), ...(enResult.data || []), ...(slugResult.data || [])]
    .filter((row, index, all) => all.findIndex((x) => x.id === row.id) === index)
  const byKo = new Map()
  const byEn = new Map()
  const bySlug = new Map()
  for (const row of rows) {
    if (row.nickname) byKo.set(row.nickname, [...(byKo.get(row.nickname) || []), row])
    if (row.nickname_en) byEn.set(row.nickname_en, [...(byEn.get(row.nickname_en) || []), row])
    if (row.slug) bySlug.set(row.slug, [...(bySlug.get(row.slug) || []), row])
  }

  const exact = []
  const conflicts = []
  const missing = []
  for (const person of batch) {
    const matches = [...(byKo.get(person.nickname) || []), ...(byEn.get(person.nickname_en) || []), ...(bySlug.get(person.slug) || [])]
      .filter((row, index, all) => all.findIndex((x) => x.id === row.id) === index)
    if (matches.length === 0) missing.push(person)
    else if (matches.length === 1 && matches[0].nickname === person.nickname && matches[0].nickname_en === person.nickname_en && matches[0].slug === person.slug) exact.push({ person, row: matches[0] })
    else conflicts.push({ person, rows: matches })
  }

  const exactIds = exact.map(({ row }) => row.id)
  const [socialResult, scoreResult] = await Promise.all([
    db.from('user_social').select('user_id').in('user_id', exactIds),
    db.from('user_scores').select('user_id').in('user_id', exactIds),
  ])
  for (const result of [socialResult, scoreResult]) if (result.error) throw result.error

  const qualityIssues = exact.filter(({ person, row }) => (
    row.profile_type !== 'CELEB'
    || row.profession !== 'musician'
    || row.gender !== person.gender
    || row.status !== 'inactive'
    || row.title !== person.title
    || row.title_en !== person.title_en
    || row.nationality !== person.nationality
    || !row.bio
    || !row.bio_en
  )).map(({ person, row }) => ({
    slug: row.slug,
    nickname: person.nickname,
    profile_type: row.profile_type,
    profession: row.profession,
    gender: row.gender,
    status: row.status,
    title: row.title,
    title_en: row.title_en,
    nationality: row.nationality,
    hasBio: Boolean(row.bio),
    hasBioEn: Boolean(row.bio_en),
  }))

  console.log(JSON.stringify({
    batchCount: batch.length,
    existingCount: rows.length,
    exactCount: exact.length,
    missingCount: missing.length,
    conflictCount: conflicts.length,
    exact,
    missing: missing.map(({ nickname, nickname_en, slug, groups }) => ({ nickname, nickname_en, slug, groups })),
    conflicts,
    basicQualityIssueCount: qualityIssues.length,
    basicQualityIssues: qualityIssues,
    socialRowCount: (socialResult.data || []).length,
    scoreRowCount: (scoreResult.data || []).length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
