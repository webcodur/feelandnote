/*
  파일명: components/features/game/myth/troy/ui/battle/camera.ts
  기능: 트로이 전쟁 싸움판 카메라 도움
  책임: 세로 화면에서 판을 여는 확대와 우리 편 가운데를 정하고, 연출할 칸이 화면 밖(또는 윗줄·아래 칸에 가린 곳)이면 그쪽으로 카메라를 옮긴다.
*/ // ------------------------------
import type { BattleState, Point } from "../../engine";
import type { BoardView } from "../../scene/BoardView";

// 세로 화면에서 여는 확대. 0.45 가까이 당기면 판 끝 너머 빈 하늘이 비치지 않게 가둔다(scene/cameraFit.ts centerWeight)
export const PORTRAIT_ZOOM = 0.46;
// 세로 화면에서 윗줄·아래 칸에 가리는 몫(CSS 픽셀)
const EDGE = { side: 28, top: 88, bottom: 170 };
const SETTLE_MS = 380;

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth * 1.2;
}

// 우리 편 가운데에서 적 쪽(위)으로 한 칸 — 싸움이 붙는 곳을 보여 준다
export function armyCenter(state: BattleState): Point {
  const mine = state.units.filter((u) => u.side === "player");
  if (mine.length === 0) return { x: Math.floor(state.map.width / 2), y: Math.floor(state.map.height / 2) };
  const avg = (pick: (u: (typeof mine)[number]) => number) => Math.round(mine.reduce((sum, u) => sum + pick(u), 0) / mine.length);
  return { x: avg((u) => u.x), y: Math.max(0, avg((u) => u.y) - 1) };
}

// p가 잘 보이지 않으면 카메라를 옮기고 자리 잡을 때까지 기다린다
export async function follow(view: BoardView, p: Point): Promise<void> {
  const at = view.screenOf(p);
  const margin = isPortrait() ? EDGE : { side: 0, top: 0, bottom: 0 };
  const inside = at !== null && at.x > margin.side && at.x < window.innerWidth - margin.side && at.y > margin.top && at.y < window.innerHeight - margin.bottom;
  if (inside) return;
  view.focusOn(p, true);
  await new Promise<void>((resolve) => window.setTimeout(resolve, SETTLE_MS / Math.max(1, view.speed)));
}
