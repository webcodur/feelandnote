/**
 * 폐기됐던 great-hackers-state가 2026-07-29에 재등록되며 공개된 회귀를 되돌린다.
 *
 * - 로컬 조사 자산은 지우지 않는다.
 * - 에피소드는 blocked + registered=false로 바꾼다.
 * - 이 재등록에서 함께 생성된 6명만 inactive로 바꾼다.
 * - 기본은 dry-run이며 --apply에서만 쓴다.
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCache } from '../src/lib/revalidate-web'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EPISODE = {
  id: '95240443-494b-4d96-b1f8-65d773bbedae',
  folder: 'great-hackers-state',
  title: '위대한 해커들\n국가의 군단',
  createdAt: '2026-07-29T08:17:10.817658+00:00',
} as const

const TARGETS = [
  ['4309b8a1-6333-4a67-95bf-6318f3208e67', 'park-jin-hyok', '박진혁', '2026-07-29T08:10:47.593414+00:00'],
  ['8ca7a2b9-c9b3-49cc-9d42-8b1e0a8f9a0c', 'rim-jong-hyok', '림종혁', '2026-07-29T08:10:48.21629+00:00'],
  ['90ff880d-7a56-4635-98e9-80f0c15daa50', 'sun-kailiang', '쑨카이량', '2026-07-29T08:10:45.574718+00:00'],
  ['932bfc86-5bc0-4e34-b23e-ff01a143ba00', 'viktor-netyksho', '빅토르 네틱쇼', '2026-07-29T08:10:46.303794+00:00'],
  ['a3706c24-33a3-4550-8e24-69386ca30e05', 'wang-dong', '왕둥', '2026-07-29T08:10:44.349838+00:00'],
  ['f3b1d576-ead5-45ff-b5bd-26312a319aeb', 'yuriy-andrienko', '유리 안드리엔코', '2026-07-29T08:10:46.923073+00:00'],
] as const

async function main() {
  const apply = process.argv.includes('--apply')
  const ids = TARGETS.map(([id]) => id)

  const [{ data: episode, error: episodeError }, { data: profiles, error: profileError }] = await Promise.all([
    db.from('faction_episodes')
      .select('id,folder,title,status,registered,created_at')
      .eq('id', EPISODE.id)
      .maybeSingle(),
    db.from('profiles')
      .select('id,slug,nickname,status,created_at')
      .in('id', ids),
  ])
  if (episodeError) throw new Error(`에피소드 조회 실패: ${episodeError.message}`)
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)
  if (!episode
    || episode.folder !== EPISODE.folder
    || episode.title !== EPISODE.title
    || episode.created_at !== EPISODE.createdAt) {
    throw new Error(`에피소드 잠금 실패: ${JSON.stringify(episode)}`)
  }

  const byId = new Map((profiles ?? []).map(row => [row.id, row]))
  for (const [id, slug, nickname, createdAt] of TARGETS) {
    const row = byId.get(id)
    if (!row
      || row.slug !== slug
      || row.nickname !== nickname
      || row.created_at !== createdAt) {
      throw new Error(`${nickname} 프로필 잠금 실패: ${JSON.stringify(row)}`)
    }
  }

  const alreadyDone = episode.status === 'blocked'
    && episode.registered === false
    && TARGETS.every(([id]) => byId.get(id)?.status === 'inactive')
  if (alreadyDone) {
    console.log('SKIP great-hackers-state: 이미 blocked/unregistered + 6명 inactive')
    return
  }

  console.log(`PLAN ${EPISODE.folder}: ready/registered → blocked/unregistered`)
  for (const [, slug, nickname] of TARGETS) {
    console.log(`PLAN ${nickname} (${slug}): active → inactive`)
  }
  if (!apply) {
    console.log('DRY-RUN: 쓰기 0건')
    return
  }

  const { data: changedEpisode, error: updateEpisodeError } = await db.from('faction_episodes')
    .update({
      status: 'blocked',
      registered: false,
      updated_at: new Date().toISOString(),
      block_note: '2026-07-29: 폐기 편 재등록 회귀 차단. 로컬 조사 자산은 보존.',
    })
    .eq('id', EPISODE.id)
    .eq('folder', EPISODE.folder)
    .eq('created_at', EPISODE.createdAt)
    .select('id,status,registered')
    .maybeSingle()
  if (updateEpisodeError) throw new Error(`에피소드 비활성 실패: ${updateEpisodeError.message}`)
  if (!changedEpisode || changedEpisode.status !== 'blocked' || changedEpisode.registered !== false) {
    throw new Error('에피소드 비활성 결과 검증 실패')
  }

  for (const [id, slug, nickname, createdAt] of TARGETS) {
    const { data: changed, error } = await db.from('profiles')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('slug', slug)
      .eq('created_at', createdAt)
      .select('id,status')
      .maybeSingle()
    if (error) throw new Error(`${nickname} inactive 실패: ${error.message}`)
    if (!changed || changed.status !== 'inactive') {
      throw new Error(`${nickname} inactive 결과 검증 실패`)
    }
    console.log(`APPLIED ${nickname}: inactive`)
  }

  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.TAGS])
  console.log('DONE great-hackers-state: 공개 노출 차단, 로컬 자산 보존')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
