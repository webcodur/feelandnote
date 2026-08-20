/**
 * 셀럽 한 줄 정의 전량 개편 원장.
 * 룰: docs/project/celeb/celeb-1-basic-profile.md 한 줄 정의 절
 *
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts --help
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 10
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 1 --dry
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts status
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file <초안|개편.json>
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N]          # dry-run
 *   pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N] --apply  # DB 쓰기
 */

import { apply } from './apply'
import { claim, status } from './claim'
import { record } from './record'

const HELP = `셀럽 한 줄 정의 전량 개편 원장. DB 쓰기는 apply --apply 뿐.

sw/web-bo 에서:
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 10
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane 0 --n 1 --dry
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts status
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file <경로>
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N]
  pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N] --apply

레인 = celebs.id MD5 앞 4바이트 % 20. 한 인물 한 레인.
claim 은 원장에 없는 인물만, 공개(active) 우선. 팩: data/celeb/headline-rewrite/packs/lane-NN.json
원장: data/celeb/headline-rewrite/ledger/lane-NN.json
record items[].phase = draft | confirm | skip
apply 는 phase=confirm 만. --apply 없으면 쓰기 금지.
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
