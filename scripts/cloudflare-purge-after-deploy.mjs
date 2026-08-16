// 프로덕션 배포가 끝난 뒤 실행된다(GitHub Actions deployment_status).
// 직전 성공 배포 SHA와 이번 SHA 사이의 변경 파일로 판정해 필요할 때만 Cloudflare 전체 퍼지를 부른다.
import { spawnSync } from 'node:child_process'
import { shouldPurgeCloudflare } from './lib/cloudflare-purge-impact.mjs'

const previousSha = process.env.PREVIOUS_SHA?.trim()
const currentSha = process.env.CURRENT_SHA?.trim() || 'HEAD'
const zoneId = process.env.CLOUDFLARE_ZONE_ID
const token = process.env.CLOUDFLARE_API_TOKEN

if (!zoneId || !token) {
  console.log('[cf-purge] Cloudflare 설정 없음 — 건너뜀')
  process.exit(0)
}

let changed = []
if (previousSha) {
  const diff = spawnSync('git', ['diff', '--name-only', '--no-renames', previousSha, currentSha, '--'], { encoding: 'utf8' })
  if (diff.status !== 0) {
    console.log('[cf-purge] diff 실패 — 안전하게 전체 퍼지로 기운다')
    changed = ['sw/web/src/app/[locale]/layout.tsx']
  } else {
    changed = diff.stdout.split('\n').filter(Boolean)
  }
} else {
  console.log('[cf-purge] 직전 배포 SHA 없음 — 안전하게 전체 퍼지로 기운다')
  changed = ['sw/web/src/app/[locale]/layout.tsx']
}

if (!shouldPurgeCloudflare(changed)) {
  console.log(`[cf-purge] 캐시 화면 무변경(${changed.length}개 파일) — 퍼지 안 함`)
  process.exit(0)
}

const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ purge_everything: true }),
})
const body = await res.text()
console.log(`[cf-purge] 전체 퍼지 ${res.status}: ${body.slice(0, 200)}`)
process.exit(res.ok ? 0 : 1)
