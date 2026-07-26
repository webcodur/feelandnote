/**
 * 렌더 저장소 로컬 자산 접근 가드 — 서버 전용. **시리즈 무관 공통부.**
 *
 * 영상 시리즈의 사진·음원은 렌더 저장소(sw/remotion/public/)에 그대로 두고 DB 로 옮기지 않는다.
 * 그래서 그 파일을 만지는 창구는 **개발자 컴퓨터에서만** 살아야 한다.
 * 배포된 백오피스에는 그 폴더가 없으므로, 열려 있으면 실패가 아니라 조용한 오작동이 된다.
 *
 * 켜는 방법: `sw/web-bo/.env` 에 `REMOTION_LOCAL=1`.
 * 렌더 저장소 위치는 `REMOTION_ROOT` 로 옮길 수 있다(기본값은 sw/web-bo 의 형제인 sw/remotion).
 *
 * ## 이름 내력
 *
 * 팩션이 먼저 `FACTION_LOCAL` 로 만들었다. 담화가 붙으면서 시리즈마다 스위치를 따로 두면
 * 하나만 켜 놓고 다른 화면이 왜 안 되는지 찾는 일이 생긴다. 그래서 `REMOTION_LOCAL` 하나로 합치고,
 * **기존 `FACTION_LOCAL` 도 계속 인정한다**(이미 .env 에 그 이름으로 적혀 있다).
 * 둘 중 하나만 1 이면 켜진다.
 */

import { NextResponse } from 'next/server'

/** 렌더 저장소가 이 컴퓨터에 있는가. `REMOTION_LOCAL` 우선, 옛 이름 `FACTION_LOCAL` 도 인정 */
export const REMOTION_LOCAL =
  process.env.REMOTION_LOCAL === '1' || process.env.FACTION_LOCAL === '1'

const OFF_REASON =
  '로컬 자산 창구가 꺼져 있습니다. 이 기능은 렌더 저장소(sw/remotion)가 같은 컴퓨터에 있을 때만 동작합니다. '
  + 'sw/web-bo/.env 에 REMOTION_LOCAL=1 을 넣고 개발 서버를 다시 띄우세요.'

/** 창구 진입 가드 — 꺼져 있으면 503 + 사유. 켜져 있으면 null(통과) */
export function remotionLocalGuard(): NextResponse | null {
  if (REMOTION_LOCAL) return null
  return NextResponse.json({ error: OFF_REASON, remotionLocal: false, factionLocal: false }, { status: 503 })
}

/** 서버 액션용 — 꺼져 있으면 던진다 */
export function assertRemotionLocal(): void {
  if (!REMOTION_LOCAL) throw new Error(OFF_REASON)
}
