/**
 * wikidata_qid 백필 2차 — 레이블 정확매칭에서 빠진 인물을 wbsearchentities로 느리게 조사한다.
 * 검색 결과의 레이블/별칭이 이름과 맞는 후보만 엔티티를 열어 생몰년을 대조한다.
 * 요청 간격을 두어 WDQS/API 한도를 넘지 않는다.
 *
 * node --env-file=.env scripts/celeb/wikidata-qid-backfill-pass2.mjs          # dry-run
 * node --env-file=.env scripts/celeb/wikidata-qid-backfill-pass2.mjs --apply  # DB 반영
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const LEDGER = resolve(process.cwd(), '../../data/celeb/new-figures')
const PREV = JSON.parse(readFileSync(resolve(LEDGER, 'wikidata-qid-backfill.json'), 'utf8'))
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const UA = { 'User-Agent': 'FeelNote/1.0 (celeb qid backfill pass2)', Accept: 'application/json' }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const norm = (v) => String(v ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9가-힣]/g, '')

function yearOf(dateStr) {
  const match = String(dateStr ?? '').match(/-?\d{3,4}/)
  return match ? Number(match[0]) : null
}

// 원장에서 닉네임→레코드 복원
const ledger = {}
for (const file of readdirSync(LEDGER)) {
  if (!file.endsWith('.json')) continue
  const rows = JSON.parse(readFileSync(resolve(LEDGER, file), 'utf8'))
  if (Array.isArray(rows)) for (const r of rows) if (r.celeb_id) ledger[r.nickname] = r
}
const targets = PREV.skipped.map((s) => ledger[s.nick]).filter(Boolean)
console.log(`2차 대상 ${targets.length}명`)

async function search(name) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&limit=8`
  for (let a = 0; a < 4; a++) {
    const response = await fetch(url, { headers: UA })
    if (response.status === 429) { await sleep(Number(response.headers.get('retry-after') ?? 30) * 1000); continue }
    if (!response.ok) return []
    const payload = await response.json()
    return payload.search ?? []
  }
  return []
}

async function entity(qid) {
  const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: UA })
  if (!response.ok) return null
  const payload = await response.json()
  const e = payload.entities?.[qid] ?? {}
  const year = (prop) => {
    const t = e.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time
    const m = String(t ?? '').match(/^([+-]?\d+)-/)
    return m ? Number(m[1]) : null
  }
  const isHuman = (e.claims?.P31 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === 'Q5')
  const labels = [e.labels?.en?.value, ...(e.aliases?.en ?? []).map((a) => a.value)].filter(Boolean)
  return { birth: year('P569'), death: year('P570'), isHuman, labels, desc: e.descriptions?.en?.value ?? '' }
}

const matched = [], skipped = []
for (const person of targets) {
  const wantB = yearOf(person.birth_date)
  const wantD = yearOf(person.death_date)
  const fits = []
  try {
    const hits = await search(person.nickname_en || person.nickname)
    for (const hit of hits.slice(0, 5)) {
      // 레이블/별칭이 이름을 포함하거나 이름이 레이블을 포함(괄호 소거 후)하는 후보만 연다
      const hitNames = [hit.label, hit.match?.text, hit.aliases?.[0]].filter(Boolean)
      if (!hitNames.some((n) => norm(n).includes(norm(person.nickname_en)) || norm(person.nickname_en).includes(norm(n)))) continue
      const detail = await entity(hit.id)
      await sleep(400)
      if (!detail?.isHuman) continue
      const nameOk = detail.labels.some((n) => norm(n).includes(norm(person.nickname_en)) || norm(person.nickname_en).includes(norm(n)))
      if (!nameOk) continue
      const bOk = wantB == null || detail.birth == null || detail.birth === wantB
      const dOk = wantD == null || detail.death == null || detail.death === wantD
      if (bOk && dOk) fits.push({ qid: hit.id, ...detail })
      if (fits.length > 1) break
    }
  } catch (error) {
    console.log('검색 실패', person.nickname, String(error).slice(0, 120))
  }
  if (fits.length === 1) matched.push({ nick: person.nickname, qid: fits[0].qid, celeb_id: person.celeb_id, desc: fits[0].desc })
  else skipped.push({ nick: person.nickname, en: person.nickname_en, fits: fits.length })
  await sleep(1200)
}

console.log(`2차 매칭 ${matched.length} / 미해결 ${skipped.length}`)
const out = { matched, skipped }
writeFileSync(resolve(LEDGER, 'wikidata-qid-backfill-pass2.json'), JSON.stringify(out, null, 2) + '\n')

if (APPLY) {
  let done = 0
  for (const m of matched) {
    const { error } = await db.from('celebs').update({ wikidata_qid: m.qid }).eq('id', m.celeb_id)
    if (error) console.log('DB 실패', m.nick, error.message)
    else done++
  }
  console.log(`DB 반영 ${done}건`)
}
