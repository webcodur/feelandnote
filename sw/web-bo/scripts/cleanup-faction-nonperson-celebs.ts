/**
 * 2026-08-03 잘못 생성된 팩션 비인물 CELEB 계정 정리 보조 도구.
 *
 * faction_people에는 자연인/개별 허구 인물만 들어간다. 회사·조직·제품·기계·부대·집단을
 * 계정으로 만든 일괄 백필의 결과만 정확히 백업하고, SQL 정리 뒤 Auth 계정을 제거한다.
 *
 *   pnpm exec tsx scripts/cleanup-faction-nonperson-celebs.ts
 *   pnpm exec tsx scripts/cleanup-faction-nonperson-celebs.ts --prepare
 *   pnpm exec tsx scripts/cleanup-faction-nonperson-celebs.ts --finalize
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_BO_DIR = path.resolve(SCRIPT_DIR, '..')
const PROJECT_ROOT = path.resolve(WEB_BO_DIR, '..', '..')
const BACKUP_PATH = path.join(PROJECT_ROOT, '_backup', 'faction-nonperson-cleanup-2026-08-03.json')
config({ path: path.join(WEB_BO_DIR, '.env') })

const PREPARE = process.argv.includes('--prepare')
const FINALIZE = process.argv.includes('--finalize')
if (PREPARE && FINALIZE) throw new Error('--prepare와 --finalize는 동시에 쓸 수 없습니다.')

type Target = { folder: string; name: string; deleteProfile: boolean; action: 'delete' | 'remap' }

const TARGETS: Target[] = [
  { folder: 'autonomous-driving', name: 'Waymo', deleteProfile: true, action: 'delete' },
  { folder: 'autonomous-driving', name: 'Tesla (FSD)', deleteProfile: true, action: 'delete' },
  { folder: 'autonomous-driving', name: 'Cruise', deleteProfile: true, action: 'delete' },
  { folder: 'aviation-industry', name: 'Boeing', deleteProfile: true, action: 'delete' },
  { folder: 'aviation-industry', name: 'Airbus', deleteProfile: true, action: 'delete' },
  { folder: 'aviation-industry', name: 'C919', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'F-35 / F-22', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: '방공 요격 미사일', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'B-21 스텔스 폭격기', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'M1 에이브럼스', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'Shield AI', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'BAE Systems', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'Rheinmetall', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: '라팔 (Rafale)', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'K9 자주포', deleteProfile: true, action: 'delete' },
  { folder: 'defense-industry', name: 'FA-50', deleteProfile: false, action: 'delete' },
  { folder: 'defense-industry', name: 'K2 흑표', deleteProfile: true, action: 'delete' },
  { folder: 'drone-industry', name: 'DJI', deleteProfile: true, action: 'delete' },
  { folder: 'drone-industry', name: 'Skydio', deleteProfile: true, action: 'delete' },
  { folder: 'drone-industry', name: 'Reaper / Global Hawk', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'NuScale', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'TerraPower', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'X-energy', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'Commonwealth Fusion', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'Helion Energy', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'TAE Technologies', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'QuantumScape', deleteProfile: true, action: 'delete' },
  { folder: 'energy-industry', name: 'CATL', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'Tesla (Cybertruck)', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'BYD', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: '현대 아이오닉', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'Rivian', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'Lucid Motors', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: '포르쉐 타이칸', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'CATL', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'LG에너지솔루션', deleteProfile: true, action: 'delete' },
  { folder: 'ev-wars', name: 'Panasonic', deleteProfile: true, action: 'delete' },
  { folder: 'humanoids', name: 'Optimus', deleteProfile: true, action: 'delete' },
  { folder: 'humanoids', name: 'Atlas', deleteProfile: true, action: 'delete' },
  { folder: 'humanoids', name: 'Spot', deleteProfile: true, action: 'delete' },
  { folder: 'humanoids', name: 'Figure 03', deleteProfile: true, action: 'delete' },
  { folder: 'humanoids', name: 'NEO Beta', deleteProfile: true, action: 'delete' },
  { folder: 'humanoids', name: 'Unitree G1', deleteProfile: true, action: 'delete' },
  { folder: 'intelligence-agencies', name: 'CIA', deleteProfile: true, action: 'delete' },
  { folder: 'intelligence-agencies', name: 'MI6 (SIS)', deleteProfile: true, action: 'delete' },
  { folder: 'intelligence-agencies', name: 'Mossad', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Falcon 9', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Falcon Heavy', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Starship', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Dragon', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'New Shepard', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'New Glenn', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Saturn V', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'SLS', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Atlas V', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Vulcan Centaur', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Electron', deleteProfile: true, action: 'delete' },
  { folder: 'space-industry', name: 'Neutron', deleteProfile: true, action: 'delete' },
  { folder: 'special-forces', name: 'DEVGRU (SEAL Team 6)', deleteProfile: true, action: 'delete' },
  { folder: 'special-forces', name: 'SAS', deleteProfile: true, action: 'delete' },
  { folder: 'special-forces', name: '707 특임단', deleteProfile: true, action: 'delete' },
  { folder: 'great-hackers-masked', name: '죽은 소의 교단', deleteProfile: true, action: 'delete' },
  { folder: 'great-hackers-masked', name: '어나니머스', deleteProfile: true, action: 'delete' },
  { folder: 'great-hackers-masked', name: '럴즈섹', deleteProfile: true, action: 'delete' },
  { folder: 'great-hackers-masked', name: '다크사이드', deleteProfile: true, action: 'delete' },
  { folder: 'great-hackers-faces', name: '워즈니악 & 잡스', deleteProfile: true, action: 'remap' },
  { folder: 'digital-gold-rush', name: '윙클보스 형제', deleteProfile: true, action: 'remap' },
]

type Row = Record<string, unknown>
type Backup = {
  createdAt: string
  targets: Array<Target & { row: Row; group: Row; cluster: Row; profile: Row; auth: Row | null }>
  profiles: Row[]
  userSocial: Row[]
  userScores: Row[]
  deleteProfileIds: string[]
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경변수가 없습니다.`)
  return value
}

async function loadAuthUsers(db: SupabaseClient, ids: string[], allowMissing = false): Promise<Map<string, User>> {
  const users = new Map<string, User>()
  for (const id of ids) {
    const { data, error } = await db.auth.admin.getUserById(id)
    if (error) {
      if (allowMissing && /not found/i.test(error.message)) continue
      throw new Error(`Auth 사용자 조회 실패 ${id}: ${error.message}`)
    }
    if (data.user) users.set(data.user.id, data.user)
  }
  return users
}

function sanitizeAuth(user: User | undefined): Row | null {
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at ?? null,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  }
}

async function collectBackup(db: SupabaseClient): Promise<Backup> {
  const folders = [...new Set(TARGETS.map(target => target.folder))]
  const { data: episodes, error: episodeError } = await db.from('faction_episodes').select('*').in('folder', folders)
  if (episodeError) throw episodeError
  const episodeByFolder = new Map((episodes ?? []).map(row => [row.folder as string, row]))
  if (episodeByFolder.size !== folders.length) throw new Error(`팩션 편 누락: 예상 ${folders.length}, 실제 ${episodeByFolder.size}`)

  const episodeIds = (episodes ?? []).map(row => row.id as string)
  const { data: groups, error: groupError } = await db.from('faction_groups').select('*').in('episode_id', episodeIds)
  if (groupError) throw groupError
  const groupById = new Map((groups ?? []).map(row => [row.id as string, row]))
  const { data: clusters, error: clusterError } = await db.from('faction_clusters').select('*').in('group_id', [...groupById.keys()])
  if (clusterError) throw clusterError
  const clusterById = new Map((clusters ?? []).map(row => [row.id as string, row]))
  const clusterIds = [...clusterById.keys()]
  const { data: people, error: peopleError } = await db.from('faction_people').select('*').in('cluster_id', clusterIds)
  if (peopleError) throw peopleError

  const rowsWithContext = (people ?? []).map(row => {
    const cluster = clusterById.get(row.cluster_id as string)
    const group = cluster ? groupById.get(cluster.group_id as string) : undefined
    const episode = group ? (episodes ?? []).find(candidate => candidate.id === group.episode_id) : undefined
    return { row, cluster, group, folder: episode?.folder as string | undefined }
  })

  const matched = TARGETS.map(target => {
    const hits = rowsWithContext.filter(candidate => candidate.folder === target.folder && candidate.row.name === target.name)
    if (hits.length !== 1) throw new Error(`대상 불일치 ${target.folder}/${target.name}: ${hits.length}행`)
    const hit = hits[0]
    if (!hit.cluster || !hit.group) throw new Error(`대상 컨텍스트 누락 ${target.folder}/${target.name}`)
    return { target, ...hit }
  })
  if (new Set(matched.map(item => item.row.id as string)).size !== TARGETS.length) {
    throw new Error('서로 다른 정리 대상이 같은 faction_people 행을 가리킵니다.')
  }

  const profileIds = [...new Set(matched.map(item => item.row.celeb_id as string))]
  const { data: profiles, error: profileError } = await db.from('profiles').select('*').in('id', profileIds)
  if (profileError) throw profileError
  const profileById = new Map((profiles ?? []).map(row => [row.id as string, row]))
  const authNeededIds = [...new Set(matched.filter(item => item.target.deleteProfile).map(item => item.row.celeb_id as string))]
  const authById = await loadAuthUsers(db, authNeededIds)

  const targetRows = matched.map(({ target, row, group, cluster }) => {
    const profile = profileById.get(row.celeb_id as string)
    if (!profile) throw new Error(`프로필 누락 ${target.folder}/${target.name}`)
    const auth = authById.get(row.celeb_id as string)
    if (target.deleteProfile && !auth?.email?.match(/^celeb_faction_.+@feelandnote\.local$/)) {
      throw new Error(`일괄 생성 계정이 아닌 프로필 삭제 차단 ${target.folder}/${target.name}: ${auth?.email ?? 'Auth 없음'}`)
    }
    return { ...target, row, group, cluster, profile, auth: sanitizeAuth(auth) }
  })

  const deleteProfileIds = [...new Set(targetRows.filter(row => row.deleteProfile).map(row => row.row.celeb_id as string))]
  if (TARGETS.length !== 67 || deleteProfileIds.length !== 65) {
    throw new Error(`안전 수량 불일치: 대상 ${TARGETS.length}/67, 삭제 프로필 ${deleteProfileIds.length}/65`)
  }
  const [{ data: userSocial, error: socialError }, { data: userScores, error: scoresError }] = await Promise.all([
    db.from('user_social').select('*').in('user_id', deleteProfileIds),
    db.from('user_scores').select('*').in('user_id', deleteProfileIds),
  ])
  if (socialError) throw socialError
  if (scoresError) throw scoresError

  return {
    createdAt: new Date().toISOString(),
    targets: targetRows,
    profiles: (profiles ?? []).filter(row => deleteProfileIds.includes(row.id as string)),
    userSocial: userSocial ?? [],
    userScores: userScores ?? [],
    deleteProfileIds,
  }
}

async function ensureCameronWinklevoss(db: SupabaseClient): Promise<{ id: string; slug: string }> {
  const { data: existing, error: existingError } = await db.from('profiles')
    .select('id,slug,nickname,profile_type,status')
    .or('nickname.eq.카메론 윙클보스,nickname_en.eq.Cameron Winklevoss')
    .neq('status', 'deleted')
  if (existingError) throw existingError
  if ((existing ?? []).length > 1) throw new Error('카메론 윙클보스 프로필이 중복입니다.')
  if (existing?.length === 1) {
    if (existing[0].profile_type !== 'CELEB' || !existing[0].slug) throw new Error('기존 카메론 윙클보스 프로필이 CELEB가 아닙니다.')
    return { id: existing[0].id as string, slug: existing[0].slug as string }
  }

  const { data: slugRows, error: slugError } = await db.from('profiles').select('slug').like('slug', 'cameron-winklevoss%')
  if (slugError) throw slugError
  const occupied = new Set((slugRows ?? []).map(row => row.slug as string))
  let slugSuffix: string | null = null
  if (occupied.has('cameron-winklevoss')) {
    for (let suffix = 2; ; suffix++) {
      if (!occupied.has(`cameron-winklevoss-${suffix}`)) { slugSuffix = String(suffix); break }
    }
  }

  const token = randomUUID()
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: `celeb_${token}@feelandnote.local`,
    password: randomUUID() + randomUUID(),
    email_confirm: true,
  })
  if (authError) throw authError
  const id = authData.user.id
  try {
    const { data: profile, error: updateError } = await db.from('profiles').update({
      nickname: '카메론 윙클보스',
      nickname_en: 'Cameron Winklevoss',
      slug_suffix: slugSuffix,
      profession: 'entrepreneur',
      title: 'Gemini 공동설립자',
      profile_type: 'CELEB',
      status: 'suspended',
      celeb_tier: 'light',
      is_verified: false,
    }).eq('id', id).select('slug').single()
    if (updateError) throw updateError
    if (!profile?.slug) throw new Error('카메론 윙클보스 slug 생성 실패')
    const { error: socialError } = await db.from('user_social').upsert({
      user_id: id, follower_count: 0, following_count: 0, friend_count: 0, influence: 0,
    })
    if (socialError) throw socialError
    const { error: scoreError } = await db.from('user_scores').upsert({
      user_id: id, activity_score: 0, title_bonus: 0, total_score: 0,
    })
    if (scoreError) throw scoreError
    return { id, slug: profile.slug as string }
  } catch (error) {
    await db.auth.admin.deleteUser(id)
    throw error
  }
}

async function finalize(db: SupabaseClient): Promise<void> {
  if (!existsSync(BACKUP_PATH)) throw new Error(`백업이 없습니다: ${BACKUP_PATH}`)
  const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8')) as Backup
  if (backup.deleteProfileIds.length !== 65) throw new Error(`백업 삭제 프로필 수 불일치: ${backup.deleteProfileIds.length}`)

  const [{ count: factionRefs, error: factionError }, { count: discourseRefs, error: discourseError }] = await Promise.all([
    db.from('faction_people').select('id', { count: 'exact', head: true }).in('celeb_id', backup.deleteProfileIds),
    db.from('discourse_speakers').select('id', { count: 'exact', head: true }).in('celeb_id', backup.deleteProfileIds),
  ])
  if (factionError) throw factionError
  if (discourseError) throw discourseError
  if (factionRefs || discourseRefs) throw new Error(`잘못된 계정 참조가 남았습니다: faction=${factionRefs}, discourse=${discourseRefs}`)

  const authById = await loadAuthUsers(db, backup.deleteProfileIds, true)
  let deleted = 0
  let alreadyGone = 0
  for (const id of backup.deleteProfileIds) {
    if (!authById.has(id)) { alreadyGone++; continue }
    const { error } = await db.auth.admin.deleteUser(id)
    if (error) throw new Error(`Auth 삭제 실패 ${id}: ${error.message}`)
    deleted++
  }
  console.log(`잘못 생성된 Auth/CELEB 계정 삭제: ${deleted}개, 이미 없음: ${alreadyGone}개`)
}

async function main() {
  const db = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  if (FINALIZE) { await finalize(db); return }

  const backup = await collectBackup(db)
  console.log(`정리 대상 ${backup.targets.length}행 · 잘못 생성된 계정 ${backup.deleteProfileIds.length}개`)
  console.log(`행 처리: 삭제 ${backup.targets.filter(row => row.action === 'delete').length}, 개인으로 재연결 ${backup.targets.filter(row => row.action === 'remap').length}`)
  if (!PREPARE) {
    console.log('dry-run입니다. --prepare를 붙이면 백업 후 필요한 실제 인물 프로필 1개를 준비합니다.')
    return
  }

  if (existsSync(BACKUP_PATH)) {
    const existing = JSON.parse(readFileSync(BACKUP_PATH, 'utf8')) as Backup
    const sameIds = [...existing.deleteProfileIds].sort().join(',') === [...backup.deleteProfileIds].sort().join(',')
    if (existing.targets.length !== 67 || existing.deleteProfileIds.length !== 65 || !sameIds) {
      throw new Error(`기존 백업 내용이 현재 대상과 다릅니다: ${BACKUP_PATH}`)
    }
    console.log(`기존 백업 재사용: ${BACKUP_PATH}`)
  } else {
    mkdirSync(path.dirname(BACKUP_PATH), { recursive: true })
    writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), 'utf8')
    console.log(`백업: ${BACKUP_PATH}`)
  }
  const cameron = await ensureCameronWinklevoss(db)
  console.log(`실제 인물 준비: 카메론 윙클보스 (${cameron.slug}, ${cameron.id})`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
