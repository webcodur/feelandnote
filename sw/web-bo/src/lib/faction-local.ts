/**
 * 세력도 로컬 자산 접근 가드 — **별칭만 남긴다.**
 *
 * 규칙 본체는 시리즈 무관이라 `lib/remotion-local.ts` 로 올렸다(26.07.26, 담화가 붙으면서).
 * 팩션 코드가 부르는 이름(`FACTION_LOCAL`·`factionLocalGuard`·`assertFactionLocal`)은 그대로 둔다 —
 * 참조가 수십 곳이라 이름을 바꾸면 이번 작업 범위 밖까지 번진다.
 *
 * 스위치는 `REMOTION_LOCAL=1` 이 표준이고 옛 이름 `FACTION_LOCAL=1` 도 계속 인정한다.
 */

import { REMOTION_LOCAL, remotionLocalGuard, assertRemotionLocal } from './remotion-local'

export const FACTION_LOCAL = REMOTION_LOCAL
export const factionLocalGuard = remotionLocalGuard
export const assertFactionLocal = assertRemotionLocal
