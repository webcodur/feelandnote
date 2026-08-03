/** energy-industry 실제 인물 명단 교체 직전의 현재 4개 행을 복구용으로 백업한다. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webBoDir = path.resolve(scriptDir, '..')
const root = path.resolve(webBoDir, '..', '..')
const backupPath = path.join(root, '_backup', 'faction-energy-people-before-curated-restore-2026-08-03.json')
config({ path: path.join(webBoDir, '.env') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수가 없습니다.')
  const db = createClient(url, key, { auth: { persistSession: false } })

  const { data: episode, error: episodeError } = await db.from('faction_episodes')
    .select('*').eq('folder', 'energy-industry').single()
  if (episodeError) throw episodeError
  const { data: groups, error: groupError } = await db.from('faction_groups')
    .select('*').eq('episode_id', episode.id)
  if (groupError) throw groupError
  const { data: clusters, error: clusterError } = await db.from('faction_clusters')
    .select('*').in('group_id', (groups ?? []).map(row => row.id))
  if (clusterError) throw clusterError
  const { data: people, error: peopleError } = await db.from('faction_people')
    .select('*').in('cluster_id', (clusters ?? []).map(row => row.id)).order('position')
  if (peopleError) throw peopleError
  if (people?.length !== 4) {
    throw new Error(`교체 전 energy-industry 인물 수 불일치: ${people?.length ?? 0}/4`)
  }

  mkdirSync(path.dirname(backupPath), { recursive: true })
  writeFileSync(
    backupPath,
    JSON.stringify({ createdAt: new Date().toISOString(), episode, groups, clusters, people }, null, 2),
    'utf8',
  )
  console.log(`백업: ${backupPath}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
