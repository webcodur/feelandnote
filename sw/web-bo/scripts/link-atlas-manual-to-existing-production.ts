/*
  수동 도감 인물과 이미 존재하는 제작 인물의 연결 키가 다른 경우를 정규화한다.

  제작 인물을 새로 만들지 않고 기존 배치의 slug를 프로필 정본으로 바꾸고 celeb_id를 연결한다.
  수동 상세 소개·개인샷·숨김은 모든 해당 제작 배치의 web_* 칸으로 옮긴 뒤 수동 행을 지운다.
  한줄 직함은 옮기지 않고 제작 lines[0]을 그대로 쓴다.

  실행 예:
    pnpm exec tsx scripts/link-atlas-manual-to-existing-production.ts \
      --tag=renaissance-maestros --map=raphael-sanzio:raphael --expected=1 [--dry]
*/
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(__dirname, '..', file)
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
    }
  }
}
loadEnv()

interface ManualAssignment {
  id: string
  celeb_id: string
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
  faction_image_url: string | null
  hidden: boolean
}

function parseMap(raw: string | undefined): Map<string, string> {
  if (!raw) throw new Error('--map=<프로필slug:제작slug,...>가 필요하다')
  const out = new Map<string, string>()
  for (const pair of raw.split(',')) {
    const [profileSlug, productionSlug, extra] = pair.split(':')
    if (!profileSlug || !productionSlug || extra) throw new Error(`잘못된 매핑: ${pair}`)
    out.set(profileSlug, productionSlug)
  }
  return out
}

async function main() {
  const dry = process.argv.includes('--dry')
  const tagSlug = process.argv.find(arg => arg.startsWith('--tag='))?.split('=')[1]
  const mapping = parseMap(process.argv.find(arg => arg.startsWith('--map='))?.split('=')[1])
  const expectedArg = process.argv.find(arg => arg.startsWith('--expected='))?.split('=')[1]
  const expected = expectedArg ? Number(expectedArg) : null
  if (!tagSlug) throw new Error('--tag=<celeb_tags.slug>가 필요하다')
  if (expected !== null && (!Number.isInteger(expected) || expected < 1)) {
    throw new Error('--expected는 1 이상의 정수여야 한다')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 누락')
  const db = createClient(url, key)

  const { data: tag, error: tagError } = await db
    .from('celeb_tags').select('id, name').eq('slug', tagSlug).single()
  if (tagError || !tag) throw new Error(`태그 조회 실패: ${tagError?.message ?? tagSlug}`)

  const { data: assignmentRows, error: assignmentError } = await db
    .from('celeb_tag_assignments')
    .select('id, celeb_id, short_desc, long_desc, short_desc_en, long_desc_en, faction_image_url, hidden')
    .eq('tag_id', tag.id)
  if (assignmentError) throw new Error(`수동 행 조회 실패: ${assignmentError.message}`)
  const assignments = (assignmentRows ?? []) as ManualAssignment[]
  const celebIds = assignments.map(row => row.celeb_id)
  const { data: profiles, error: profileError } = await db
    .from('profiles').select('id, nickname, slug').in('id', celebIds)
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)
  const profileById = new Map((profiles ?? []).map(row => [row.id as string, row]))
  const targets = assignments.filter(row => {
    const profileSlug = profileById.get(row.celeb_id)?.slug as string | undefined
    return !!profileSlug && mapping.has(profileSlug)
  })
  if (expected !== null && targets.length !== expected) {
    throw new Error(`${tagSlug}: 대상 ${targets.length}건, 예상 ${expected}건`)
  }
  if (!targets.length) throw new Error(`${tagSlug}: 매핑에 맞는 수동 행이 없다`)

  const backupPath = path.join(
    __dirname, '..', '..', '..', '_backup',
    'celeb-tag-assignments-full-2026-08-03.json',
  )
  const backupText = readFileSync(backupPath, 'utf8').replace(/^\uFEFF/, '')
  const backup = JSON.parse(backupText) as Array<{ id: string }>
  const backupIds = new Set(backup.map(row => row.id))
  for (const target of targets) {
    if (!backupIds.has(target.id)) throw new Error(`전체 백업에 수동 행 없음: ${target.id}`)
  }

  const { data: groups, error: groupError } = await db
    .from('faction_groups').select('id').eq('tag_id', tag.id)
  if (groupError) throw new Error(`세력 조회 실패: ${groupError.message}`)
  const groupIds = (groups ?? []).map(row => row.id as string)
  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters').select('id').in('group_id', groupIds)
  if (clusterError) throw new Error(`묶음 조회 실패: ${clusterError.message}`)
  const clusterIds = (clusters ?? []).map(row => row.id as string)
  const productionSlugs = [...new Set(mapping.values())]
  const { data: people, error: peopleError } = await db
    .from('faction_people')
    .select('id, name, slug, celeb_id')
    .in('cluster_id', clusterIds)
    .in('slug', productionSlugs)
  if (peopleError) throw new Error(`제작 인물 조회 실패: ${peopleError.message}`)

  const resolved = targets.map(target => {
    const profile = profileById.get(target.celeb_id)
    const profileSlug = profile?.slug as string
    const productionSlug = mapping.get(profileSlug)!
    const matches = (people ?? []).filter(row => row.slug === productionSlug)
    const nickname = (profile?.nickname as string) ?? profileSlug
    if (!matches.length) throw new Error(`${nickname}: 제작 slug ${productionSlug}를 찾지 못함`)
    for (const person of matches) {
      if (person.celeb_id && person.celeb_id !== target.celeb_id) {
        throw new Error(`${nickname}: 제작 자리가 다른 셀럽에 연결돼 있음`)
      }
    }
    return { target, profileSlug, productionSlug, matches, nickname }
  })

  console.log(`${tag.name} — 기존 제작 자리 연결 정규화 ${resolved.length}명`)
  for (const row of resolved) {
    console.log(`  · ${row.nickname}: ${row.productionSlug} → ${row.profileSlug} (${row.matches.length}자리)`)
  }
  if (dry) {
    console.log('(dry-run — 저장하지 않았다)')
    return
  }

  for (const { target, profileSlug, matches, nickname } of resolved) {
    for (const person of matches) {
      const update: Record<string, unknown> = {
        celeb_id: target.celeb_id,
        slug: profileSlug,
        web_hidden: target.hidden === true,
      }
      if (target.long_desc !== null) update.web_long_desc = target.long_desc
      if (target.long_desc_en !== null) update.web_long_desc_en = target.long_desc_en
      if (target.faction_image_url !== null) update.web_image_url = target.faction_image_url
      const { error } = await db.from('faction_people').update(update).eq('id', person.id)
      if (error) throw new Error(`${nickname}: 제작 자리 갱신 실패: ${error.message}`)
    }
  }

  const { error: deleteError } = await db
    .from('celeb_tag_assignments').delete().in('id', targets.map(row => row.id))
  if (deleteError) throw new Error(`수동 행 삭제 실패: ${deleteError.message}`)

  const { data: atlas, error: atlasError } = await db
    .from('faction_atlas_members')
    .select('celeb_id, source, assignment_id, short_desc, short_desc_en, long_desc, long_desc_en, faction_image_url, hidden')
    .eq('tag_id', tag.id)
    .in('celeb_id', targets.map(row => row.celeb_id))
  if (atlasError) throw new Error(`도감 뷰 검증 실패: ${atlasError.message}`)
  for (const { target, nickname } of resolved) {
    const rows = (atlas ?? []).filter(row => row.celeb_id === target.celeb_id)
    if (rows.length !== 1) throw new Error(`${nickname}: 도감 뷰 ${rows.length}건`)
    const row = rows[0]
    const matches = row.source === 'production'
      && row.assignment_id === null
      && row.long_desc === target.long_desc
      && (target.long_desc_en === null || row.long_desc_en === target.long_desc_en)
      && (target.faction_image_url === null || row.faction_image_url === target.faction_image_url)
      && row.hidden === (target.hidden === true)
    if (!matches) throw new Error(`${nickname}: 수동 값과 도감 뷰가 일치하지 않는다`)
  }
  console.log(`검증 완료 — ${resolved.length}명 source=production, 수동 행 제거`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
