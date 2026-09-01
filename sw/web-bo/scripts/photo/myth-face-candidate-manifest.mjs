/**
 * 사용자 웹 /explore/myth에 실제 노출되는 인물의 얼굴 재료 후보 작업 명단을 만든다.
 *
 * DB/R2에는 쓰지 않는다. 후보와 출처 기록은 저장소 밖
 * D:\\remotion-assets\\celeb-mythology-face-candidates 에 둔다.
 * 후보 파일은 사용자 승인 전까지 정식 REF가 아니다.
 *
 * 실행: node --env-file=.env scripts/photo/myth-face-candidate-manifest.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const OUTPUT_ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const PAGE_SIZE = 1000
const MYTH_ROOT_SLUG = 'myth-and-fiction'
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function allRows(label, queryPage) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data ?? []).length < PAGE_SIZE) return rows
  }
}

function safeFolder(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, '-')
}

function candidateFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'))
}

function existingManifestBySlug() {
  const file = path.join(OUTPUT_ROOT, 'manifest.json')
  if (!existsSync(file)) return new Map()
  const rows = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(rows)) return new Map()
  return new Map(rows.filter((row) => row?.slug).map((row) => [row.slug, row]))
}

function preservedCandidateDir(row, fallback) {
  if (!row?.candidate_dir || !row?.collection_group) return fallback
  const root = `${path.resolve(OUTPUT_ROOT)}${path.sep}`.toLowerCase()
  const candidateDir = path.resolve(row.candidate_dir)
  return candidateDir.toLowerCase().startsWith(root) ? candidateDir : fallback
}

async function main() {
  const rootResult = await db.from('celeb_tags')
    .select('id')
    .eq('slug', MYTH_ROOT_SLUG)
    .maybeSingle()
  if (rootResult.error) throw new Error(`신화 루트 조회 실패: ${rootResult.error.message}`)
  if (!rootResult.data) throw new Error(`celeb_tags.${MYTH_ROOT_SLUG}를 찾지 못했습니다.`)

  const [traditions, members, allCelebs] = await Promise.all([
    allRows('신화 전통', (from, to) => db.from('celeb_tags')
      .select('id,slug,name,name_en,sort_order')
      .eq('parent_id', rootResult.data.id)
      .order('sort_order')
      .range(from, to)),
    allRows('서비스 신화 인물', (from, to) => db.from('faction_atlas_members')
      .select('tag_id,celeb_id,short_desc,short_desc_en,faction_image_url,sort_order,hidden')
      .eq('hidden', false)
      .order('sort_order')
      .range(from, to)),
    allRows('celebs', (from, to) => db.from('celebs')
      .select('id,slug,nickname,nickname_en,gender,nationality,profession,title,title_en,bio,bio_en,publication_status,celeb_tier,avatar_url,portrait_url,awakened_image_url')
      .order('slug')
      .range(from, to)),
  ])

  const traditionIds = new Set(traditions.map((row) => row.id))
  const serviceMembers = members.filter((row) => row.celeb_id && traditionIds.has(row.tag_id))
  const memberIds = new Set(serviceMembers.map((row) => row.celeb_id))
  const celebById = new Map(allCelebs.filter((row) => memberIds.has(row.id)).map((row) => [row.id, row]))
  const traditionById = new Map(traditions.map((row) => [row.id, row]))
  const previousBySlug = existingManifestBySlug()

  mkdirSync(OUTPUT_ROOT, { recursive: true })
  const manifest = []
  for (const celebId of [...memberIds].sort((a, b) => {
    const left = celebById.get(a)?.slug ?? ''
    const right = celebById.get(b)?.slug ?? ''
    return left.localeCompare(right, 'en')
  })) {
    const celeb = celebById.get(celebId)
    if (!celeb?.slug) continue
    const placements = serviceMembers
      .filter((row) => row.celeb_id === celebId)
      .sort((a, b) => (a.sort_order ?? 10_000) - (b.sort_order ?? 10_000))
    const traditionRows = placements.map((row) => traditionById.get(row.tag_id)).filter(Boolean)
    const primaryTradition = traditionRows[0]
    if (!primaryTradition?.slug) continue

    const previous = previousBySlug.get(celeb.slug)
    const defaultPersonDir = path.join(OUTPUT_ROOT, safeFolder(primaryTradition.slug), safeFolder(celeb.slug))
    const personDir = preservedCandidateDir(previous, defaultPersonDir)
    mkdirSync(personDir, { recursive: true })
    const candidates = candidateFiles(personDir)
    const row = {
      ...celeb,
      gender_label: celeb.gender === true ? 'male' : celeb.gender === false ? 'female' : 'unknown',
      traditions: traditionRows.map((tradition) => ({
        id: tradition.id,
        slug: tradition.slug,
        name: tradition.name,
        name_en: tradition.name_en,
      })),
      primary_tradition: primaryTradition.slug,
      short_desc: placements[0]?.short_desc ?? null,
      short_desc_en: placements[0]?.short_desc_en ?? null,
      service_image_url: placements.find((row) => row.faction_image_url)?.faction_image_url ?? null,
      candidate_dir: personDir,
      candidate_files: candidates,
      candidate_count: candidates.length,
      status: candidates.length > 0 ? 'collected_unapproved' : 'missing',
      ...(previous?.collection_group ? {
        collection_group: previous.collection_group,
        portrait_existed_at_collection_start: previous.portrait_existed_at_collection_start,
        collection_started_at: previous.collection_started_at,
      } : {}),
    }
    manifest.push(row)
    writeFileSync(path.join(personDir, 'person.json'), `${JSON.stringify(row, null, 2)}\n`, 'utf8')
  }

  const byTradition = Map.groupBy(manifest, (row) => row.primary_tradition)
  const byCandidateParent = Map.groupBy(manifest, (row) => path.dirname(row.candidate_dir))
  for (const [traditionDir, rows] of byCandidateParent) {
    mkdirSync(traditionDir, { recursive: true })
    writeFileSync(path.join(traditionDir, 'manifest.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
  }
  const byCollectionGroup = Map.groupBy(
    manifest.filter((row) => row.collection_group),
    (row) => row.collection_group,
  )
  for (const rows of byCollectionGroup.values()) {
    const groupDir = path.dirname(path.dirname(rows[0].candidate_dir))
    writeFileSync(path.join(groupDir, 'manifest.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
  }
  writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  const summary = {
    generated_at: new Date().toISOString(),
    service_target_count: manifest.length,
    male: manifest.filter((row) => row.gender === true).length,
    female: manifest.filter((row) => row.gender === false).length,
    gender_unknown: manifest.filter((row) => row.gender == null).length,
    candidates_collected: manifest.filter((row) => row.candidate_count > 0).length,
    candidates_missing: manifest.filter((row) => row.candidate_count === 0).length,
    total_candidate_files: manifest.reduce((sum, row) => sum + row.candidate_count, 0),
    existing_avatar: manifest.filter((row) => row.avatar_url).length,
    existing_portrait: manifest.filter((row) => row.portrait_url).length,
    existing_awakened: manifest.filter((row) => row.awakened_image_url).length,
    ...(byCollectionGroup.size > 0 ? {
      groups: Object.fromEntries([...byCollectionGroup.entries()].map(([group, rows]) => [group, {
        people: rows.length,
        with_candidates: rows.filter((row) => row.candidate_count > 0).length,
        without_candidates: rows.filter((row) => row.candidate_count === 0).length,
        candidate_files: rows.reduce((sum, row) => sum + row.candidate_count, 0),
      }])),
    } : {}),
    traditions: Object.fromEntries([...byTradition.entries()].map(([slug, rows]) => [slug, {
      targets: rows.length,
      collected: rows.filter((row) => row.candidate_count > 0).length,
      missing: rows.filter((row) => row.candidate_count === 0).length,
      candidate_files: rows.reduce((sum, row) => sum + row.candidate_count, 0),
    }])),
  }
  writeFileSync(path.join(OUTPUT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
