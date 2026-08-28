/**
 * 셀럽 한 줄 정의 전량 개편 원장.
 * 룰: docs/project/celeb/celeb-1-basic-profile.md 한 줄 정의 절
 *
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts --help
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 10
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 10 --recheck
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 1 --dry
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts status
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file <최종-검수.json>
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N]          # dry-run
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N] --apply  # DB 쓰기
 */

import { apply } from './apply'
import { claim, status } from './claim'
import { HEADLINE_REVIEW_VERSION } from './lib'
import { record } from './record'

const HELP = `셀럽 한 줄 정의 전량 개편 원장. DB 쓰기는 apply --apply 뿐.

sw/web-bo 에서:
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 10
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 10 --recheck
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 14 --n 1 --redo --slug nelson-mandela
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 1 --dry
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts status
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file <경로>
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N]
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N] --apply

레인 = celebs.id MD5 앞 4바이트 % 20. 한 인물 한 레인.
claim은 원장에 없는 인물만, --recheck는 현재 심사 버전을 거치지 않은 원장 인물만 고른다.
--redo --slug는 현재 버전을 이미 거친 지정 원장 인물 한 명만 다시 연다.
생성 팩(기존 헤드라인 비공개): data/celeb/headline-rewrite/packs/lane-NN.json
검수 비교 팩(현재값·이전 후보): data/celeb/headline-rewrite/reviews/lane-NN.json
원장: data/celeb/headline-rewrite/ledger/lane-NN.json
record JSON은 reviewVersion=${HEADLINE_REVIEW_VERSION}, items[].phase = confirm | skip, 최종 headline/headline_en 필수.
형식: { "lane": N, "reviewVersion": ${HEADLINE_REVIEW_VERSION}, "items": [{ "id", "slug", "phase", "headline", "headline_en" }] }
apply는 현재 reviewVersion의 phase=confirm만 받으며 --apply 없이는 쓰지 않는다.
`

async function main() {
  const cmd = process.argv[2]
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    console.log(HELP)
    return
  }
  const run: Record<string, () => Promise<void> | void> = {
    claim,
    status,
    record,
    apply,
  }
  const fn = run[cmd]
  if (!fn) throw new Error(`모르는 명령: ${cmd}`)
  await fn()
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
