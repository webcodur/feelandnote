/**
 * myth-and-fiction 하위 전체 도감 멤버 가운데 celebs.avatar_url이 NULL인 현재 대상을 저장한다.
 * hidden 여부는 대상 제외 조건으로 쓰지 않는다. DB에는 쓰지 않는다.
 *
 * 실행: node --env-file=.env scripts/photo/snapshot-myth-avatar-null-targets.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const OUTPUT_ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const OUTPUT_PATH = path.join(OUTPUT_ROOT, 'avatar-null-targets.json')
const ROOT_SLUG = 'myth-and-fiction'
const PAGE_SIZE = 1000

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

function descendantTagIds(tags, rootId) {
  const childrenByParent = Map.groupBy(
    tags.filter((tag) => tag.parent_id),
    (tag) => tag.parent_id,
  )
  const descendants = []
  const queue = [...(childrenByParent.get(rootId) ?? [])]
  while (queue.length > 0) {
    const tag = queue.shift()
    descendants.push(tag)
    queue.push(...(childrenByParent.get(tag.id) ?? []))
  }
  return descendants
}

async function main() {
  const [tags, members, celebs] = await Promise.all([
    allRows('celeb_tags', (from, to) => db.from('celeb_tags')
      .select('id,slug,name,name_en,parent_id,sort_order')
      .order('sort_order')
      .range(from, to)),
    allRows('faction_atlas_members', (from, to) => db.from('faction_atlas_members')
      .select('tag_id,celeb_id,short_desc,short_desc_en,faction_image_url,sort_order,hidden')
      .order('sort_order')
      .range(from, to)),
    allRows('celebs', (from, to) => db.from('celebs')
      .select('id,slug,nickname,nickname_en,gender,nationality,profession,title,title_en,bio,bio_en,publication_status,celeb_tier,avatar_url')
      .order('slug')
      .range(from, to)),
  ])

  const root = tags.find((tag) => tag.slug === ROOT_SLUG)
  if (!root) throw new Error(`celeb_tags.${ROOT_SLUG}를 찾지 못했습니다.`)
  const traditions = descendantTagIds(tags, root.id)
  const traditionIds = new Set(traditions.map((tag) => tag.id))
  const traditionById = new Map(traditions.map((tag) => [tag.id, tag]))
  const mythMembers = members.filter((row) => row.celeb_id && traditionIds.has(row.tag_id))
  const memberIds = new Set(mythMembers.map((row) => row.celeb_id))
  const celebById = new Map(celebs.filter((row) => memberIds.has(row.id)).map((row) => [row.id, row]))

  const people = [...memberIds].map((celebId) => {
    const celeb = celebById.get(celebId)
    if (!celeb) throw new Error(`도감 멤버 celeb가 없습니다: ${celebId}`)
    const placements = mythMembers
      .filter((row) => row.celeb_id === celebId)
      .sort((left, right) => (left.sort_order ?? 10_000) - (right.sort_order ?? 10_000))
    return {
      ...celeb,
      gender_label: celeb.gender === true ? 'male' : celeb.gender === false ? 'female' : 'unknown',
      all_memberships_hidden: placements.every((row) => row.hidden === true),
      any_membership_visible: placements.some((row) => row.hidden === false),
      traditions: placements.map((row) => {
        const tradition = traditionById.get(row.tag_id)
        return {
          id: tradition?.id ?? row.tag_id,
          slug: tradition?.slug ?? null,
          name: tradition?.name ?? null,
          name_en: tradition?.name_en ?? null,
          hidden: row.hidden,
          sort_order: row.sort_order,
          short_desc: row.short_desc,
          short_desc_en: row.short_desc_en,
          faction_image_url: row.faction_image_url,
        }
      }),
    }
  })

  const targets = people
    .filter((row) => row.avatar_url === null)
    .sort((left, right) => {
      const leftTradition = left.traditions[0]?.slug ?? ''
      const rightTradition = right.traditions[0]?.slug ?? ''
      return leftTradition.localeCompare(rightTradition, 'en') || left.slug.localeCompare(right.slug, 'en')
    })
  const existing = people.filter((row) => row.avatar_url !== null)
  const output = {
    generated_at: new Date().toISOString(),
    criterion: 'celebs.avatar_url IS NULL; faction_atlas_members.hidden is not an exclusion filter',
    myth_root: { id: root.id, slug: root.slug },
    tradition_count: traditions.length,
    myth_unique_people: people.length,
    avatar_null_count: targets.length,
    avatar_present_count: existing.length,
    avatar_null_visible_memberships: targets.filter((row) => row.any_membership_visible).length,
    avatar_null_hidden_only_memberships: targets.filter((row) => row.all_memberships_hidden).length,
    targets,
  }
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    output: OUTPUT_PATH,
    tradition_count: output.tradition_count,
    myth_unique_people: output.myth_unique_people,
    avatar_null_count: output.avatar_null_count,
    avatar_present_count: output.avatar_present_count,
    avatar_null_visible_memberships: output.avatar_null_visible_memberships,
    avatar_null_hidden_only_memberships: output.avatar_null_hidden_only_memberships,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
