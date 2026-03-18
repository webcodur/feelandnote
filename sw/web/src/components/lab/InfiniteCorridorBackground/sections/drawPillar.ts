import { project, quad, rgb } from "../drawUtils";
import {
  PILLAR_COL, PILLAR_PROTRUDE, PILLAR_Z_THICK,
  SEG_DEPTH, TOTAL_DEPTH, BG_R, BG_G, BG_B,
} from "../constants";

/**
 * 필라스터 — 벽면에서 회랑 안쪽으로 돌출된 3D 직사각 기둥.
 * 두 면을 그린다:
 *   - side face (z=z0 면): 벽→안쪽 돌출부의 두께가 보이는 면
 *   - front face (안쪽 면): Z축 방향으로 뻗는 기둥 정면
 */
export function drawPillar3D(
  c: CanvasRenderingContext2D,
  wallX: number,    // 벽 X좌표 (±WALL_HALF_W)
  sign: number,     // +1: 좌벽(안쪽→오른쪽), -1: 우벽(안쪽→왼쪽)
  z: number,        // 기둥 앞면 Z
  alpha: number,
  isClose: boolean,
  WALL_HALF_W: number, WALL_TOP: number, WALL_BOT: number,
  vpX: number, vpY: number, fovEff: number
) {
  const protrude = WALL_HALF_W * PILLAR_PROTRUDE;
  const zThick = SEG_DEPTH * PILLAR_Z_THICK;
  const innerX = wallX + sign * protrude;
  const zBack = z + zThick;

  // 기단/주두 비율
  const baseRatio = 0.06;
  const capRatio = 0.06;
  const baseProtrude = protrude * 1.1;
  const capProtrude = protrude * 1.08;
  // 기단/주두 Z방향 확장 (주신보다 앞뒤로 돌출)
  const zPad = zThick * 0.06;
  const zBaseFront = z - zPad;
  const zBaseBack = zBack + zPad;
  const zCapFront = z - zPad;
  const zCapBack = zBack + zPad;

  const yBase = WALL_BOT - (WALL_BOT - WALL_TOP) * baseRatio;
  const yCap = WALL_TOP + (WALL_BOT - WALL_TOP) * capRatio;
  const innerXBase = wallX + sign * baseProtrude;
  const innerXCap = wallX + sign * capProtrude;

  c.globalAlpha = 1;

  // 거리 기반 대비 감쇠 — 후방 기둥은 BG쪽으로 수렴
  const depthT = Math.max(0, z / TOTAL_DEPTH);
  const contrast = Math.pow(1 - depthT, 0.6); // 1=가까움(풀 대비), 0=먼곳(BG)
  // 거리 보정 색상 헬퍼: 원색→BG로 lerp
  const pCol = (col: readonly number[]) => {
    const r = Math.round(BG_R + (col[0] - BG_R) * contrast);
    const g = Math.round(BG_G + (col[1] - BG_G) * contrast);
    const b = Math.round(BG_B + (col[2] - BG_B) * contrast);
    return `rgb(${r},${g},${b})`;
  };
  // 차가운 side face 색상 (blue shift)
  const pColCool = (col: readonly number[]) => {
    const r = Math.round(BG_R + (col[0] * 0.85 - BG_R) * contrast);
    const g = Math.round(BG_G + (col[1] * 0.9 - BG_G) * contrast);
    const b = Math.round(BG_B + (Math.min(255, col[2] * 1.1) - BG_B) * contrast);
    return `rgb(${r},${g},${b})`;
  };
  // 따뜻한 front highlight (warm shift)
  const pColWarm = (col: readonly number[]) => {
    const r = Math.round(BG_R + (Math.min(255, col[0] * 1.1) - BG_R) * contrast);
    const g = Math.round(BG_G + (col[1] * 1.0 - BG_G) * contrast);
    const b = Math.round(BG_B + (col[2] * 0.85 - BG_B) * contrast);
    return `rgb(${r},${g},${b})`;
  };

  // ===== FRONT FACE (주 면, 회랑 중앙을 향함) =====

  // 기단 front (Z방향 확장)
  const bfNt = project(innerXBase, yBase, zBaseFront, vpX, vpY, fovEff);
  const bfNb = project(innerXBase, WALL_BOT, zBaseFront, vpX, vpY, fovEff);
  const bfFt = project(innerXBase, yBase, zBaseBack, vpX, vpY, fovEff);
  const bfFb = project(innerXBase, WALL_BOT, zBaseBack, vpX, vpY, fovEff);
  quad(c, bfNt.sx, bfNt.sy, bfFt.sx, bfFt.sy, bfFb.sx, bfFb.sy, bfNb.sx, bfNb.sy,
    pCol(PILLAR_COL.mid));

  // 주신 front — Z방향 수평 그라데이션 (중앙 따뜻하게, 양끝 어둡게)
  const sfNt = project(innerX, yCap, z, vpX, vpY, fovEff);
  const sfNb = project(innerX, yBase, z, vpX, vpY, fovEff);
  const sfFt = project(innerX, yCap, zBack, vpX, vpY, fovEff);
  const sfFb = project(innerX, yBase, zBack, vpX, vpY, fovEff);
  const shaftGrad = c.createLinearGradient(sfNt.sx, sfNt.sy, sfFt.sx, sfFt.sy);
  shaftGrad.addColorStop(0, pCol(PILLAR_COL.mid));
  shaftGrad.addColorStop(0.35, pColWarm(PILLAR_COL.highlight));
  shaftGrad.addColorStop(0.55, pCol(PILLAR_COL.light));
  shaftGrad.addColorStop(1, pCol(PILLAR_COL.dark));
  quad(c, sfNt.sx, sfNt.sy, sfFt.sx, sfFt.sy, sfFb.sx, sfFb.sy, sfNb.sx, sfNb.sy,
    shaftGrad);

  // 주두 front (Z방향 확장)
  const cfNt = project(innerXCap, WALL_TOP, zCapFront, vpX, vpY, fovEff);
  const cfNb = project(innerXCap, yCap, zCapFront, vpX, vpY, fovEff);
  const cfFt = project(innerXCap, WALL_TOP, zCapBack, vpX, vpY, fovEff);
  const cfFb = project(innerXCap, yCap, zCapBack, vpX, vpY, fovEff);
  const capGrad = c.createLinearGradient(cfNt.sx, cfNt.sy, cfFt.sx, cfFt.sy);
  capGrad.addColorStop(0, pCol(PILLAR_COL.light));
  capGrad.addColorStop(0.4, pColWarm(PILLAR_COL.highlight));
  capGrad.addColorStop(1, pCol(PILLAR_COL.mid));
  quad(c, cfNt.sx, cfNt.sy, cfFt.sx, cfFt.sy, cfFb.sx, cfFb.sy, cfNb.sx, cfNb.sy,
    capGrad);

  // === 플루팅 (세로 홈) — 가까운 세그먼트만 ===
  if (isClose) {
    const FLUTES = 3;
    for (let fi = 1; fi <= FLUTES; fi++) {
      const t = fi / (FLUTES + 1);
      const fz = z + zThick * t;
      const ft = project(innerX, yCap, fz, vpX, vpY, fovEff);
      const fb = project(innerX, yBase, fz, vpX, vpY, fovEff);
      // 홈 그림자 (어두운 선)
      c.strokeStyle = rgb(PILLAR_COL.dark, 0.35);
      c.lineWidth = Math.max(0.5, 1.2 * ft.scale);
      c.beginPath(); c.moveTo(ft.sx, ft.sy); c.lineTo(fb.sx, fb.sy); c.stroke();
      // 홈 옆 하이라이트 (밝은 선, 1px 오프셋)
      const hlOff = Math.max(0.5, 0.8 * ft.scale);
      c.strokeStyle = rgb(PILLAR_COL.highlight, 0.15);
      c.lineWidth = Math.max(0.3, 0.6 * ft.scale);
      c.beginPath(); c.moveTo(ft.sx + hlOff, ft.sy); c.lineTo(fb.sx + hlOff, fb.sy); c.stroke();
    }
  }

  // === 몰딩 라인 (주두↔주신, 주신↔기단 경계) ===
  if (isClose) {
    c.lineWidth = Math.max(0.5, 1.5 * sfNt.scale);
    // 주두 하단 — 밝은 선 (받침 역할)
    const capLineN = project(innerXCap, yCap, zCapFront, vpX, vpY, fovEff);
    const capLineF = project(innerXCap, yCap, zCapBack, vpX, vpY, fovEff);
    c.strokeStyle = rgb(PILLAR_COL.highlight, 0.5);
    c.beginPath(); c.moveTo(capLineN.sx, capLineN.sy); c.lineTo(capLineF.sx, capLineF.sy); c.stroke();
    // 주두 하단 그림자 (1px 아래)
    c.strokeStyle = rgb(PILLAR_COL.dark, 0.4);
    c.beginPath(); c.moveTo(capLineN.sx, capLineN.sy + 1.5); c.lineTo(capLineF.sx, capLineF.sy + 1); c.stroke();

    // 기단 상단 — 밝은 선
    const baseLineN = project(innerXBase, yBase, zBaseFront, vpX, vpY, fovEff);
    const baseLineF = project(innerXBase, yBase, zBaseBack, vpX, vpY, fovEff);
    c.strokeStyle = rgb(PILLAR_COL.highlight, 0.4);
    c.beginPath(); c.moveTo(baseLineN.sx, baseLineN.sy); c.lineTo(baseLineF.sx, baseLineF.sy); c.stroke();
    // 기단 상단 그림자
    c.strokeStyle = rgb(PILLAR_COL.dark, 0.3);
    c.beginPath(); c.moveTo(baseLineN.sx, baseLineN.sy - 1.5); c.lineTo(baseLineF.sx, baseLineF.sy - 1); c.stroke();
  }

  // ===== SIDE FACE (z = z 앞면, 보조 그림자) =====

  // 기단 side (확장된 Z)
  const bsWt = project(wallX, yBase, zBaseFront, vpX, vpY, fovEff);
  const bsWb = project(wallX, WALL_BOT, zBaseFront, vpX, vpY, fovEff);
  const bsIt = project(innerXBase, yBase, zBaseFront, vpX, vpY, fovEff);
  const bsIb = project(innerXBase, WALL_BOT, zBaseFront, vpX, vpY, fovEff);
  quad(c, bsWt.sx, bsWt.sy, bsIt.sx, bsIt.sy, bsIb.sx, bsIb.sy, bsWb.sx, bsWb.sy,
    pColCool(PILLAR_COL.dark));

  // 주신 side — 차가운 톤
  const ssWt = project(wallX, yCap, z, vpX, vpY, fovEff);
  const ssWb = project(wallX, yBase, z, vpX, vpY, fovEff);
  const ssIt = project(innerX, yCap, z, vpX, vpY, fovEff);
  const ssIb = project(innerX, yBase, z, vpX, vpY, fovEff);
  quad(c, ssWt.sx, ssWt.sy, ssIt.sx, ssIt.sy, ssIb.sx, ssIb.sy, ssWb.sx, ssWb.sy,
    pColCool(PILLAR_COL.dark));

  // 주두 side — 차가운 톤 (확장된 Z)
  const csWt = project(wallX, WALL_TOP, zCapFront, vpX, vpY, fovEff);
  const csWb = project(wallX, yCap, zCapFront, vpX, vpY, fovEff);
  const csIt = project(innerXCap, WALL_TOP, zCapFront, vpX, vpY, fovEff);
  const csIb = project(innerXCap, yCap, zCapFront, vpX, vpY, fovEff);
  quad(c, csWt.sx, csWt.sy, csIt.sx, csIt.sy, csIb.sx, csIb.sy, csWb.sx, csWb.sy,
    pColCool(PILLAR_COL.mid));

  c.globalAlpha = 1;
}
