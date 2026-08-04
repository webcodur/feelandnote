/**
 * 생애 행적 대상 스냅샷 생성기.
 *
 * 서비스에 노출되는 실존 사망 인물(active + full/light + death_date)을 전수 조회하고,
 * 현재 조사형 타임라인 보유 여부를 함께 기록한다. DB는 읽기만 한다.
 *
 * 실행 (sw/web-bo):
 *   node --env-file=.env scripts/timeline-targets.mjs
 *   node --env-file=.env scripts/timeline-targets.mjs --out=../../docs/celeb-data/timeline/_batches/custom.json
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'

const outArg = process.argv.find((arg) => arg.startsWith('--out='))
const OUT_FILE = resolve(
  process.cwd(),
  outArg?.slice('--out='.length)
    || '../../docs/celeb-data/timeline/_batches/deceased-active-2026-08-04.json',
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

async function fetchAll(table, select, order = 'id') {
  const rows = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order)
      .range(from, from + 499)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...data)
    if (data.length < 500) break
  }
  return rows
}

const profiles = await fetchAll(
  'profiles',
  'id, slug, nickname, nickname_en, profession, nationality, birth_date, death_date, wikidata_qid, profile_type, celeb_tier, status',
)
const events = await fetchAll('celeb_timeline_events', 'id, celeb_id, source')

const researchCount = new Map()
for (const event of events) {
  if (event.source !== 'research') continue
  researchCount.set(event.celeb_id, (researchCount.get(event.celeb_id) ?? 0) + 1)
}

const targets = profiles
  .filter((profile) => (
    profile.profile_type === 'CELEB'
    && profile.status === 'active'
    && (profile.celeb_tier === 'full' || profile.celeb_tier === 'light')
    && typeof profile.death_date === 'string'
    && profile.death_date.trim() !== ''
  ))
  .map((profile) => {
    const eventCount = researchCount.get(profile.id) ?? 0
    return {
      slug: profile.slug,
      name: profile.nickname,
      nameEn: profile.nickname_en,
      profession: profile.profession,
      nationality: profile.nationality,
      birthDate: profile.birth_date,
      deathDate: profile.death_date,
      wikidataQid: profile.wikidata_qid,
      researchEventCount: eventCount,
      needsResearch: eventCount === 0,
    }
  })
  .sort((a, b) => a.slug.localeCompare(b.slug))

const missingRequiredIdentity = targets.filter((target) => (
  !target.slug
  || !target.name
  || !target.birthDate
  || !target.deathDate
))
if (missingRequiredIdentity.length > 0) {
  const slugs = missingRequiredIdentity.map((target) => target.slug ?? '(slug 없음)').join(', ')
  throw new Error(`대상 ${missingRequiredIdentity.length}명의 신원 필수값이 비었다: ${slugs}`)
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  criteria: {
    profileType: 'CELEB',
    status: 'active',
    celebTiers: ['full', 'light'],
    deathDate: 'non-empty',
  },
  counts: {
    total: targets.length,
    withResearchTimeline: targets.filter((target) => !target.needsResearch).length,
    needsResearch: targets.filter((target) => target.needsResearch).length,
    missingWikidataQid: targets.filter((target) => !target.wikidataQid).length,
  },
  targets,
}

if (!existsSync(dirname(OUT_FILE))) mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8')

console.log(`대상 ${snapshot.counts.total}명`)
console.log(`기존 조사형 타임라인 ${snapshot.counts.withResearchTimeline}명`)
console.log(`신규 조사 필요 ${snapshot.counts.needsResearch}명`)
console.log(`저장 ${OUT_FILE}`)
