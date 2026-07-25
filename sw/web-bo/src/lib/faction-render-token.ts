/**
 * 렌더 과정이 자산 창구를 통과하기 위한 한 번짜리 열쇠 — 서버 전용.
 *
 * 카드뉴스 출고는 서버가 아니라 **다른 프로세스**(헤드리스 브라우저)가 사진을 가져간다.
 * 그 프로세스에는 로그인 정보가 없으므로, 창구가 사람만 확인하면 사진이 통째로 비어 나온다.
 *
 * 그래서 출고를 시작할 때 열쇠를 하나 만들어 사진 주소에 붙이고, 창구는 그 열쇠를 알아본다.
 * 열쇠는 서버가 살아 있는 동안만 메모리에 있고 파일·DB 에 남기지 않는다. 한 번 쓰고 버리지는
 * 않는다 — 한 번의 출고에서 사진 수백 장을 가져가므로 출고가 끝날 때까지 유효해야 한다.
 * 대신 정해진 시간이 지나면 스스로 사라진다.
 *
 * ⚠ 이 열쇠는 로그인 대신이 아니다. 로컬 자산 창구 자체가 `FACTION_LOCAL=1`(개발자 컴퓨터)에서만
 *   열리고, 열쇠는 그 안에서 "사람이 아니라 렌더 과정이 부른 것"을 가리기만 한다.
 */

import { randomUUID } from 'crypto'

/**
 * 열쇠가 실리는 주소 토막 — `/api/rm-asset/_k/<열쇠>/<자산경로>`.
 * 물음표 뒤가 아니라 경로인 이유: 렌더 쪽이 자산 주소를 `기준주소/상대경로` 로 이어 붙인다.
 */
export const RENDER_KEY_SEGMENT = '_k'

/** 열쇠 유효 시간 — 카드 한 벌 출고가 이보다 오래 걸리는 일은 실측상 없다 */
const TTL_MS = 30 * 60 * 1000

const g = globalThis as unknown as { __factionRenderKeys?: Map<string, number> }
if (!g.__factionRenderKeys) g.__factionRenderKeys = new Map()
const keys = g.__factionRenderKeys

function sweep() {
  const now = Date.now()
  for (const [k, exp] of keys) if (exp <= now) keys.delete(k)
}

/** 새 열쇠를 만들어 돌려준다(사진 주소의 `k` 값으로 붙인다) */
export function issueRenderKey(): string {
  sweep()
  const k = randomUUID()
  keys.set(k, Date.now() + TTL_MS)
  return k
}

/** 이 열쇠가 지금 유효한가 */
export function isRenderKeyValid(k: string | null | undefined): boolean {
  if (!k) return false
  sweep()
  return keys.has(k)
}
