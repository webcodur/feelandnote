/**
 * variants.ts — 로컬 faction-data.json 에서 편별 변형 목록 색인(_variants.json)을 다시 쓴다.
 *
 * 내보내기(백오피스 저장·`pnpm faction:export`)가 매번 자기 편 자리를 갱신하므로 평소엔 부를 일이 없다.
 * 로더가 편 본문을 번들 밖으로 낸 뒤 첫 채움, 또는 색인이 지워졌을 때 쓴다. DB 를 읽지 않는다.
 *
 *   pnpm faction:variants          등록 목록(_episodes.json)의 편만
 *   pnpm faction:variants --all    faction-data.json 이 있는 모든 폴더
 */

import { readFactionDataFile, writeFactionVariantsIndex } from '@feelandnote/shared/bo/faction-export'
import { FACTIONS_DIR, scanEpisodes } from './lib.js'

const all = process.argv.includes('--all')
const targets = scanEpisodes().filter(ep => all || ep.registered)

let changed = 0
for (const ep of targets) {
  const doc = readFactionDataFile(ep.dataPath)
  const r = writeFactionVariantsIndex(FACTIONS_DIR, ep.folder, doc)
  if (r.changed) changed++
  console.log(`${r.changed ? '갱신' : '동일'}  ${ep.folder}`)
}
console.log(`\n${targets.length}편 확인 · ${changed}편 갱신 → ${FACTIONS_DIR}/_variants.json`)
