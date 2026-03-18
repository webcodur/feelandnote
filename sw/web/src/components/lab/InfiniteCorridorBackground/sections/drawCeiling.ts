import { quad, stoneHash } from "../drawUtils";
import { CEIL_COL, TOTAL_DEPTH, BG_R, BG_G, BG_B } from "../constants";

/**
 * 볼트 천장 — 중앙 릿지가 약간 밝고 좌우 스프링라인이 어두운 크로스볼트 느낌.
 * 가까운 세그먼트: 가로 리브(골조) 줄눈 + 돌 얼룩.
 */
export function drawCeiling(
  c: CanvasRenderingContext2D,
  z0: number, z1: number,
  alpha: number, isClose: boolean, segIdx: number,
  tl0: { sx: number; sy: number },
  tr0: { sx: number; sy: number },
  tl1: { sx: number; sy: number },
  tr1: { sx: number; sy: number },
) {
  const f = alpha;

  // 1. 베이스 — 좌우→중앙 그라데이션 (좌우 어두움, 중앙 약간 밝음 = 볼트 릿지)
  const midX0 = (tl0.sx + tr0.sx) * 0.5;
  const edgeR = Math.round(BG_R + (CEIL_COL.deep[0] - BG_R) * f);
  const edgeG = Math.round(BG_G + (CEIL_COL.deep[1] - BG_G) * f);
  const edgeB = Math.round(BG_B + (CEIL_COL.deep[2] - BG_B) * f);
  const ridgeR = Math.round(BG_R + (CEIL_COL.base[0] + 6 - BG_R) * f);
  const ridgeG = Math.round(BG_G + (CEIL_COL.base[1] + 6 - BG_G) * f);
  const ridgeB = Math.round(BG_B + (CEIL_COL.base[2] + 5 - BG_B) * f);

  const ceilGrad = c.createLinearGradient(tl0.sx, tl0.sy, tr0.sx, tl0.sy);
  ceilGrad.addColorStop(0, `rgb(${edgeR},${edgeG},${edgeB})`);
  ceilGrad.addColorStop(0.4, `rgb(${ridgeR},${ridgeG},${ridgeB})`);
  ceilGrad.addColorStop(0.6, `rgb(${ridgeR},${ridgeG},${ridgeB})`);
  ceilGrad.addColorStop(1, `rgb(${edgeR},${edgeG},${edgeB})`);
  quad(c,
    tl0.sx, tl0.sy, tr0.sx, tr0.sy,
    tr1.sx, tr1.sy, tl1.sx, tl1.sy,
    ceilGrad
  );

  if (!isClose) return;

  // 2. 리브(횡 골조) — 세그먼트 경계에 하나, 밝은 선
  const ribR = Math.round(BG_R + (CEIL_COL.base[0] + 12 - BG_R) * f);
  const ribG = Math.round(BG_G + (CEIL_COL.base[1] + 12 - BG_G) * f);
  const ribB = Math.round(BG_B + (CEIL_COL.base[2] + 10 - BG_B) * f);
  c.strokeStyle = `rgb(${ribR},${ribG},${ribB})`;
  c.lineWidth = Math.max(1, 2.5 * (1 - Math.max(0, z0 / TOTAL_DEPTH)));
  c.beginPath();
  c.moveTo(tl0.sx, tl0.sy);
  c.lineTo(tr0.sx, tr0.sy);
  c.stroke();

  // 3. 릿지라인 (중앙 종축선) — 미세한 밝은 선
  const midY0 = tl0.sy;
  const midY1 = tl1.sy;
  const mid1X = (tl1.sx + tr1.sx) * 0.5;
  c.strokeStyle = `rgba(${ribR},${ribG},${ribB},0.4)`;
  c.lineWidth = Math.max(0.5, 1.5 * (1 - Math.max(0, z0 / TOTAL_DEPTH)));
  c.beginPath();
  c.moveTo(midX0, midY0);
  c.lineTo(mid1X, midY1);
  c.stroke();

  // 4. 돌 얼룩 (벽면과 동일 방식, 더 적고 어둡게)
  const PATCHES = 4;
  for (let i = 0; i < PATCHES; i++) {
    const h1 = stoneHash(segIdx * 200, i, 10);
    const h2 = stoneHash(segIdx * 200, i, 11);
    const h3 = stoneHash(segIdx * 200, i, 12);

    // 천장 면 내 보간 위치
    const tU = h1 * 0.8 + 0.1; // left-right (0~1)
    const tV = h2 * 0.8 + 0.1; // near-far (0~1)

    // 4점 보간
    const sx = tl0.sx + (tr0.sx - tl0.sx) * tU
      + (tl1.sx + (tr1.sx - tl1.sx) * tU - (tl0.sx + (tr0.sx - tl0.sx) * tU)) * tV;
    const sy = tl0.sy + (tr0.sy - tl0.sy) * tU
      + (tl1.sy + (tr1.sy - tl1.sy) * tU - (tl0.sy + (tr0.sy - tl0.sy) * tU)) * tV;

    const patchSize = Math.max(1.5, Math.abs(tl0.sx - tr0.sx) * 0.06 * (1 - tV * 0.5));
    if (patchSize < 1) continue;

    const dark = h3 > 0.4; // 대부분 어두운 얼룩
    c.globalAlpha = dark ? 0.12 : 0.06;
    c.fillStyle = dark
      ? `rgb(${BG_R},${BG_G},${BG_B})`
      : `rgb(${ridgeR},${ridgeG},${ridgeB})`;
    c.beginPath();
    c.ellipse(sx, sy, patchSize, patchSize * 0.6, h1 * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}
