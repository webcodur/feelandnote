/**
 * 셀럽 기본 정보(basic) 결손 대상 덤프 + 조건부 반영 도구.
 *
 * 덤프(읽기 전용):
 *   pnpm exec tsx scripts/celeb-basic-fill.ts dump --need title_en --limit 20 --offset 0
 *   pnpm exec tsx scripts/celeb-basic-fill.ts dump --need title --limit 20
 *   pnpm exec tsx scripts/celeb-basic-fill.ts dump --slugs a,b,c
 *
 * 반영(기본 dry-run. --apply 로만 저장):
 *   pnpm exec tsx scripts/celeb-basic-fill.ts apply --file batch.json
 *   pnpm exec tsx scripts/celeb-basic-fill.ts apply --file batch.json --apply
 *
 * batch.json 형식:
 *   [{ "slug": "yuan-shao", "title": "...", "bio": "...", "title_en": "...", "bio_en": "...",
 *      "profession": "commander", "nationality": "CN", "birth_date": "-154", "death_date": "202",
 *      "gender": true }]
 *
 * 안전 규칙
 *  - 빈칸 채우기 전용: 대상 필드가 이미 비어있지 않으면 그 필드는 건너뛴다(덮어쓰기 금지).
 *  - profile_type='CELEB' 이 아닌 행은 거부한다.
 *  - 기존값과 동일하면 SKIPPED (celeb-pipeline §업데이트 가드).
 *  - 반영 후 DB를 다시 읽어 왕복 검증한다.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const PAGE = 1000
const TEXT_FIELDS = [
  'nickname',
  'nickname_en',
  'title',
  'title_en',
  'bio',
  'bio_en',
  'profession',
  'nationality',
  'birth_date',
  'death_date',
] as const
type TextField = (typeof TEXT_FIELDS)[number]

// 등록용 원본 매니페스트가 기본정보 배치에 함께 보관할 수 있는 운영 메타데이터.
// DB 컬럼으로 저장하지 않고, 이름·slug 대조용으로만 보존한다.
const BATCH_METADATA_FIELDS = new Set(['expected_slug', 'slug', 'groups', 'primary_group'])

const SELECT =
  'id, slug, nickname, nickname_en, title, title_en, bio, bio_en, profession, nationality, birth_date, death_date, gender, status, celeb_tier, profile_type'

type Row = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  title: string | null
  title_en: string | null
  bio: string | null
  bio_en: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  gender: boolean | null
  status: string | null
  celeb_tier: string | null
  profile_type: string | null
}

const blank = (v: unknown) => v === null || v === undefined || String(v).trim().length === 0

async function allCelebs(): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('profiles')
      .select(SELECT)
      .eq('profile_type', 'CELEB')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`profiles 조회 실패: ${error.message}`)
    const rows = (data ?? []) as Row[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function dump() {
  const rows = await allCelebs()
  const slugs = arg('slugs')?.split(',').map((s) => s.trim()).filter(Boolean)
  const need = arg('need') as TextField | undefined
  const tier = arg('tier')

  let target = rows
  if (slugs) {
    target = slugs.map((s) => {
      const r = rows.find((x) => x.slug === s)
      if (!r) throw new Error(`slug 없음: ${s}`)
      return r
    })
  } else {
    if (need) target = target.filter((r) => blank(r[need]))
    if (tier) target = target.filter((r) => r.celeb_tier === tier)
    target.sort((a, b) => (a.slug ?? '').localeCompare(b.slug ?? ''))
    const offset = Number(arg('offset') ?? 0)
    const limit = Number(arg('limit') ?? 20)
    target = target.slice(offset, offset + limit)
  }

  console.log(
    JSON.stringify(
      {
        count: target.length,
        rows: target.map((r) => ({
          slug: r.slug,
          nickname: r.nickname,
          nickname_en: r.nickname_en,
          tier: r.celeb_tier,
          status: r.status,
          profession: r.profession,
          nationality: r.nationality,
          birth_date: r.birth_date,
          death_date: r.death_date,
          gender: r.gender,
          title: r.title,
          title_en: r.title_en,
          bio: r.bio,
          bio_en: r.bio_en,
          blanks: TEXT_FIELDS.filter((f) => blank(r[f])),
        })),
      },
      null,
      2,
    ),
  )
}

type Patch = { slug: string } & Partial<Record<TextField, string>> & { gender?: boolean | null }

async function apply() {
  const file = arg('file')
  if (!file) throw new Error('--file 필요')
  const doWrite = process.argv.includes('--apply')
  const patches = JSON.parse(await readFile(path.resolve(file), 'utf8')) as Patch[]
  if (!Array.isArray(patches) || patches.length === 0) throw new Error('배치가 비었다')

  const rows = await allCelebs()
  const bySlug = new Map(rows.map((r) => [r.slug ?? '', r]))

  let updated = 0
  let skipped = 0
  let failed = 0
  const report: string[] = []

  for (const patch of patches) {
    const cur = bySlug.get(patch.slug)
    if (!cur) {
      failed++
      report.push(`FAILED ${patch.slug} — CELEB 프로필 없음`)
      continue
    }

    const payload: Record<string, string | boolean | null> = {}
    const skippedFields: string[] = []
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'slug') continue
      if (BATCH_METADATA_FIELDS.has(k)) continue
      if (k === 'gender') {
        if (cur.gender === null && v !== undefined) payload.gender = v as boolean
        else if (cur.gender !== null) skippedFields.push('gender(기존값 보존)')
        continue
      }
      if (!TEXT_FIELDS.includes(k as TextField)) {
        failed++
        report.push(`FAILED ${patch.slug} — 허용되지 않은 필드 ${k}`)
        continue
      }
      const before = cur[k as TextField]
      if (!blank(before)) {
        skippedFields.push(`${k}(기존값 보존: ${String(before).slice(0, 20)})`)
        continue
      }
      if (blank(v)) {
        skippedFields.push(`${k}(신규값 공란)`)
        continue
      }
      payload[k] = String(v)
    }

    if (Object.keys(payload).length === 0) {
      skipped++
      report.push(`SKIPPED ${patch.slug} — 반영할 필드 없음 ${skippedFields.join(' ')}`)
      continue
    }

    const fields = Object.keys(payload).join(',')
    if (!doWrite) {
      updated++
      report.push(`DRY  ${patch.slug} ← ${fields}${skippedFields.length ? ` | 보존 ${skippedFields.join(' ')}` : ''}`)
      continue
    }

    const { error } = await db.from('profiles').update(payload).eq('id', cur.id).eq('profile_type', 'CELEB')
    if (error) {
      failed++
      report.push(`FAILED ${patch.slug} — ${error.message}`)
      continue
    }

    const { data: after, error: reErr } = await db.from('profiles').select(SELECT).eq('id', cur.id).single()
    if (reErr || !after) {
      failed++
      report.push(`FAILED ${patch.slug} — 왕복 검증 조회 실패 ${reErr?.message ?? ''}`)
      continue
    }
    const bad = Object.entries(payload).filter(([k, v]) => String((after as Row)[k as TextField] ?? '') !== String(v))
    if (bad.length > 0) {
      failed++
      report.push(`FAILED ${patch.slug} — 왕복 불일치 ${bad.map(([k]) => k).join(',')}`)
      continue
    }
    updated++
    report.push(`OK   ${patch.slug} ← ${fields}${skippedFields.length ? ` | 보존 ${skippedFields.join(' ')}` : ''}`)
  }

  for (const line of report) console.log(line)
  console.log(`\n## 배치 결과 (${doWrite ? 'APPLY' : 'DRY-RUN'})`)
  console.log(`- ${doWrite ? 'UPDATED' : 'WOULD UPDATE'}: ${updated}건`)
  console.log(`- SKIPPED: ${skipped}건`)
  console.log(`- FAILED: ${failed}건`)
  if (failed > 0) process.exit(1)
}

const cmd = process.argv[2]
const run = cmd === 'dump' ? dump : cmd === 'apply' ? apply : null
if (!run) {
  console.error('사용법: dump | apply')
  process.exit(1)
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
