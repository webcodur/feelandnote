/**
 * 팩션에 남아 있던 집단형 fiction 계정 5개를 백업하고 제거한다.
 * 자연인뿐 아니라 fiction도 하나의 이름과 행위 주체를 가진 개별 인물만 계정이 될 수 있다.
 *
 *   pnpm exec tsx scripts/cleanup-faction-collective-fiction-celebs.ts
 *   pnpm exec tsx scripts/cleanup-faction-collective-fiction-celebs.ts --prepare
 *   pnpm exec tsx scripts/cleanup-faction-collective-fiction-celebs.ts --finalize
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_BO_DIR = path.resolve(SCRIPT_DIR, '..')
const PROJECT_ROOT = path.resolve(WEB_BO_DIR, '..', '..')
const BACKUP_PATH = path.join(PROJECT_ROOT, '_backup', 'faction-collective-fiction-cleanup-2026-08-03.json')
config({ path: path.join(WEB_BO_DIR, '.env') })

const PREPARE = process.argv.includes('--prepare')
const FINALIZE = process.argv.includes('--finalize')
if (PREPARE && FINALIZE) throw new Error('--prepare와 --finalize는 동시에 쓸 수 없습니다.')

const TARGETS = [
  { folder: 'argonauts', name: '하르피이아' },
  { folder: 'Homer-Odyssey', name: '라이스트뤼고네스' },
  { folder: 'Homer-Odyssey', name: '세이렌' },
  { folder: 'Homer-Odyssey', name: '로토스파고스족' },
  { folder: 'myth-norse', name: '기주키의 형제들' },
] as const

type Row = Record<string, unknown>
type Backup = { createdAt: string; targets: Row[]; profileIds: string[]; dependentRows: Record<string, Row[]> }

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경변수가 없습니다.`)
  return value
}

async function collect(db: SupabaseClient): Promise<Backup> {
  const folders = [...new Set(TARGETS.map(target => target.folder))]
  const { data: episodes, error: episodeError } = await db.from('faction_episodes').select('*').in('folder', folders)
  if (episodeError) throw episodeError
  const { data: groups, error: groupError } = await db.from('faction_groups').select('*').in('episode_id', (episodes ?? []).map(row => row.id))
  if (groupError) throw groupError
  const { data: clusters, error: clusterError } = await db.from('faction_clusters').select('*').in('group_id', (groups ?? []).map(row => row.id))
  if (clusterError) throw clusterError
  const { data: people, error: peopleError } = await db.from('faction_people').select('*').in('cluster_id', (clusters ?? []).map(row => row.id))
  if (peopleError) throw peopleError

  const episodeById = new Map((episodes ?? []).map(row => [row.id as string, row]))
  const groupById = new Map((groups ?? []).map(row => [row.id as string, row]))
  const clusterById = new Map((clusters ?? []).map(row => [row.id as string, row]))
  const matched = TARGETS.map(target => {
    const hits = (people ?? []).filter(person => {
      const cluster = clusterById.get(person.cluster_id as string)
      const group = cluster ? groupById.get(cluster.group_id as string) : undefined
      const episode = group ? episodeById.get(group.episode_id as string) : undefined
      return episode?.folder === target.folder && person.name === target.name
    })
    if (hits.length !== 1) throw new Error(`집단 계정 대상 불일치 ${target.folder}/${target.name}: ${hits.length}행`)
    const person = hits[0]
    const cluster = clusterById.get(person.cluster_id as string)!
    const group = groupById.get(cluster.group_id as string)!
    return { ...target, person, cluster, group, profileId: person.celeb_id as string }
  })
  const profileIds = [...new Set(matched.map(row => row.profileId))]
  if (matched.length !== 5 || profileIds.length !== 5) throw new Error(`집단 계정 수량 불일치: ${matched.length}행/${profileIds.length}계정`)

  const tables: Array<[string, string]> = [
    ['profiles', 'id'], ['user_social', 'user_id'], ['user_scores', 'user_id'],
    ['fiction_source_characters', 'celeb_id'], ['celeb_persona', 'celeb_id'],
    ['celeb_influence', 'celeb_id'], ['celeb_dialogues', 'celeb_id'],
    ['celeb_tag_assignments', 'celeb_id'], ['celeb_timeline_events', 'celeb_id'],
  ]
  const dependentRows: Record<string, Row[]> = {}
  for (const [table, column] of tables) {
    const { data, error } = await db.from(table).select('*').in(column, profileIds)
    if (error) throw new Error(`${table} 백업 실패: ${error.message}`)
    dependentRows[table] = data ?? []
  }
  for (const id of profileIds) {
    const { data, error } = await db.auth.admin.getUserById(id)
    if (error || !data.user) throw new Error(`집단 계정 Auth 조회 실패 ${id}: ${error?.message ?? '없음'}`)
    const email = data.user.email ?? ''
    if (!email.endsWith('@feelandnote.local')) throw new Error(`로컬 CELEB 계정이 아니므로 삭제 차단 ${id}: ${email}`)
  }
  return { createdAt: new Date().toISOString(), targets: matched, profileIds, dependentRows }
}

async function finalize(db: SupabaseClient): Promise<void> {
  if (!existsSync(BACKUP_PATH)) throw new Error(`백업이 없습니다: ${BACKUP_PATH}`)
  const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8')) as Backup
  if (backup.profileIds.length !== 5) throw new Error(`백업 계정 수 불일치: ${backup.profileIds.length}`)
  const [{ count: factionRefs, error: factionError }, { count: discourseRefs, error: discourseError }] = await Promise.all([
    db.from('faction_people').select('id', { count: 'exact', head: true }).in('celeb_id', backup.profileIds),
    db.from('discourse_speakers').select('id', { count: 'exact', head: true }).in('celeb_id', backup.profileIds),
  ])
  if (factionError) throw factionError
  if (discourseError) throw discourseError
  if (factionRefs || discourseRefs) throw new Error(`집단 계정 참조가 남았습니다: faction=${factionRefs}, discourse=${discourseRefs}`)
  let deleted = 0
  for (const id of backup.profileIds) {
    const { error } = await db.auth.admin.deleteUser(id)
    if (error) throw new Error(`집단 Auth 삭제 실패 ${id}: ${error.message}`)
    deleted++
  }
  console.log(`집단형 fiction Auth/CELEB 계정 삭제: ${deleted}개`)
}

async function main() {
  const db = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  if (FINALIZE) { await finalize(db); return }
  const backup = await collect(db)
  console.log(`집단형 fiction 대상 ${backup.targets.length}행 · 계정 ${backup.profileIds.length}개`)
  if (!PREPARE) { console.log('dry-run입니다. --prepare를 붙이면 백업합니다.'); return }
  if (existsSync(BACKUP_PATH)) throw new Error(`기존 백업을 덮어쓰지 않습니다: ${BACKUP_PATH}`)
  mkdirSync(path.dirname(BACKUP_PATH), { recursive: true })
  writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), 'utf8')
  console.log(`백업: ${BACKUP_PATH}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
