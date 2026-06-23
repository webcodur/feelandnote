/**
 * faction-align.ts — 세력도(Faction) 발화 시각 산출 (entry)
 *
 * 받아쓰기(3-transcribe.py --faction)가 만든 단어 타이밍을 읽어 인물 대사의 덩어리별 발화 시각을
 * 계산하고 public/factions/<에피소드>/data.timing.<locale>.json 으로 쓴다.
 *
 * 사용법:
 *   pnpm voice:faction-align -- --episode llm                 → data.timing.ko.json 생성
 *   pnpm voice:faction-align -- --episode llm --lang en       → data.timing.en.json
 *   pnpm voice:faction-align -- --episode llm --only F01P01   → 특정 인물만(부분 일치)
 *
 * 선행: pnpm voice:faction(음성 합성) → python scripts/voice/3-transcribe.py --episode llm --faction (단어 타이밍).
 */

import { main } from './faction/align.js'

main().catch(err => {
  console.error(err)
  process.exit(1)
})
