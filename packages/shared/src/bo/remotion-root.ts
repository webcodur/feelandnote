/**
 * 렌더 저장소(sw/remotion) 뿌리 — 서버 전용.
 *
 * 에피소드 사진·음원·데이터 파일은 모두 이 폴더 안에 있다. 관리 화면이 어느 앱에서 돌든
 * 같은 폴더를 가리켜야 하므로, 실행 위치에 기대지 않도록 환경변수로 덮어쓸 수 있게 둔다.
 *   REMOTION_ROOT=D:/repo/sw/remotion
 * 지정이 없으면 앱 폴더(sw/<앱>)의 형제인 sw/remotion 으로 본다 — 기존 동작과 같다.
 */

import path from 'path'

export const REMOTION_ROOT = process.env.REMOTION_ROOT
  ? path.resolve(process.env.REMOTION_ROOT)
  : path.join(process.cwd(), '..', 'remotion')
