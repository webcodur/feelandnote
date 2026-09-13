/**
 * 실제 제작과 같은 후보를 센다.
 *   node --env-file=.env --import tsx scripts/tistory-cinema/stock.mts [--list | --names]
 */
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { ASSETS } from '../blog-assets.mjs'
import { savedPeople } from './lib/person-material.mts'
import { FEATURED_LISTS, MIN_FILMS, MIN_VOICES, loadSelectionData, selectCandidates } from './lib/selection.mts'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const data = await loadSelectionData(db)
const { jobs, film, good, byWork, byCeleb } = selectCandidates(data)
const existing = savedPeople(path.join(ASSETS, 'tistory-cinema'), data)
for (const job of jobs) if (job.kind === 'person' && job.id && existing.has(job.id)) job.name = existing.get(job.id)!
const count = (kind: string) => jobs.filter((job) => job.kind === kind).length

console.log(`영화 감상 ${film.length}건 중 작품 편 필터를 통과한 것 ${good.length}건 (${Math.round(good.length / film.length * 100)}%)`)
console.log(`영화 ${byWork.size}편 · 인물 ${byCeleb.size}명이 걸린다\n`)
console.log(`작품 편 ${count('work')}편 — 감상 ${MIN_VOICES}명 이상, 같은 파일 제목은 감상이 가장 많은 작품`)
console.log(`인물 편 ${count('person')}편 — 영화 감상 ${MIN_FILMS}편 이상, 짧은 기록 포함; 감상이 아닌 것으로 확인된 관계와 slug 없는 인물 제외`)
console.log(`목록 편 ${count('list')}편 — 제작 대상으로 지정한 ${FEATURED_LISTS.length}개 목록`)
console.log(`합계 ${jobs.length}편 · 하루 3편이면 ${Math.ceil(jobs.length / 3)}일치`)

const ordered = [...jobs].sort((a, b) => b.n - a.n)
if (process.argv.includes('--names')) {
  console.log('\n── 후보 이름 ──')
  ordered.forEach((job) => console.log(job.name))
} else if (process.argv.includes('--list')) {
  console.log('\n── 제작 후보 전체 ──')
  ordered.forEach((job, i) => console.log(`${String(i + 1).padStart(3)}. [${job.kind}] ${job.name}${job.n ? ` (${job.n})` : ''}`))
}
