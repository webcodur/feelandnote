/**
 * 신규 인물의 wikidata_qid 백필. 원장(data/celeb/new-figures/*.json)의 registered 레코드를 대상으로
 * WDQS SPARQL에서 영문 레이블 정확 매칭으로 QID를 찾고, 생몰년을 원장과 대조해
 * 확실한 것만 celebs.wikidata_qid에 기록한다. 불일치·동명이인은 건너뛰고 목록에 남긴다.
 *
 * node --env-file=.env scripts/celeb/wikidata-qid-backfill.mjs          # dry-run
 * node --env-file=.env scripts/celeb/wikidata-qid-backfill.mjs --apply  # DB 반영
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const LEDGER = resolve(process.cwd(), '../../data/celeb/new-figures')
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const people = []
for (const file of readdirSync(LEDGER)) {
  if (!file.endsWith('.json')) continue
  const rows = JSON.parse(readFileSync(join(LEDGER, file), 'utf8'))
  if (Array.isArray(rows)) for (const r of rows) if (r.celeb_id) people.push({ file, ...r })
}
console.log(`대상 ${people.length}명`)

function yearOf(dateStr) {
  const match = String(dateStr ?? '').match(/-?\d{3,4}/)
  return match ? Number(match[0]) : null
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function sparql(query) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: {
        'User-Agent': 'FeelNote/1.0 (celeb qid backfill)',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/sparql-results+json',
      },
      body: `query=${encodeURIComponent(query)}`,
    })
    if (response.status === 429) {
      const wait = Number(response.headers.get('retry-after') ?? 60) * 1000
      console.log(`429 — ${Math.round(wait / 1000)}초 대기`)
      await sleep(wait)
      continue
    }
    if (!response.ok) throw new Error(`WDQS ${response.status}`)
    return response.json()
  }
  throw new Error('WDQS 재시도 초과')
}

// 영문 레이블 정확 매칭 + 생몰년. 동일 레이블의 다수 엔티티는 반환해 아래서 생몰로 가른다.
const names = [...new Set(people.map((p) => p.nickname_en).filter(Boolean))]
const CHUNK = 80
const byLabel = new Map()
for (let i = 0; i < names.length; i += CHUNK) {
  const chunk = names.slice(i, i + CHUNK)
  const values = chunk.map((name) => `"${name.replace(/"/g, '\\"')}"@en`).join(' ')
  const query = `
    SELECT ?person ?label ?birth ?death WHERE {
      VALUES ?label { ${values} }
      ?person rdfs:label ?label.
      ?person wdt:P31 wd:Q5.
      OPTIONAL { ?person wdt:P569 ?birth. }
      OPTIONAL { ?person wdt:P570 ?death. }
    }`
  const data = await sparql(query)
  const yearOf = (raw) => {
    const match = String(raw ?? '').match(/^([+-]?\d+)-/)
    return match ? Number(match[1]) : null
  }
  for (const binding of data.results.bindings) {
    const label = binding.label.value
    const qid = binding.person.value.split('/').pop()
    const birth = binding.birth ? yearOf(binding.birth.value) : null
    const death = binding.death ? yearOf(binding.death.value) : null
    if (!byLabel.has(label)) byLabel.set(label, [])
    byLabel.get(label).push({ qid, birth, death })
  }
  console.log(`레이블 ${Math.min(i + CHUNK, names.length)}/${names.length} 조회`)
  await sleep(2000)
}

const results = { matched: [], skipped: [] }
for (const person of people) {
  const candidates = byLabel.get(person.nickname_en) ?? []
  const wantBirth = yearOf(person.birth_date)
  const wantDeath = yearOf(person.death_date)
  const fits = candidates.filter((c) =>
    (wantBirth == null || c.birth == null || c.birth === wantBirth)
    && (wantDeath == null || c.death == null || c.death === wantDeath))
  if (fits.length === 1) {
    results.matched.push({ nick: person.nickname, en: person.nickname_en, qid: fits[0].qid, celeb_id: person.celeb_id })
  } else {
    results.skipped.push({ nick: person.nickname, en: person.nickname_en, candidates: candidates.length, fits: fits.length })
  }
}

console.log(`매칭 ${results.matched.length} / 미매칭 ${results.skipped.length}`)
writeFileSync(
  resolve(LEDGER, 'wikidata-qid-backfill.json'),
  JSON.stringify({ matched: results.matched, skipped: results.skipped }, null, 2) + '\n',
)

if (APPLY) {
  let done = 0
  for (const m of results.matched) {
    const { error } = await db.from('celebs').update({ wikidata_qid: m.qid }).eq('id', m.celeb_id)
    if (error) console.log('DB 실패', m.nick, error.message)
    else done++
  }
  console.log(`DB 반영 ${done}건`)
}
