import { rgb } from "../drawUtils";

/**
 * Wall-mounted torch with bracket, stick, flame, and ambient light.
 * tx,ty = flame base position (where stick meets flame).
 * size  = reference size for all parts (scale-aware).
 * side  = -1 (left wall) or +1 (right wall) — bracket faces inward.
 */
export function drawTorch(
  c: CanvasRenderingContext2D,
  tx: number, ty: number,
  size: number, alpha: number,
  time: number, idx: number,
  side: number  // +1: 벽이 왼쪽(브라켓 오른쪽으로), -1: 벽이 오른쪽
) {
  if (size < 0.5 || alpha < 0.02) return;
  const t = time * 5 + idx * 3.1;
  const flick1 = 0.8 + 0.2 * Math.sin(t * 1.7);
  const flick2 = 0.85 + 0.15 * Math.sin(t * 2.3 + 1.2);
  const sway = Math.sin(t * 1.1) * size * 0.04;

  c.save();
  c.globalAlpha = alpha;

  // 기준점: tx,ty = 불꽃 밑동 위치. 벽쪽으로 side 방향.
  const bkLen = size * 0.55;       // 브라켓 벽→끝 길이
  const wallSideX = tx + side * bkLen; // 벽 부착점 X
  const bkThick = Math.max(1.8, size * 0.07);

  // ── 1. 주변 광원 (가장 먼저, 뒤에 깔림) ──
  const ambR = size * 3;
  const ambGrad = c.createRadialGradient(tx, ty - size * 0.2, 0, tx, ty, ambR);
  ambGrad.addColorStop(0, `rgba(255,170,60,${0.10 * flick1})`);
  ambGrad.addColorStop(0.35, `rgba(255,140,40,${0.04 * flick1})`);
  ambGrad.addColorStop(1, "rgba(255,120,30,0)");
  c.fillStyle = ambGrad;
  c.beginPath(); c.arc(tx, ty, ambR, 0, Math.PI * 2); c.fill();

  // ── 2. 철제 브라켓 ──
  const cupY = ty + size * 0.18;
  c.lineCap = "round";
  c.lineJoin = "round";

  // 벽 부착판 (작은 세로 바)
  c.fillStyle = rgb([35, 32, 28], 1);
  const plateW = bkThick * 1.8;
  const plateH = bkLen * 0.5;
  c.fillRect(wallSideX - plateW * 0.5, cupY - plateH * 0.6, plateW, plateH);

  // 수평 암 (벽→컵)
  c.strokeStyle = rgb([50, 44, 38], 1);
  c.lineWidth = bkThick;
  c.beginPath();
  c.moveTo(wallSideX, cupY);
  c.lineTo(tx, cupY);
  c.stroke();
  // 암 하이라이트 (윗면)
  c.strokeStyle = rgb([70, 62, 52], 0.5);
  c.lineWidth = Math.max(0.5, bkThick * 0.3);
  c.beginPath();
  c.moveTo(wallSideX, cupY - bkThick * 0.4);
  c.lineTo(tx, cupY - bkThick * 0.4);
  c.stroke();

  // 대각 보강대 (벽 위→암 중간)
  c.strokeStyle = rgb([50, 44, 38], 1);
  c.lineWidth = bkThick * 0.6;
  c.beginPath();
  c.moveTo(wallSideX, cupY - bkLen * 0.55);
  c.lineTo(tx + side * bkLen * 0.25, cupY);
  c.stroke();

  // 컵 (U자 받침 — 횃불봉을 잡는 고리)
  const cupR = size * 0.09;
  c.strokeStyle = rgb([55, 48, 40], 1);
  c.lineWidth = bkThick * 0.9;
  c.beginPath();
  c.arc(tx, cupY + cupR * 0.3, cupR, Math.PI * 0.15, Math.PI * 0.85);
  c.stroke();

  // ── 3. 횃불봉 (나무 막대) ──
  const stickBot = cupY + cupR * 0.2;
  const stickTop = ty - size * 0.12;
  const stickW = Math.max(1.2, size * 0.035);

  // 봉 본체 (약간 아래가 굵음)
  c.fillStyle = rgb([60, 38, 20], 1);
  c.beginPath();
  c.moveTo(tx - stickW * 0.7, stickTop);
  c.lineTo(tx + stickW * 0.7, stickTop);
  c.lineTo(tx + stickW, stickBot);
  c.lineTo(tx - stickW, stickBot);
  c.closePath();
  c.fill();
  // 봉 하이라이트 (왼쪽 면)
  c.fillStyle = rgb([85, 60, 35], 0.4);
  c.fillRect(tx - stickW * 0.3, stickTop, stickW * 0.5, stickBot - stickTop);

  // 감은 천 (2줄)
  c.fillStyle = rgb([80, 58, 32], 0.7);
  const wrapH = Math.max(1.5, stickW * 1.8);
  for (const ratio of [0.2, 0.5]) {
    const wy = stickTop + (stickBot - stickTop) * ratio;
    c.fillRect(tx - stickW * 1.2, wy, stickW * 2.4, wrapH);
  }

  // ── 4. 불꽃 (3레이어 물방울) ──
  const flameBase = stickTop;
  const flameH = size * 0.45 * flick1;
  const flameW = size * 0.16 * flick2;

  const tearDrop = (cx: number, baseY: number, w: number, h: number) => {
    c.beginPath();
    c.moveTo(cx, baseY - h);
    c.quadraticCurveTo(cx + w * 1.1, baseY - h * 0.3, cx + w, baseY);
    c.quadraticCurveTo(cx, baseY + h * 0.06, cx - w, baseY);
    c.quadraticCurveTo(cx - w * 1.1, baseY - h * 0.3, cx, baseY - h);
    c.closePath();
  };

  // 외부 불꽃 (어두운 주황-빨강)
  tearDrop(tx + sway, flameBase, flameW * 1.3, flameH * 1.1);
  const outerGrad = c.createLinearGradient(tx, flameBase, tx, flameBase - flameH * 1.1);
  outerGrad.addColorStop(0, `rgba(220,100,20,${0.65 * flick1})`);
  outerGrad.addColorStop(0.5, `rgba(255,140,30,${0.55 * flick1})`);
  outerGrad.addColorStop(1, `rgba(255,80,10,${0.08})`);
  c.fillStyle = outerGrad;
  c.fill();

  // 중간 불꽃 (주황-노랑)
  tearDrop(tx + sway * 0.6, flameBase, flameW, flameH * 0.85);
  const midGrad = c.createLinearGradient(tx, flameBase, tx, flameBase - flameH * 0.85);
  midGrad.addColorStop(0, `rgba(255,180,40,${0.75 * flick2})`);
  midGrad.addColorStop(0.6, `rgba(255,220,80,${0.65 * flick2})`);
  midGrad.addColorStop(1, `rgba(255,200,50,${0.12})`);
  c.fillStyle = midGrad;
  c.fill();

  // 핵심 불꽃 (밝은 백-노랑)
  tearDrop(tx + sway * 0.3, flameBase, flameW * 0.45, flameH * 0.5);
  const coreGrad = c.createLinearGradient(tx, flameBase, tx, flameBase - flameH * 0.5);
  coreGrad.addColorStop(0, `rgba(255,255,220,${0.85 * flick1})`);
  coreGrad.addColorStop(0.5, `rgba(255,240,160,${0.65})`);
  coreGrad.addColorStop(1, `rgba(255,220,100,${0.08})`);
  c.fillStyle = coreGrad;
  c.fill();

  c.restore();
}
