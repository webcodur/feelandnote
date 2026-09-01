/**
 * 아바타가 있는 신화·이야기 인물의 대표 사진·각성 이미지 작업 명단과 로컬 얼굴 REF를 만든다.
 *
 * DB/R2에는 쓰지 않는다. 결과는 저장소 밖 D:\\remotion-assets\\celeb-mythology-batch에 두며,
 * 기존 REF가 있으면 덮어쓰지 않는다.
 *
 * 실행: node --env-file=.env scripts/photo/myth-image-batch-manifest.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const OUTPUT_ROOT = 'D:\\remotion-assets\\celeb-mythology-batch'
const PAGE_SIZE = 1000
const MYTH_ROOT_SLUG = 'myth-and-fiction'
// 운영 태그 누락이 확인된 신화 신. 일반 fiction 전체를 끌어오지 않고 이 둘만 보완한다.
const FORCED_MYTH_SLUGS = new Set(['brahma', 'shiva'])

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

async function downloadIfMissing(sourceUrl, target) {
  if (existsSync(target)) return false
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${sourceUrl} 다운로드 실패: HTTP ${response.status}`)
  writeFileSync(target, Buffer.from(await response.arrayBuffer()))
  return true
}

async function mapConcurrent(items, concurrency, task) {
  let cursor = 0
  const results = new Array(items.length)
  async function worker() {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await task(items[index])
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

async function main() {
  const [allCelebs, tags, atlasMembers, people, clusters, groups, episodes] = await Promise.all([
    allRows('celebs', (from, to) => db.from('celebs')
      .select('id,slug,nickname,nickname_en,publication_status,avatar_url,portrait_url,awakened_image_url')
      .not('avatar_url', 'is', null)
      .order('slug')
      .range(from, to)),
    allRows('celeb_tags', (from, to) => db.from('celeb_tags')
      .select('id,slug,parent_id')
      .order('id')
      .range(from, to)),
    allRows('faction_atlas_members', (from, to) => db.from('faction_atlas_members')
      .select('tag_id,celeb_id')
      .order('tag_id')
      .order('celeb_id')
      .range(from, to)),
    allRows('faction_people', (from, to) => db.from('faction_people')
      .select('id,cluster_id,slug,celeb_id')
      .eq('is_person', true)
      .eq('mythical', true)
      .order('id')
      .range(from, to)),
    allRows('faction_clusters', (from, to) => db.from('faction_clusters')
      .select('id,group_id')
      .order('id')
      .range(from, to)),
    allRows('faction_groups', (from, to) => db.from('faction_groups')
      .select('id,episode_id')
      .order('id')
      .range(from, to)),
    allRows('faction_episodes', (from, to) => db.from('faction_episodes')
      .select('id,folder')
      .order('id')
      .range(from, to)),
  ])

  const mythRoot = tags.find((row) => row.slug === MYTH_ROOT_SLUG)
  if (!mythRoot) throw new Error(`celeb_tags.${MYTH_ROOT_SLUG}를 찾지 못했습니다.`)
  const mythTagIds = new Set([mythRoot.id])
  for (;;) {
    const before = mythTagIds.size
    for (const tag of tags) {
      if (tag.parent_id && mythTagIds.has(tag.parent_id)) mythTagIds.add(tag.id)
    }
    if (mythTagIds.size === before) break
  }
  const mythCelebIds = new Set(
    atlasMembers.filter((row) => mythTagIds.has(row.tag_id)).map((row) => row.celeb_id),
  )
  const celebs = allCelebs.filter((celeb) =>
    mythCelebIds.has(celeb.id) || FORCED_MYTH_SLUGS.has(celeb.slug),
  )

  const clusterById = new Map(clusters.map((row) => [row.id, row]))
  const groupById = new Map(groups.map((row) => [row.id, row]))
  const episodeById = new Map(episodes.map((row) => [row.id, row]))
  const episodesByCeleb = new Map()

  for (const person of people) {
    if (!person.celeb_id) continue
    const cluster = clusterById.get(person.cluster_id)
    const group = cluster ? groupById.get(cluster.group_id) : null
    const episode = group ? episodeById.get(group.episode_id) : null
    if (!episode?.folder) continue
    const folders = episodesByCeleb.get(person.celeb_id) ?? new Set()
    folders.add(episode.folder)
    episodesByCeleb.set(person.celeb_id, folders)
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true })
  const manifest = celebs.map((celeb) => {
    const factionEpisodes = [...(episodesByCeleb.get(celeb.id) ?? [])].sort()
    const primaryGroup = factionEpisodes[0] ?? 'unplaced-fiction'
    const groupRoot = path.join(OUTPUT_ROOT, safeFolder(primaryGroup))
    const characterDir = path.join(groupRoot, 'characters', celeb.slug)
    const reviewDir = path.join(groupRoot, '_review')
    const backupDir = path.join(groupRoot, '_backup')
    for (const dir of [characterDir, reviewDir, backupDir]) {
      mkdirSync(dir, { recursive: true })
    }
    return {
      ...celeb,
      faction_episodes: factionEpisodes,
      primary_group: primaryGroup,
      character_dir: characterDir,
      ref_path: path.join(characterDir, '01-ref.webp'),
      portrait_reference_path: celeb.portrait_url
        ? path.join(characterDir, '02-portrait-current.webp')
        : null,
      portrait_candidate_path: path.join(characterDir, '02-portrait-candidate.png'),
      awakened_reference_path: celeb.awakened_image_url
        ? path.join(characterDir, '03-awakened-current.webp')
        : null,
      awakened_candidate_path: path.join(characterDir, '03-awakened-candidate.png'),
      needs_portrait: !celeb.portrait_url,
      needs_awakened: !celeb.awakened_image_url,
    }
  })

  const refResults = await mapConcurrent(manifest, 8, async (row) => {
    try {
      const downloaded = await downloadIfMissing(row.avatar_url, row.ref_path)
      return { slug: row.slug, downloaded }
    } catch (error) {
      return { slug: row.slug, downloaded: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  const downloaded = refResults.filter((row) => row.downloaded).length
  const refFailures = refResults.filter((row) => row.error)
  const portraitResults = await mapConcurrent(
    manifest.filter((row) => row.portrait_url && row.portrait_reference_path),
    8,
    async (row) => {
      try {
        const downloaded = await downloadIfMissing(row.portrait_url, row.portrait_reference_path)
        return { slug: row.slug, downloaded }
      } catch (error) {
        return { slug: row.slug, downloaded: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  )
  const awakenedResults = await mapConcurrent(
    manifest.filter((row) => row.awakened_image_url && row.awakened_reference_path),
    8,
    async (row) => {
      try {
        const downloaded = await downloadIfMissing(row.awakened_image_url, row.awakened_reference_path)
        return { slug: row.slug, downloaded }
      } catch (error) {
        return { slug: row.slug, downloaded: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  )

  const byGroup = Map.groupBy(manifest, (row) => row.primary_group)
  for (const [group, rows] of byGroup) {
    const target = path.join(OUTPUT_ROOT, safeFolder(group), 'manifest.json')
    writeFileSync(target, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
  }
  writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  const summary = {
    generated_at: new Date().toISOString(),
    target_count: manifest.length,
    portrait_present: manifest.filter((row) => !row.needs_portrait).length,
    portrait_missing: manifest.filter((row) => row.needs_portrait).length,
    awakened_present: manifest.filter((row) => !row.needs_awakened).length,
    awakened_missing: manifest.filter((row) => row.needs_awakened).length,
    refs_downloaded_now: downloaded,
    ref_failures: refFailures,
    portraits_downloaded_now: portraitResults.filter((row) => row.downloaded).length,
    portrait_download_failures: portraitResults.filter((row) => row.error),
    awakened_downloaded_now: awakenedResults.filter((row) => row.downloaded).length,
    awakened_download_failures: awakenedResults.filter((row) => row.error),
    groups: Object.fromEntries([...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, rows]) => [group, {
        targets: rows.length,
        portrait_missing: rows.filter((row) => row.needs_portrait).length,
        awakened_missing: rows.filter((row) => row.needs_awakened).length,
      }])),
  }
  writeFileSync(path.join(OUTPUT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
