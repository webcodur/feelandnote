/**
 * 신화·전설·허구 팩션 17편을 서비스 태그/배정에 텍스트만 투영한다.
 *
 * 표준 faction publish 코어를 그대로 사용한다.
 * 사진·영상·음악은 범위에서 제외하므로 얼굴/로컬 이미지가 없어도 막히지 않는다.
 * 새 태그는 publish 코어 규칙대로 is_featured=false, is_fiction=true로 생성된다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/publish-fiction-faction-data.ts
 *   node --env-file=.env --import tsx scripts/publish-fiction-faction-data.ts --apply
 */

import { createClient } from '@supabase/supabase-js'
import { publishEpisode } from '@/lib/faction-sync/publish'

const EPISODES = [
  'Gods-Greek',
  'Homer-Iliad',
  'Homer-Odyssey',
  'argonauts',
  'arthur-round-table',
  'heracles',
  'house-of-atreus',
  'myth-china-fengshen',
  'myth-china-xiyou',
  'myth-egypt',
  'myth-hindu-mahabharata',
  'myth-hindu-ramayana',
  'myth-japan',
  'myth-korea',
  'myth-mesopotamia',
  'myth-norse',
  'virgil-aeneid',
] as const

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
}

const apply = process.argv.includes('--apply')
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const reports = []
  for (const folder of EPISODES) {
    const result = await publishEpisode(db, {
      folder,
      dryRun: !apply,
      force: false,
      scope: {
        tag: true,
        assignments: true,
        descs: true,
      },
    })
    reports.push({
      folder,
      summary: result.summary,
      warnings: result.warnings ?? [],
      blocked: result.items.filter((item) => item.action === 'blocked'),
      createdTags: result.constantHint ?? [],
    })
    console.log(
      `[${apply ? 'APPLY' : 'DRY'}] ${folder}: `
      + `created=${result.summary.created} updated=${result.summary.updated} `
      + `skipped=${result.summary.skipped} blocked=${result.summary.blocked}`,
    )
  }

  const blocked = reports.flatMap((report) => report.blocked.map((item) => ({
    folder: report.folder,
    ...item,
  })))
  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY-RUN',
    episodes: reports.length,
    totals: {
      created: reports.reduce((sum, row) => sum + row.summary.created, 0),
      updated: reports.reduce((sum, row) => sum + row.summary.updated, 0),
      skipped: reports.reduce((sum, row) => sum + row.summary.skipped, 0),
      blocked: blocked.length,
    },
    newTags: reports.flatMap((row) => row.createdTags),
    blocked,
  }, null, 2))

  if (blocked.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
