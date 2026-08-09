/*
  제작에 이미 있는 인물의 수동 도감 행을 제작 원천으로 흡수한다.

  수동 배정과 faction_people.celeb_id가 이미 겹칠 때, 수동 상세 소개·개인샷·숨김을
  faction_people.web_* 칸으로 옮기고 제작 인물을 활성화한다. 한줄 직함은 제작 lines[0]을 쓴다. 원본은 26.08.03
  전체 백업에서 읽으므로 수동 행이 이미 삭제된 복구 상황에도 쓸 수 있다.

  실행:
    pnpm exec tsx scripts/adopt-atlas-backup-into-production.ts \
      --celebs=thomas-wolf,julien-chaumond \
      --tag=hugging-face --expected=2 [--dry]
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

interface BackupAssignment {
  id: string
  tag_id: string
  celeb_id: string
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
  quote: string | null
  quote_en: string | null
  faction_image_url: string | null
  hidden: boolean
}

async function main() {
  const dry = process.argv.includes('--dry')
  const tagSlug = process.argv.find(arg => arg.startsWith('--tag='))?.split('=')[1]
  const celebSlugs = process.argv.find(arg => arg.startsWith('--celebs='))
    ?.split('=')[1]
    ?.split(',')
    .filter(Boolean) ?? []
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
    .from('celeb_tags')
    .select('id, slug, name')
    .eq('slug', tagSlug)
    .single()
  if (tagError || !tag) throw new Error(`태그 조회 실패: ${tagError?.message ?? tagSlug}`)

  const backupPath = path.join(
    __dirname, '..', '..', '..', '_backup',
    'celeb-tag-assignments-full-2026-08-03.json',
  )
  const backupText = readFileSync(backupPath, 'utf8').replace(/^\uFEFF/, '')
  const backup = JSON.parse(backupText) as BackupAssignment[]
  const candidates = backup.filter(row => row.tag_id === tag.id)
  const { data: candidateProfiles, error: candidateProfileError } = await db
    .from('celebs')
    .select('id, nickname, slug')
    .in('id', candidates.map(row => row.celeb_id))
  if (candidateProfileError) {
    throw new Error(`백업 프로필 조회 실패: ${candidateProfileError.message}`)
  }
  const selectedIds = new Set(
    (candidateProfiles ?? [])
      .filter(row => !celebSlugs.length || celebSlugs.includes(row.slug as string))
      .map(row => row.id as string),
  )
  const targets = candidates.filter(row => selectedIds.has(row.celeb_id))
  if (!targets.length) throw new Error(`${tagSlug}: 전체 백업에 수동 행이 없다`)
  if (expected !== null && targets.length !== expected) {
    throw new Error(`${tagSlug}: 백업 ${targets.length}건, 예상 ${expected}건`)
  }

  const { data: groups, error: groupError } = await db
    .from('faction_groups').select('id').eq('tag_id', tag.id)
  if (groupError) throw new Error(`세력 조회 실패: ${groupError.message}`)
  const groupIds = (groups ?? []).map(row => row.id as string)
  if (!groupIds.length) throw new Error(`${tagSlug}: 연결된 제작 세력이 없다`)

  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters').select('id').in('group_id', groupIds)
  if (clusterError) throw new Error(`묶음 조회 실패: ${clusterError.message}`)
  const clusterIds = (clusters ?? []).map(row => row.id as string)
  if (!clusterIds.length) throw new Error(`${tagSlug}: 제작 묶음이 없다`)

  const celebIds = targets.map(row => row.celeb_id)
  const { data: people, error: peopleError } = await db.from('faction_people')
    .select('id, celeb_id, quote, quote_en, disabled')
    .in('cluster_id', clusterIds)
    .in('celeb_id', celebIds)
  if (peopleError) throw new Error(`제작 인물 조회 실패: ${peopleError.message}`)
  const nicknameById = new Map(
    (candidateProfiles ?? []).map(row => [row.id as string, row.nickname as string]),
  )

  const resolved = targets.map(target => {
    const matches = (people ?? []).filter(row => row.celeb_id === target.celeb_id)
    const nickname = nicknameById.get(target.celeb_id) ?? target.celeb_id
    if (matches.length !== 1) {
      throw new Error(`${nickname}: 제작 자리 ${matches.length}건(1건이어야 함)`)
    }
    const person = matches[0]
    if (person.quote !== target.quote || person.quote_en !== target.quote_en) {
      throw new Error(`${nickname}: 제작 대사와 백업 대사가 달라 자동 흡수 중단`)
    }
    return { target, person, nickname }
  })

  console.log(`${tag.name} — 기존 제작 자리 ${resolved.length}명을 수동 백업값으로 복원·활성화`)
  for (const row of resolved) console.log(`  · ${row.nickname}`)
  if (dry) {
    console.log('(dry-run — 저장하지 않았다)')
    return
  }

  for (const { target, person, nickname } of resolved) {
    const { error } = await db.from('faction_people').update({
      disabled: false,
      web_long_desc: target.long_desc,
      web_long_desc_en: target.long_desc_en,
      web_image_url: target.faction_image_url,
      web_hidden: target.hidden === true,
    }).eq('id', person.id)
    if (error) throw new Error(`${nickname}: 제작 행 갱신 실패: ${error.message}`)
  }

  const { error: deleteError } = await db
    .from('celeb_tag_assignments').delete().in('id', targets.map(row => row.id))
  if (deleteError) throw new Error(`수동 행 삭제 실패: ${deleteError.message}`)

  const { data: atlas, error: atlasError } = await db
    .from('faction_atlas_members')
    .select('celeb_id, source, assignment_id, short_desc, short_desc_en, long_desc, long_desc_en, faction_image_url, hidden')
    .eq('tag_id', tag.id)
    .in('celeb_id', celebIds)
  if (atlasError) throw new Error(`도감 뷰 검증 실패: ${atlasError.message}`)

  for (const { target, nickname } of resolved) {
    const rows = (atlas ?? []).filter(row => row.celeb_id === target.celeb_id)
    if (rows.length !== 1) throw new Error(`${nickname}: 도감 뷰 ${rows.length}건`)
    const row = rows[0]
    const matches = row.source === 'production'
      && row.assignment_id === null
      && row.long_desc === target.long_desc
      && row.long_desc_en === target.long_desc_en
      && row.faction_image_url === target.faction_image_url
      && row.hidden === (target.hidden === true)
    if (!matches) throw new Error(`${nickname}: 백업값과 도감 뷰가 일치하지 않는다`)
  }
  console.log(`검증 완료 — ${resolved.length}명 source=production, 상세·이미지·숨김 필드 일치`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
