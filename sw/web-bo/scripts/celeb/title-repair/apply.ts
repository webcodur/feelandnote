/**
 * 수식어 재작업 패치를 검증하고 celebs.title/title_en에 반영한다.
 *
 * 입력: 패치 JSON 파일 여러 개. 각 원소는
 *   { "slug": "...", "id"?: "...", "keep"?: true, "celeb": { "title": "...", "title_en": "..." } }
 *   - keep=true면 현행 유지 판정 — DB를 바꾸지 않고 kept 목록에 기록한다.
 *   - 패치는 title과 title_en을 둘 다 가져야 한다(둘을 짝지어 검증).
 *
 * 기본은 dry-run이다. --apply를 붙여야 DB를 바꾸고 web 캐시를 무효화한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/title-repair/apply.ts ../../data/celeb/title-repair/patches/*.json
 *   pnpm exec tsx scripts/celeb/title-repair/apply.ts --apply ../../data/celeb/title-repair/patches/*.json
 */
import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { celebTitleEnIssue, celebTitleKoIssue } from '@feelandnote/shared/constants/celeb-title'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import {
  connectSelfHostedSqlExecutor,
  type ManagementSqlExecutor,
} from '../headline-rewrite/apply'
import { revalidateWebItems } from '../../../src/lib/revalidate-web'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CHUNK = 50
const PAUSE_MS = 1_000

export const UPDATE_TITLES_SQL = `
with desired as (
  select
    input.id::uuid as id,
    input.title,
    input.title_en
  from jsonb_to_recordset($1::jsonb) as input(
    id text,
    title text,
    title_en text
  )
)
update public.celebs as celeb
set
  title = desired.title,
  title_en = desired.title_en
from desired
where celeb.id = desired.id
  and (celeb.title, celeb.title_en)
    is distinct from (desired.title, desired.title_en)
returning celeb.id::text
`.trim()

type PatchEntry = {
  slug?: string
  id?: string
  keep?: boolean
  celeb?: { title?: string; title_en?: string }
}

type Validated = {
  id: string
  slug: string
  nickname: string
  title: string
  title_en: string
  before_title: string | null
  before_title_en: string | null
}

function parsePatchFiles(files: string[]): { entries: PatchEntry[]; kept: PatchEntry[] } {
  const all: PatchEntry[] = []
  for (const file of files) {
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!Array.isArray(rows)) throw new Error(`${file}: 배열이 아니다`)
    for (const row of rows) all.push({ ...row, _file: file } as PatchEntry)
  }
  return { entries: all.filter((e) => !e.keep), kept: all.filter((e) => e.keep) }
}

async function main() {
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const files = argv.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a))
  if (!files.length) throw new Error('패치 JSON 파일을 인자로 준다')

  const { entries, kept } = parsePatchFiles(files)
  console.log(`패치 ${entries.length}건 · 유지 판정 ${kept.length}건 읽음`)

  // 1. 형식 검증
  const errors: string[] = []
  for (const e of entries) {
    const label = (e.slug ?? e.id ?? '?')
    const title = e.celeb?.title
    const titleEn = e.celeb?.title_en
    if (!e.slug && !e.id) errors.push(`${label}: slug/id 없음`)
    if (!title) { errors.push(`${label}: celeb.title 없음`); continue }
    if (!titleEn) { errors.push(`${label}: celeb.title_en 없음`); continue }
    const koIssue = celebTitleKoIssue(title)
    if (koIssue) errors.push(`${label}: ${koIssue} — "${title}"`)
    const enIssue = celebTitleEnIssue(titleEn)
    if (enIssue) errors.push(`${label}: ${enIssue} — "${titleEn}"`)
  }
  if (errors.length) throw new Error(`형식 위반 ${errors.length}건:\n${errors.slice(0, 30).join('\n')}`)

  // 2. slug → DB 행 해석
  const slugs = entries.map((e) => e.slug!)
  const ids = entries.filter((e) => e.id).map((e) => e.id!)
  const bySlug = new Map<string, { id: string; slug: string; nickname: string; title: string | null; title_en: string | null }>()
  for (let i = 0; i < slugs.length; i += 200) {
    const { data, error } = await db
      .from('celebs').select('id,slug,nickname,title,title_en')
      .in('slug', slugs.slice(i, i + 200))
    if (error) throw new Error(error.message)
    for (const r of data ?? []) bySlug.set(r.slug, r)
  }
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db
      .from('celebs').select('id,slug,nickname,title,title_en')
      .in('id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
    for (const r of data ?? []) if (r.slug) bySlug.set(r.slug, r)
  }
  const unresolved = entries.filter((e) => (e.slug && !bySlug.has(e.slug)))
  if (unresolved.length) {
    throw new Error(`DB에 없는 인물: ${unresolved.slice(0, 10).map((e) => e.slug).join(', ')}`)
  }

  const patches: Validated[] = entries.map((e) => {
    const row = bySlug.get(e.slug!)!
    return {
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      title: e.celeb!.title!,
      title_en: e.celeb!.title_en!,
      before_title: row.title,
      before_title_en: row.title_en,
    }
  })

  // 패치 내부 중복 id
  const seenIds = new Set<string>()
  for (const p of patches) {
    if (seenIds.has(p.id)) throw new Error(`패치에 중복 인물: ${p.slug}`)
    seenIds.add(p.id)
  }

  // 3. 중복 수식어 검사 — 패치 밖 DB 전체 + 패치 내부. 공유 역할은 허용이므로 경고로만.
  const patchIds = new Set(patches.map((p) => p.id))
  const existing = new Map<string, string[]>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('celebs').select('id,title').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      if (!r.title) continue
      const owners = existing.get(r.title) ?? []
      owners.push(r.id)
      existing.set(r.title, owners)
    }
    if ((data ?? []).length < 1000) break
  }
  const dupWarnings: string[] = []
  const inPatch = new Map<string, string[]>()
  for (const p of patches) {
    const owners = (existing.get(p.title) ?? []).filter((id) => !patchIds.has(id))
    if (owners.length) dupWarnings.push(`${p.slug} "${p.title}" ← DB에 이미 ${owners.length}명`)
    const l = inPatch.get(p.title) ?? []
    l.push(p.slug)
    inPatch.set(p.title, l)
  }
  for (const [t, l] of inPatch) {
    if (l.length > 1) dupWarnings.push(`패치 내부 중복 "${t}" ← ${l.join(', ')}`)
  }

  const changed = patches.filter((p) => p.before_title !== p.title || p.before_title_en !== p.title_en)
  console.log(`\n검증 통과: 패치 ${patches.length}건 · 실제 값 변화 ${changed.length}건 · 유지 판정 ${kept.length}건`)
  if (dupWarnings.length) {
    console.log(`\n[중복 경고 ${dupWarnings.length}건 — 공유 역할이면 허용, 확인 요]`)
    for (const w of dupWarnings.slice(0, 30)) console.log(`  ${w}`)
  }
  console.log('\n--- 변경 미리보기 (최대 40건) ---')
  for (const p of changed.slice(0, 40)) {
    console.log(`${p.slug}: "${p.before_title}" → "${p.title}" / "${p.before_title_en}" → "${p.title_en}"`)
  }

  if (!apply) {
    console.log('\ndry-run. --apply를 붙이면 반영한다.')
    return
  }

  // 4. 반영 — 한 청크씩 UPDATE → readback 검증
  const exec: ManagementSqlExecutor = connectSelfHostedSqlExecutor()
  const applied: Validated[] = []
  for (let i = 0; i < changed.length; i += CHUNK) {
    const chunk = changed.slice(i, i + CHUNK)
    await exec(UPDATE_TITLES_SQL, [JSON.stringify(
      chunk.map((p) => ({ id: p.id, title: p.title, title_en: p.title_en })),
    )])
    const { data: back, error } = await db
      .from('celebs').select('id,title,title_en')
      .in('id', chunk.map((p) => p.id))
    if (error) throw new Error(`readback 실패: ${error.message}`)
    const backMap = new Map((back ?? []).map((r) => [r.id, r]))
    const mismatch = chunk.filter((p) => {
      const r = backMap.get(p.id)
      return !r || r.title !== p.title || r.title_en !== p.title_en
    })
    if (mismatch.length) {
      throw new Error(`반영 검증 실패: ${mismatch.slice(0, 5).map((p) => p.slug).join(', ')}`)
    }
    applied.push(...chunk)
    console.log(`applied ${Math.min(i + CHUNK, changed.length)}/${changed.length}`)
    if (i + CHUNK < changed.length) await new Promise((r) => setTimeout(r, PAUSE_MS))
  }

  // 5. web 캐시 무효화 — 인물 항목 태그만 (목록은 짧은 수명으로 자연 갱신)
  for (let i = 0; i < applied.length; i += CHUNK) {
    const chunk = applied.slice(i, i + CHUNK)
    await revalidateWebItems(chunk.map((p) => ({ domain: CACHE_TAGS.CELEBS, id: p.slug })))
    console.log(`revalidated ${Math.min(i + CHUNK, applied.length)}/${applied.length}`)
  }

  const ledgerPath = path.resolve(files[0], '../applied.json')
  fs.writeFileSync(ledgerPath, JSON.stringify({
    applied_at: new Date().toISOString(),
    kept,
    applied: applied.map((p) => ({ id: p.id, slug: p.slug, title: p.title, title_en: p.title_en })),
  }, null, 1) + '\n')
  console.log(`\n완료: ${applied.length}건 반영 · kept ${kept.length}건 · 원장 → ${ledgerPath}`)
}

main()
