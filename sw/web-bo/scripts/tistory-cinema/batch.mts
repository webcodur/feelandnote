/**
 * 재고에 있는 글감을 **전량 원고로 만든다.**
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/batch.mts --plan
 *   node --env-file=.env --import tsx scripts/tistory-cinema/batch.mts --run
 *   node --env-file=.env --import tsx scripts/tistory-cinema/batch.mts --run --only person
 *
 * DB에서 실행할 때마다 후보를 계산하고 저장된 인물 ID·slug와 원고를 대조한다.
 * 인물 편은 DB를 한 번만 읽고 영화 메타를 공유한다. 기존 재료는 --force 없이는 보존한다.
 * 실패가 반복되면 멈추며, 다음 실행은 완성된 원고를 제외하고 이어 간다.
 *
 * 발행은 여기서 하지 않는다. 원고를 다 만들어 놓고 사람이 확인한 뒤 `publish.mjs` 로 건다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { loadSelectionData, selectCandidates, type Job } from './lib/selection.mts'
import { ASSETS } from '../blog-assets.mjs'
import { backupArticle, buildPersonMaterial, completedPerson, MovieCache, personContext, savedPeople } from './lib/person-material.mts'
import { renderOne } from './preview.mts'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const DIR = path.join(ASSETS, 'tistory-cinema')
const args = process.argv.slice(2)
const RUN = args.includes('--run')
const ONLY = args.indexOf('--only') >= 0 ? args[args.indexOf('--only') + 1] : null
const LIMIT = args.indexOf('--limit') >= 0 ? Number(args[args.indexOf('--limit') + 1]) : Infinity
const FORCE = args.includes('--force')
/** DB 감상 몇 건만 고쳤을 때 전량을 다시 돌리지 않으려고 대상을 좁힌다. */
const MATCH = args.indexOf('--match') >= 0 ? args[args.indexOf('--match') + 1].split(',').filter(Boolean) : null

const data = await loadSelectionData(db)
const { jobs } = selectCandidates(data)
fs.mkdirSync(DIR, { recursive: true })
const existingPeople = savedPeople(DIR, data)
for (const job of jobs) if (job.kind === 'person' && job.id && existingPeople.has(job.id)) job.name = existingPeople.get(job.id)!

const picked = jobs
  .filter((j) => !ONLY || j.kind === ONLY)
  .filter((j) => !MATCH || MATCH.some((m) => j.name === m))
  .sort((a, b) => b.n - a.n)

/**
 * 🔴 **재고 기준이 바뀌면 이미 만든 것도 다시 만든다.** 필터를 손대거나 DB 감상을 고치면
 *    기존 글에 실리는 사람 수·편수가 달라진다. 그때 새 것만 만들면 옛 원고가 남아 제목의
 *    숫자와 본문이 어긋난다. `--force` 가 그 경우를 위한 것이다.
 */
const has = (j: Job) => !FORCE && (j.kind === 'person' ? completedPerson(DIR, j) : fs.existsSync(path.join(DIR, `_body-${j.name}.html`)))
const pending = picked.filter((j) => !has(j))
const todo = pending.slice(0, LIMIT)
const byKind = (k: string) => picked.filter((j) => j.kind === k).length
console.log(`후보 ${picked.length}편 (작품 ${byKind('work')} · 인물 ${byKind('person')} · 목록 ${byKind('list')})`)
console.log(`이미 만든 것 ${picked.length - pending.length}편 · 만들 것 ${todo.length}편${FORCE ? ' (--force: 전량 다시)' : ''}`)
if (args.includes('--names')) {
  // 예약·발행이 걸린 옛 글이 후보에서 빠졌는지 대조할 때 쓴다
  picked.forEach((j) => console.log(j.name))
  process.exit(0)
}
if (!RUN) {
  console.log('\n--run 을 붙이면 만든다. 미리 볼 목록:')
  todo.slice(0, 20).forEach((j, i) => console.log(`${String(i + 1).padStart(3)}. [${j.kind}] ${j.name}${j.n ? ` (${j.n})` : ''}`))
  if (todo.length > 20) console.log(`   … 그리고 ${todo.length - 20}편 더`)
  process.exit(0)
}

const BUILD: Record<string, string> = { work: 'build-draft.mts', person: 'build-person.mts', list: 'build-list.mts' }
const here = path.resolve(import.meta.dirname)
const run = (script: string, a: string[]) =>
  spawnSync(process.execPath, ['--env-file=.env', '--import', 'tsx', path.join(here, script), ...a],
    { encoding: 'utf8', cwd: path.resolve(here, '../..'), timeout: 240000 })

const failed: string[] = []
let done = 0
let created = 0
let rendered = 0
const cache = new MovieCache(DIR)
const context = personContext(data, cache)
const t0 = Date.now()
for (const j of todo) {
  if (j.kind === 'person') {
    try {
      const file = path.join(DIR, `${j.name}.json`)
      const exists = fs.existsSync(file)
      if (exists) {
        const old = JSON.parse(fs.readFileSync(file, 'utf8'))
        if (!old.celeb || old.celeb.slug !== j.arg[1] || (old.celeb.id && old.celeb.id !== j.id)) throw new Error('Filename belongs to another person')
      }
      // Renderer changes do not authorize replacing an existing person's selected reviews.
      const material = !exists || FORCE ? await buildPersonMaterial(context, j.id!, Number(j.arg[3])) : null
      backupArticle(DIR, j.name)
      if (material) {
        const temp = `${file}.cinema_generate_people-${process.pid}.tmp`
        fs.writeFileSync(temp, JSON.stringify(material, null, 2))
        fs.renameSync(temp, file)
      }
      renderOne(j.name)
      if (!completedPerson(DIR, j)) throw new Error('Saved person article does not match material and renderer')
      if (!exists) created++
      else rendered++
      done++
      if (done <= 3 || done % 10 === 0) console.log(`${done}/${todo.length} ${j.name} · 신규 ${created} · 기존 렌더 ${rendered} · TMDB ${cache.stats.fetched}편 (${cache.stats.requests}회)`)
    } catch (error) {
      failed.push(`${j.name} · ${(error as Error).message}`)
      console.log(`실패: ${failed.at(-1)}`)
      if (/TMDB repeated failures/.test((error as Error).message) || failed.length >= 3) break
    }
    continue
  }
  backupArticle(DIR, j.name)
  const b = run(BUILD[j.kind], j.arg)
  if (b.status !== 0) { failed.push(`${j.name} · build: ${(b.stderr || '').split('\n').find((x) => x.includes('Error')) ?? '실패'}`); continue }
  const p = run('preview.mts', [j.name])
  if (p.status !== 0) { failed.push(`${j.name} · preview: ${(p.stderr || '').split('\n').find((x) => x.includes('Error')) ?? '실패'}`); continue }
  done++
  const per = (Date.now() - t0) / done / 1000
  if (done % 5 === 0 || done <= 3) {
    console.log(`${done}/${todo.length} ${j.name} · 편당 ${per.toFixed(1)}초 · 남은 시간 ${Math.round((todo.length - done) * per / 60)}분`)
  }
}
console.log(`\n${done}편 완성 · 실패 ${failed.length}편`)
if (created || rendered) console.log(`인물 신규 ${created}편 · 기존 재료 보존 후 렌더 ${rendered}편 · 메타 재사용 ${cache.stats.reused}회 · TMDB 신규 ${cache.stats.fetched}편`)
failed.forEach((f) => console.log(`  ${f}`))
if (failed.length) process.exitCode = 1
