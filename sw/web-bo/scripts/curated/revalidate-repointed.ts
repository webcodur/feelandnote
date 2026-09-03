/**
 * 목록 연결을 옮긴(`repoint-split-items.ts`) 뒤 그 목록과 작품의 캐시만 비운다
 *
 * 도메인 전체(`curated`)를 비우면 이후 방문·크롤링마다 재생성이 쌓인다.
 * 실제로 바뀐 목록 id와 작품 id만 「도메인:식별자」로 보낸다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/revalidate-repointed.ts          # 보낼 태그만 확인
 *   npx tsx scripts/curated/revalidate-repointed.ts --yes    # 실제 호출
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from '../lib/paths'

const ROOT = REPO_ROOT
const WORK = join(ROOT, 'data/curated-lists/_split-rows')

function loadEnv(p: string) {
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

// 🔴 NEXT_PUBLIC_SITE_URL 을 쓰지 마라. web-bo/.env 는 localhost:3001 이라
//    운영 캐시 대신 로컬 BO 로 POST 가 날아가고 200 + HTML 이 돌아와 성공처럼 보인다.
const SITE = process.argv.find((a) => a.startsWith('--site='))?.slice(7) ?? 'https://feelandnote.com'
const SECRET = process.env.CRON_SECRET
const go = process.argv.includes('--yes')

type Move = { itemId: string; from: string; to: string; list_id: string }
const plan: Move[] = JSON.parse(readFileSync(join(WORK, 'repoint.json'), 'utf8'))

const lists = [...new Set(plan.map((p) => p.list_id).filter(Boolean))]
const contents = [...new Set(plan.flatMap((p) => [p.from, p.to]).filter(Boolean))]
const tags = [...lists.map((id) => `curated:${id}`), ...contents.map((id) => `contents:${id}`)]

console.log(`목록 ${lists.length}개 · 작품 ${contents.length}건 → 태그 ${tags.length}개`)
if (!SECRET) throw new Error('CRON_SECRET 이 없다')

async function main() {
  if (!go) {
    console.log(tags.slice(0, 8).join('\n'))
    console.log('\n[점검만] 실제로 보내려면 --yes 를 붙인다.')
    return
  }
  // 요청당 200개 상한이 있어 나눠 보낸다
  for (let i = 0; i < tags.length; i += 150) {
    const chunk = tags.slice(i, i + 150)
    const res = await fetch(`${SITE}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag: chunk, secret: SECRET }),
    })
    const text = await res.text()
    console.log(`  ${i / 150 + 1}차 ${chunk.length}개 → ${res.status} ${text.slice(0, 120)}`)
  }
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
