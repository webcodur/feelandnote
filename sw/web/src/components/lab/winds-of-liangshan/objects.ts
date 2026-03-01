import type { SceneContext } from "./types";
import { WARM_SUN, scrollWrap } from "./types";

// ─── 수정(水亭) 정자 — 수묵화 실루엣 ───

function drawPavilion(c: CanvasRenderingContext2D, s: SceneContext) {
  const { W, wt: top, scroll } = s;

  const px = scrollWrap(W * 0.82, scroll, W);
  const py = top + 30;
  const sc = Math.max(W / 1920, 0.6);

  const totalH = 68 * sc;
  const roofH = totalH * 0.35;
  const pillarH = totalH * 0.55;
  const platH = totalH * 0.10;

  const pillarColor = "rgba(20, 35, 30, 0.85)";
  const roofColor = "rgba(15, 25, 22, 0.9)";
  const platColor = "rgba(12, 22, 18, 0.9)";

  const platTop = py;
  const platBot = platTop + platH;
  const pillarTop = platTop - pillarH;
  const roofBase = pillarTop;
  const roofPeak = roofBase - roofH;

  // 수면 그림자
  c.save();
  c.globalAlpha = 0.15;
  c.fillStyle = "rgba(0, 30, 20, 1)";
  c.filter = "blur(3px)";
  c.beginPath();
  c.ellipse(px + 3 * sc, platBot + 5 * sc, 54 * sc, 8 * sc, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // 플랫폼
  c.fillStyle = platColor;
  c.beginPath();
  c.moveTo(px - 48 * sc, platTop);
  c.lineTo(px + 46 * sc, platTop);
  c.lineTo(px + 49 * sc, platTop + platH * 0.35);
  c.lineTo(px + 44 * sc, platBot);
  c.lineTo(px - 46 * sc, platBot);
  c.lineTo(px - 51 * sc, platTop + platH * 0.55);
  c.closePath();
  c.fill();

  // 기둥
  const pillarW = 4 * sc;
  const pillars = [-38, -18, 0, 18, 38];
  const waterDepth = 20 * sc;

  for (const off of pillars) {
    c.fillStyle = pillarColor;
    c.fillRect(px + off * sc - pillarW / 2, pillarTop, pillarW, pillarH + platH);
  }

  // 수중 기둥
  for (const off of pillars) {
    const colX = px + off * sc - pillarW / 2;
    const subGrad = c.createLinearGradient(0, platBot, 0, platBot + waterDepth);
    subGrad.addColorStop(0, "rgba(50, 80, 70, 0.5)");
    subGrad.addColorStop(0.5, "rgba(50, 80, 70, 0.2)");
    subGrad.addColorStop(1, "rgba(50, 80, 70, 0.02)");
    c.fillStyle = subGrad;
    c.fillRect(colX - 1, platBot, pillarW + 2, waterDepth);
  }

  // 난간
  c.lineWidth = 1.5 * sc;
  c.strokeStyle = pillarColor;
  const railY = platTop - 12 * sc;
  c.beginPath();
  c.moveTo(px - 38 * sc, railY);
  c.lineTo(px + 38 * sc, railY);
  c.stroke();
  c.beginPath();
  c.moveTo(px - 38 * sc, railY + 7 * sc);
  c.lineTo(px + 38 * sc, railY + 7 * sc);
  c.stroke();
  for (const rp of [-30, -22, -10, -5, 5, 10, 22, 30]) {
    c.beginPath();
    c.moveTo(px + rp * sc, railY);
    c.lineTo(px + rp * sc, railY + 7 * sc);
    c.stroke();
  }

  // 지붕
  const eaveOut = 58 * sc;
  const eaveFlip = 8 * sc;
  const roofThick = 2.5 * sc;

  c.fillStyle = roofColor;
  c.beginPath();
  c.moveTo(px - eaveOut, roofBase + eaveFlip);
  c.quadraticCurveTo(px - eaveOut * 0.45, roofBase - 3 * sc, px, roofPeak);
  c.quadraticCurveTo(px + eaveOut * 0.45, roofBase - 3 * sc, px + eaveOut, roofBase + eaveFlip);
  c.lineTo(px + eaveOut - 2 * sc, roofBase + eaveFlip + roofThick);
  c.quadraticCurveTo(px + eaveOut * 0.45, roofBase + roofThick + 1 * sc, px, roofBase + roofThick - 1 * sc);
  c.quadraticCurveTo(px - eaveOut * 0.45, roofBase + roofThick + 1 * sc, px - eaveOut + 2 * sc, roofBase + eaveFlip + roofThick);
  c.closePath();
  c.fill();

  // 지붕 하부 음영
  c.fillStyle = "rgba(0, 20, 15, 0.1)";
  c.beginPath();
  c.moveTo(px - eaveOut + 5 * sc, roofBase + eaveFlip + roofThick);
  c.quadraticCurveTo(px, roofBase + roofThick + 2 * sc, px + eaveOut - 5 * sc, roofBase + eaveFlip + roofThick);
  c.lineTo(px + eaveOut - 8 * sc, roofBase + eaveFlip + roofThick + 3 * sc);
  c.lineTo(px - eaveOut + 8 * sc, roofBase + eaveFlip + roofThick + 3 * sc);
  c.closePath();
  c.fill();

  // 치미 + 보주
  c.fillStyle = roofColor;
  c.fillRect(px - eaveOut - 2 * sc, roofBase + eaveFlip - 3 * sc, 4 * sc, 3 * sc);
  c.fillRect(px + eaveOut - 2 * sc, roofBase + eaveFlip - 3 * sc, 4 * sc, 3 * sc);
  c.beginPath();
  c.arc(px, roofPeak - 2.8 * sc, 2.8 * sc, 0, Math.PI * 2);
  c.fill();
  c.fillRect(px - 1.2 * sc, roofPeak, 2.4 * sc, 3.5 * sc);

  // 림라이트
  c.save();
  c.globalCompositeOperation = "screen";
  c.strokeStyle = `${WARM_SUN} 0.8)`;
  c.globalAlpha = 0.3;
  c.lineWidth = 2 * sc;
  for (const off of [18, 38]) {
    c.beginPath();
    c.moveTo(px + off * sc + pillarW / 2, pillarTop);
    c.lineTo(px + off * sc + pillarW / 2, platTop);
    c.stroke();
  }
  c.lineWidth = 1 * sc;
  c.globalAlpha = 0.25;
  c.beginPath();
  c.moveTo(px + 15 * sc, roofBase - 5 * sc);
  c.quadraticCurveTo(px + eaveOut * 0.7, roofBase - 1 * sc, px + eaveOut, roofBase + eaveFlip);
  c.stroke();
  c.restore();
}

// ─── 옆모습 목선 + 노젓는 인물 ───

function drawBoatBody(
  c: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, t: number,
) {
  const half = w / 2;
  const hullH = w * 0.22;           // ↑ 두께 증가 (0.18 → 0.22)
  const deckY = cy - w * 0.02;
  const ink = "rgba(14, 22, 18, 0.92)";       // ↑ 더 진한 먹
  const inkDark = "rgba(6, 12, 8, 0.95)";     // 하부 전용
  const inkLight = "rgba(25, 38, 30, 0.75)";

  const stern = cx - half;
  const bow = cx + half;

  // 선수 끝 Y — 더 들어 올림
  const bowTipY = cy - hullH * 0.4;
  // 선미 끝 Y — 살짝 올림 (형태 포인트)
  const sternTipY = cy + hullH * 0.05;

  // ── 1. Hull — 볼록한 배 (곡률 증가) ──
  c.fillStyle = ink;
  c.beginPath();
  // 갑판선: 선미 → 선수
  c.moveTo(stern, sternTipY);
  c.quadraticCurveTo(cx - w * 0.2, deckY + w * 0.005, cx, deckY);
  c.quadraticCurveTo(cx + w * 0.28, deckY - w * 0.035, bow, bowTipY);
  // 용골선: 선수 → 선미 (깊은 배 — belly 확대)
  c.quadraticCurveTo(cx + w * 0.3, cy + hullH * 0.85, cx, cy + hullH * 0.72);
  c.quadraticCurveTo(cx - w * 0.3, cy + hullH * 0.65, stern, sternTipY);
  c.closePath();
  c.fill();

  // 선체 하부 쉐이딩 (더 어둡게 — 질량감)
  const hullShade = c.createLinearGradient(0, cy, 0, cy + hullH * 0.85);
  hullShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  hullShade.addColorStop(0.4, "rgba(0, 0, 0, 0.25)");
  hullShade.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  c.fillStyle = hullShade;
  c.beginPath();
  c.moveTo(stern, sternTipY);
  c.quadraticCurveTo(cx - w * 0.2, deckY + w * 0.005, cx, deckY);
  c.quadraticCurveTo(cx + w * 0.28, deckY - w * 0.035, bow, bowTipY);
  c.quadraticCurveTo(cx + w * 0.3, cy + hullH * 0.85, cx, cy + hullH * 0.72);
  c.quadraticCurveTo(cx - w * 0.3, cy + hullH * 0.65, stern, sternTipY);
  c.closePath();
  c.fill();

  // 수면 접점 음영 (물과 분리)
  c.save();
  c.globalAlpha = 0.3;
  c.strokeStyle = "rgba(0, 0, 0, 0.6)";
  c.lineWidth = Math.max(1.5, w * 0.01);
  c.beginPath();
  c.moveTo(stern + w * 0.05, cy + hullH * 0.3);
  c.quadraticCurveTo(cx, cy + hullH * 0.72, bow - w * 0.1, cy + hullH * 0.2);
  c.stroke();
  c.restore();

  // 수면 반사선 (밝은 — 물 분리)
  c.save();
  c.globalAlpha = 0.12;
  c.strokeStyle = "rgba(140, 180, 170, 0.5)";
  c.lineWidth = Math.max(0.8, w * 0.005);
  c.beginPath();
  c.moveTo(stern + w * 0.08, cy + hullH * 0.35);
  c.quadraticCurveTo(cx - w * 0.05, cy + hullH * 0.75, cx + w * 0.2, cy + hullH * 0.5);
  c.stroke();
  c.restore();

  // ── 2. Deck line — 강조 스트로크 ──
  c.strokeStyle = inkLight;
  c.lineWidth = Math.max(1.2, w * 0.009);
  c.beginPath();
  c.moveTo(stern + w * 0.05, deckY + w * 0.01);
  c.lineTo(bow - w * 0.08, deckY - w * 0.03);
  c.stroke();

  // ── 3. Cabin — 선미쪽 오프셋 ──
  const cabCx = cx - w * 0.14;
  const cabW = w * 0.36;
  const cabH = w * 0.18;
  const cabLeft = cabCx - cabW / 2;
  const cabRight = cabCx + cabW / 2;
  const cabTop = deckY - cabH;

  c.fillStyle = ink;
  c.beginPath();
  c.moveTo(cabLeft, deckY);
  c.lineTo(cabLeft + cabW * 0.06, cabTop + cabH * 0.18);
  c.quadraticCurveTo(cabCx + cabW * 0.05, cabTop, cabRight - cabW * 0.04, cabTop + cabH * 0.12);
  c.lineTo(cabRight, deckY);
  c.closePath();
  c.fill();

  // 선실 기둥
  c.strokeStyle = inkLight;
  c.lineWidth = Math.max(0.8, w * 0.005);
  for (const r of [-0.38, -0.08, 0.25]) {
    const px = cabCx + cabW * r;
    c.beginPath();
    c.moveTo(px, cabTop + cabH * 0.15);
    c.lineTo(px, deckY);
    c.stroke();
  }

  // ── 4. Roof — 비대칭 처마 ──
  const roofOvStern = w * 0.035;
  const roofOvBow = w * 0.09;
  const roofPeak = cabTop - w * 0.07;
  const roofThick = w * 0.022;

  c.fillStyle = "rgba(10, 18, 14, 0.94)";
  c.beginPath();
  c.moveTo(cabLeft - roofOvStern, cabTop + w * 0.008);
  c.quadraticCurveTo(cabCx - cabW * 0.08, roofPeak,
    cabCx + cabW * 0.2, roofPeak + w * 0.008);
  c.quadraticCurveTo(cabRight + roofOvBow * 0.4, roofPeak + w * 0.025,
    cabRight + roofOvBow, cabTop + w * 0.008);
  c.lineTo(cabRight + roofOvBow - w * 0.004, cabTop + w * 0.008 + roofThick);
  c.quadraticCurveTo(cabRight + roofOvBow * 0.4, roofPeak + w * 0.025 + roofThick,
    cabCx + cabW * 0.2, roofPeak + w * 0.008 + roofThick);
  c.quadraticCurveTo(cabCx - cabW * 0.08, roofPeak + roofThick,
    cabLeft - roofOvStern + w * 0.004, cabTop + w * 0.008 + roofThick);
  c.closePath();
  c.fill();

  // 처마 끝 장식
  c.strokeStyle = "rgba(10, 18, 14, 0.94)";
  c.lineWidth = Math.max(1, w * 0.008);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(cabLeft - roofOvStern + w * 0.004, cabTop + w * 0.012);
  c.quadraticCurveTo(cabLeft - roofOvStern - w * 0.006, cabTop - w * 0.002,
    cabLeft - roofOvStern - w * 0.008, cabTop - w * 0.018);
  c.stroke();
  c.beginPath();
  c.moveTo(cabRight + roofOvBow - w * 0.004, cabTop + w * 0.012);
  c.quadraticCurveTo(cabRight + roofOvBow + w * 0.015, cabTop - w * 0.01,
    cabRight + roofOvBow + w * 0.025, cabTop - w * 0.04);
  c.stroke();

  // ── 5. Human — 체중·관절·구조가 있는 인물 ──
  const hx = cx + w * 0.12;
  const hy = deckY;
  const row = Math.sin(t * 1.6);
  const lean = row * 0.025;

  c.save();
  c.translate(hx, hy);
  c.rotate(lean);
  c.fillStyle = inkDark;
  c.strokeStyle = inkDark;
  c.lineCap = "round";
  c.lineJoin = "round";

  const u = w * 0.01;   // 단위 길이

  // 머리 (옆모습, 약간 앞으로 — 삿갓 없이 둥근 머리)
  c.beginPath();
  c.ellipse(u * 0.5, -u * 7.5, u * 2.2, u * 2.6, 0.08, 0, Math.PI * 2);
  c.fill();

  // 목
  c.lineWidth = Math.max(1.5, u * 1.4);
  c.beginPath();
  c.moveTo(u * 0.3, -u * 5);
  c.lineTo(u * 0.1, -u * 4);
  c.stroke();

  // 어깨 라인 (명확한 수평)
  c.lineWidth = Math.max(1.8, u * 1.8);
  c.beginPath();
  c.moveTo(-u * 1.8, -u * 3.8);
  c.lineTo(u * 2.2, -u * 4);
  c.stroke();

  // 몸통 (등 S자 곡선 — 체중이 느껴지는 굽힘)
  c.lineWidth = Math.max(2.2, u * 2.4);
  c.beginPath();
  c.moveTo(u * 0.2, -u * 3.8);
  c.bezierCurveTo(u * 1.2, -u * 2, u * 0.8, -u * 0.5, u * 0, u * 0.8);
  c.stroke();

  // 앞다리 (체중 실림 — 굵고 수직에 가까움)
  c.lineWidth = Math.max(1.8, u * 1.8);
  c.beginPath();
  c.moveTo(u * 0.3, u * 0.5);
  c.lineTo(u * 0.5, u * 3.8);       // 무릎
  c.lineTo(u * 0.3, u * 5);         // 발
  c.stroke();

  // 뒷다리 (비체중 — 약간 뒤, 가늘게)
  c.lineWidth = Math.max(1.2, u * 1.3);
  c.beginPath();
  c.moveTo(-u * 0.3, u * 0.6);
  c.lineTo(-u * 0.8, u * 3.5);      // 무릎
  c.lineTo(-u * 0.3, u * 5);        // 발
  c.stroke();

  // 뒷팔 (어깨 → 팔꿈치 → 노 잡음, 굴곡 있게)
  const elbowRow = row * 0.3;
  c.lineWidth = Math.max(1.2, u * 1.3);
  c.beginPath();
  c.moveTo(-u * 1.5, -u * 3.6);                       // 어깨
  c.lineTo(-u * 0.5 + elbowRow, -u * 1.5);             // 팔꿈치
  c.lineTo(u * 2, -u * 0.5 + elbowRow * 0.5);          // 손 (노 근처)
  c.stroke();

  // 앞팔 (어깨 → 팔꿈치 → 노, 네거티브 스페이스 확보)
  c.lineWidth = Math.max(1.5, u * 1.6);
  c.beginPath();
  c.moveTo(u * 2, -u * 3.8);                           // 어깨
  c.lineTo(u * 3.5 + elbowRow * 0.5, -u * 2);          // 팔꿈치 (몸에서 떨어짐)
  c.lineTo(u * 2.5, -u * 0.3 + elbowRow * 0.5);        // 손 (노 근처)
  c.stroke();

  // 옷자락 흐름 (뒷쪽으로 나부낌)
  c.globalAlpha = 0.5;
  c.lineWidth = Math.max(0.8, u * 0.8);
  c.beginPath();
  c.moveTo(-u * 0.5, u * 0.2);
  c.quadraticCurveTo(-u * 2 - row * u, u * 1.5, -u * 2.5 - row * u * 0.5, u * 2.5);
  c.stroke();
  c.globalAlpha = 1;

  // ── 6. Oar (노) ──
  const oarAng = -0.5 + row * 0.35;
  const oarLen = w * 0.25;

  c.lineWidth = Math.max(1.5, u * 1.2);
  const oarStartX = u * 2.5;
  const oarStartY = -u * 0.4;
  c.beginPath();
  c.moveTo(oarStartX, oarStartY);
  const oarEndX = oarStartX + Math.cos(oarAng) * oarLen;
  const oarEndY = oarStartY + Math.sin(oarAng) * oarLen;
  c.lineTo(oarEndX, oarEndY);
  c.stroke();

  // 패들 (노 끝 넓적)
  c.lineWidth = Math.max(2.5, u * 2.4);
  c.beginPath();
  c.moveTo(oarEndX, oarEndY);
  c.lineTo(
    oarEndX + Math.cos(oarAng) * w * 0.04,
    oarEndY + Math.sin(oarAng) * w * 0.04,
  );
  c.stroke();

  c.restore();

  // ── 물결 (노가 물에 닿을 때 — 선미 방향 ←) ──
  if (row < -0.2) {
    const intensity = Math.abs(row + 0.2) / 0.8;
    c.save();
    c.strokeStyle = "rgba(60, 90, 80, 0.3)";
    c.lineWidth = Math.max(0.8, w * 0.005);
    for (let i = 0; i < 4; i++) {
      const sx = cx - w * 0.05 - i * w * 0.05;
      const sy = cy + hullH * 0.12 + i * w * 0.008;
      c.globalAlpha = intensity * (0.45 - i * 0.1);
      c.beginPath();
      c.moveTo(sx, sy);
      c.quadraticCurveTo(sx - w * 0.025, sy - w * 0.01, sx - w * 0.05, sy + w * 0.004);
      c.stroke();
    }
    c.fillStyle = "rgba(80, 120, 100, 0.2)";
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = intensity * (0.35 - i * 0.06);
      c.beginPath();
      c.arc(
        cx - w * 0.08 - i * w * 0.04 - Math.random() * w * 0.03,
        cy + hullH * 0.06 + Math.random() * w * 0.04,
        w * 0.003 + Math.random() * w * 0.004, 0, Math.PI * 2,
      );
      c.fill();
    }
    c.restore();
  }

  // ── 7. Rim Light ──
  c.save();
  c.globalCompositeOperation = "screen";
  c.lineCap = "round";

  // 선수 상연
  c.strokeStyle = `${WARM_SUN} 0.45)`;
  c.lineWidth = Math.max(1.5, w * 0.011);
  c.beginPath();
  c.moveTo(cx + w * 0.1, deckY - w * 0.01);
  c.quadraticCurveTo(cx + w * 0.35, deckY - w * 0.04, bow, bowTipY);
  c.stroke();

  // 선수 끝 포인트
  c.globalAlpha = 0.55;
  c.lineWidth = Math.max(2, w * 0.014);
  c.beginPath();
  c.moveTo(bow, bowTipY);
  c.lineTo(bow - w * 0.03, bowTipY + hullH * 0.2);
  c.stroke();

  // 용골 하부 림라이트 (물 반사)
  c.globalAlpha = 0.1;
  c.strokeStyle = `${WARM_SUN} 0.3)`;
  c.lineWidth = Math.max(1, w * 0.006);
  c.beginPath();
  c.moveTo(cx - w * 0.15, cy + hullH * 0.6);
  c.quadraticCurveTo(cx + w * 0.1, cy + hullH * 0.8, cx + w * 0.35, cy + hullH * 0.3);
  c.stroke();

  // 지붕 선수쪽
  c.globalAlpha = 0.3;
  c.lineWidth = Math.max(1.2, w * 0.008);
  c.beginPath();
  c.moveTo(cabCx + cabW * 0.2, roofPeak + w * 0.008);
  c.quadraticCurveTo(cabRight + roofOvBow * 0.4, roofPeak + w * 0.025,
    cabRight + roofOvBow, cabTop + w * 0.008);
  c.stroke();

  c.restore();
}

function drawBoat(
  c: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, t: number,
) {
  const hullH = w * 0.18;
  const sway = Math.sin(t * 0.8) * 2;
  const tilt = Math.sin(t * 0.6) * 0.008;

  // ── 8. Reflection (수면 반사) ──
  c.save();
  const reflY = cy + sway;
  c.translate(0, reflY * 2 + hullH * 0.3);
  c.scale(1, -1);
  c.globalAlpha = 0.12;
  c.filter = "blur(4px)";
  drawBoatBody(c, cx, cy, w, t);
  c.restore();

  // ── 본체 (출렁임 + 회전) ──
  c.save();
  c.translate(cx, cy + sway);
  c.rotate(tilt);
  c.translate(-cx, -(cy + sway));
  drawBoatBody(c, cx, cy + sway, w, t);
  c.restore();
}

// ─── 매 (배/등 시점 — 날개 좌우, 몸체 앞뒤) ───

function drawEagle(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, H } = s;

  // 원호 비행 경로
  const cx = W * 0.55 + Math.cos(t * 0.15) * W * 0.15;
  const cy = H * 0.22 + Math.sin(t * 0.12) * H * 0.04;

  // 비행 방향 기울기
  const dx = -Math.sin(t * 0.15) * 0.15;
  const tilt = dx * 0.3;

  const span = W * 0.028;
  const wingDip = Math.sin(t * 0.6) * span * 0.04;

  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);

  const color = "rgba(0, 0, 0, 0.65)";
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, span * 0.07);
  c.lineCap = "round";

  // 활공(ㅡ) → 파닥(V→^) 사이클
  const wingLen = span * 0.55;
  const period = 5.0;       // 전체 주기 (초)
  const glideRatio = 0.65;  // 65% 활공, 35% 파닥
  const phase = (t % period) / period;

  let angle: number;
  if (phase < glideRatio) {
    // 활공: 수평(0)에 가깝게, 미세한 흔들림만
    angle = Math.sin(t * 0.4) * 0.05;
  } else {
    // 파닥: V(+) → ^(-) 빠르게 2회 왕복
    const flapPhase = (phase - glideRatio) / (1 - glideRatio);
    angle = Math.sin(flapPhase * Math.PI * 4) * 0.55;
  }

  const tipX = wingLen * Math.cos(angle);
  const tipY = -wingLen * Math.sin(angle);

  c.beginPath();
  c.moveTo(-tipX, tipY);
  c.quadraticCurveTo(-tipX * 0.4, tipY * 0.3, 0, 0);
  c.stroke();

  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(tipX * 0.4, tipY * 0.3, tipX, tipY);
  c.stroke();

  // ㅡ 몸체 (V 꼭지점 바로 아래 수평 타원)
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(0, span * 0.08, span * 0.18, span * 0.05, 0, 0, Math.PI * 2);
  c.fill();

  c.restore();
}

/**
 * PASS 7: 오브젝트 (정자, 배, 매)
 */
export function drawObjects(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, wt: top, scroll } = s;

  // 수정 정자
  drawPavilion(c, s);

  // 옆모습 목선 + 노젓는 인물 (정자와 X 간격 확보, Y를 아래로)
  const boatX = scrollWrap(W * 0.35, scroll, W);
  drawBoat(c, boatX, top + 55, W * 0.1, t);

  // 매 (하늘 — 스크롤 없음, 독자 비행)
  drawEagle(c, s, t);
}
