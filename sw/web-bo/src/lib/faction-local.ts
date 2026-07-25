/**
 * 세력도 로컬 자산 접근 가드 — 서버 전용.
 *
 * 세력도의 사진(2,245장)·음원(443개 297MB)은 렌더 저장소(sw/remotion/public/factions/)에 그대로 두고
 * DB 로 옮기지 않는다(문서 §0). 그래서 그 파일을 만지는 창구는 **개발자 컴퓨터에서만** 살아야 한다.
 * 배포된 백오피스에는 그 폴더가 없으므로, 열려 있으면 실패가 아니라 조용한 오작동이 된다.
 *
 * 켜는 방법: `sw/web-bo/.env` 에 `FACTION_LOCAL=1`.
 * 렌더 저장소 위치는 `REMOTION_ROOT` 로 옮길 수 있다(기본값은 sw/web-bo 의 형제인 sw/remotion).
 */

import { NextResponse } from 'next/server'

export const FACTION_LOCAL = process.env.FACTION_LOCAL === '1'

const OFF_REASON =
  '로컬 자산 창구가 꺼져 있습니다. 이 기능은 렌더 저장소(sw/remotion)가 같은 컴퓨터에 있을 때만 동작합니다. '
  + 'sw/web-bo/.env 에 FACTION_LOCAL=1 을 넣고 개발 서버를 다시 띄우세요.'

/** 창구 진입 가드 — 꺼져 있으면 503 + 사유. 켜져 있으면 null(통과) */
export function factionLocalGuard(): NextResponse | null {
  if (FACTION_LOCAL) return null
  return NextResponse.json({ error: OFF_REASON, factionLocal: false }, { status: 503 })
}

/** 서버 액션용 — 꺼져 있으면 던진다 */
export function assertFactionLocal(): void {
  if (!FACTION_LOCAL) throw new Error(OFF_REASON)
}
