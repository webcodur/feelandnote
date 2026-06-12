import type { BandDef, BandPath } from "../types";
import { fbm, fbm2D, hashNoise, wave } from "./noise";

// --- [3] 대기 원근 + [4] 광원 방향 색 논리 ---
const tintBandColor = (hex: string, t: number, bandX: number, vpX: number, w: number): string => {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // 대기 원근: 원경→안개색 혼합 (비선형 강화)
  const fogStr = Math.pow(1 - t, 1.6) * 0.65;
  const fogR = 165, fogG = 130, fogB = 95;
  r = r + (fogR - r) * fogStr;
  g = g + (fogG - g) * fogStr;
  b = b + (fogB - b) * fogStr;

  // 원경 대비 감소 (비선형 — 급격한 S커브)
  const contrastT = Math.pow(1 - t, 1.8);
  const midGray = 105;
  const contrastReduce = contrastT * 0.5;
  r = r + (midGray - r) * contrastReduce;
  g = g + (midGray - g) * contrastReduce;
  b = b + (midGray - b) * contrastReduce;

  // 원경 채도 감쇠: RGB 중 max-min 차이를 줄임
  const desat = contrastT * 0.35;
  const avg = (r + g + b) / 3;
  r = r + (avg - r) * desat;
  g = g + (avg - g) * desat;
  b = b + (avg - b) * desat;

  // 광원 방향: VP 근처 난색 (좁은 전환 구간)
  const distNorm = Math.abs(bandX - vpX) / (w * 0.35);
  const warmZone = Math.max(0, 1 - distNorm * distNorm * distNorm); // 3차곡선 감쇠
  const warmStr = warmZone * (0.18 + (1 - t) * 0.18);
  r = Math.min(255, r + (235 - r) * warmStr);
  g = g + (175 - g) * warmStr * 0.35;
  b = b * (1 - warmStr * 0.55);

  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
};

// --- 등고선 밴드 정의 ---
export const BANDS: BandDef[] = [
  { offset: 6.0, color: "#0a1a38", seed: 1.0 },
  { offset: 4.5, color: "#102848", seed: 2.3 },
  { offset: 3.8, color: "#163050", seed: 3.7 },
  { offset: 3.3, color: "#203c58", seed: 4.1 },
  { offset: 3.0, color: "#2a4a60", seed: 5.9 },
  { offset: 2.7, color: "#203c58", seed: 6.2 },
  { offset: 2.4, color: "#163050", seed: 7.8 },
  { offset: 2.0, color: "#1a4068", seed: 8.5 },
  { offset: 1.4, color: "#204e78", seed: 9.1 },
  { offset: 0.9, color: "#255a72", seed: 10.3 },
  { offset: 0.55, color: "#2e6880", seed: 11.7 },
  { offset: 0.25, color: "#387a8a", seed: 12.4 },
  { offset: 0.08, color: "#4a8e90", seed: 13.9 },
  { offset: 0.0, color: "#5aa098", seed: 14.2 },
  // 육지: 해안선 근처 밀집, 멀수록 희소 — 따뜻한 황토 톤
  { offset: -0.06, color: "#6e9878", seed: 15.6 },
  { offset: -0.15, color: "#7e8e65", seed: 16.1 },
  { offset: -0.3, color: "#8a8558", seed: 17.2 },
  { offset: -0.5, color: "#937e50", seed: 17.8 },
  { offset: -0.8, color: "#96764a", seed: 18.3 },
  { offset: -1.5, color: "#8e6a40", seed: 19.5 },
  { offset: -3.0, color: "#7a5c38", seed: 20.9 },
  { offset: -6.0, color: "#604830", seed: 22.7 },
];

// --- Shore functions ---
export const createShoreFunctions = (
  w: number,
  h: number,
  time: number,
  getVP: () => { x: number; y: number },
) => {
  const getShoreBase = (t: number): number => {
    const vp = getVP();
    const base = vp.x + (w * 0.60 - vp.x) * Math.pow(t, 0.75);
    const drift = time * 0.003;
    const near = t;

    // 원경일수록 옥타브 수 감소 → 형태 단순화
    const farOctaves = Math.max(2, Math.round(2 + near * 3)); // 2~5
    const noiseAmp = 40 * (0.3 + near * 0.7);
    const largeCurve = fbm(t * 3 + drift * 0.2, farOctaves, 2.1, 0.5) * noiseAmp;
    const detail = fbm(t * 10 + drift * 0.5, 3, 2.3, 0.45) * 18 * near;

    return base + largeCurve + detail;
  };

  const getSurge = (t: number, surgeZone: number): number => {
    const waveT = time * 0.025;
    const near = t;
    const zoneFade = surgeZone <= 0
      ? Math.max(0, 1 + surgeZone * 3)
      : Math.exp(-surgeZone * 2.5);
    const surge =
      Math.sin(waveT + t * 1.5) * 28 * (0.4 + near * 0.6) +
      Math.sin(waveT * 1.7 + t * 0.8 + 1.0) * 14 * (0.3 + near * 0.7);
    return surge * zoneFade;
  };

  const getShoreX = (t: number): number => getShoreBase(t) + getSurge(t, 0);

  const getBandX = (t: number, offset: number, bandSeed: number): number => {
    const perspScale = 0.3 + t * 0.7;
    const pixelOffset = -offset * 40 * perspScale;

    // 밴드마다 고유 노이즈로 곡선 변형 (해안선과 완전히 동일하지 않음)
    const near = t;
    const bandNoise = fbm2D(t * 6, bandSeed, 3, 2.0, 0.5) * 12 * near;

    // 비선형 간격: 해안선에서 멀수록 간격 비선형 증가
    const nonlinearOffset = Math.sign(offset) * Math.pow(Math.abs(offset), 1.15) * 40 * perspScale;

    return getShoreBase(t) + getSurge(t, offset) - nonlinearOffset + bandNoise;
  };

  const buildBandPath = (offset: number, seed: number, steps: number, horizonY: number) => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = horizonY + t * (h - horizonY);
      pts.push({ x: getBandX(t, offset, seed), y });
    }
    return pts;
  };

  return { getShoreBase, getSurge, getShoreX, getBandX, buildBandPath };
};

// --- [1] 수면 반사: "부서진 빛의 집합" ---
const drawSunReflection = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  vpX: number,
  horizonY: number,
) => {
  const steps = 55;
  const t0 = time * 0.012;

  for (let row = 0; row < steps; row++) {
    const t = row / steps;
    const y = horizonY + t * (h - horizonY);

    // 폭: 비선형 가속 — 수평선 극히 좁고 중간에서 급격 확장
    const perspSpread = Math.pow(t, 2.2);
    const halfWidth = w * 0.003 + w * 0.18 * perspSpread;

    // 행 내 파편 수
    const fragCount = Math.max(1, Math.round(2 + perspSpread * 10));

    // 행 전체의 좌우 비틀림 (물결에 의한 반사 경로 왜곡)
    const rowDrift = wave(t * 6, t0 * 1.3, 8 * Math.sqrt(t))
      + hashNoise(t * 12 + t0 * 0.4) * 5 * t;

    // 중심 파손: 일부 행에서 밝기 구멍
    const rowBreak = hashNoise(t * 25 + time * 0.007);
    const rowDim = rowBreak > 0.3 ? 1.0 : 0.3 + rowBreak * 2.3;

    for (let f = 0; f < fragCount; f++) {
      const u = (f + 0.5) / fragCount;
      const centered = (u - 0.5) * 2;

      // 밀집 분포: 완전 가우시안이 아닌 약간 불균일
      const noiseShift = hashNoise(f * 5.3 + t * 18 + t0) * 0.15;
      const shifted = centered + noiseShift;
      const gaussian = Math.exp(-shifted * shifted * 2.0);

      // 개별 파편 위치 노이즈
      const noiseOff = hashNoise(t * 20 + f * 7.3 + t0) * halfWidth * 0.35;
      const fx = vpX + rowDrift + centered * halfWidth + noiseOff;
      const fy = y + hashNoise(t * 15 + f * 3.1 + t0 * 0.7) * (1.5 + t * 3);

      // 밝기: 중심 강하지만 rowDim으로 구멍 생성
      const baseAlpha = gaussian * 0.16 * Math.min(t * 5, 1) * rowDim;
      const flicker = Math.pow(
        Math.sin(t * 14 + f * 2.7 + time * 0.035) * 0.5 + 0.5,
        2.5
      );
      const alpha = baseAlpha * (0.3 + flicker * 0.7);
      if (alpha < 0.006) continue;

      // 크기: 원근 비례, 비선형
      const fragW = (0.8 + perspSpread * 7) * (0.4 + flicker * 0.6);
      const fragH = 0.6 + perspSpread * 2;

      // 색상: 중심 순수 난색, 외곽 중성 감쇠
      const warmth = gaussian;
      const cr = 255;
      const cg = Math.round(225 - (1 - warmth) * 50);
      const cb = Math.round(100 + (1 - warmth) * 80);

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.fillRect(fx - fragW / 2, fy - fragH / 2, fragW, fragH);
    }
  }
};

// --- Draw Ground ---
export const drawGround = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  vpX: number,
  horizonY: number,
  bandPaths: BandPath[],
  getBandX: (t: number, offset: number, seed: number) => number,
  drawWaveRipples: (horizonY: number, shorePoints: { x: number; y: number }[]) => void,
) => {
  const seaBands = bandPaths.filter((b) => b.offset >= 0).sort((a, b) => a.offset - b.offset);
  const landBands = bandPaths.filter((b) => b.offset < 0).sort((a, b) => b.offset - a.offset);

  // 밑칠
  ctx.fillStyle = "#6aaa98";
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // 바다 밴드
  for (const band of seaBands) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (const pt of band.pts) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(0, h);
    ctx.closePath();

    // 세로 그라데이션: 원경=대기 원근 색, 전경=원래 색
    const grad = ctx.createLinearGradient(0, horizonY, 0, h);
    const farColor = tintBandColor(band.color, 0.05, getBandX(0.05, band.offset, band.seed), vpX, w);
    const midColor = tintBandColor(band.color, 0.5, getBandX(0.5, band.offset, band.seed), vpX, w);
    const nearColor = tintBandColor(band.color, 0.9, getBandX(0.9, band.offset, band.seed), vpX, w);
    grad.addColorStop(0, farColor);
    grad.addColorStop(0.4, midColor);
    grad.addColorStop(1, nearColor);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // 육지 밴드
  for (const band of landBands) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(band.pts[0].x, band.pts[0].y);
    for (let j = 1; j < band.pts.length; j++) ctx.lineTo(band.pts[j].x, band.pts[j].y);
    ctx.lineTo(w, h);
    ctx.lineTo(w, horizonY);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, horizonY, 0, h);
    const farColor = tintBandColor(band.color, 0.05, getBandX(0.05, band.offset, band.seed), vpX, w);
    const midColor = tintBandColor(band.color, 0.5, getBandX(0.5, band.offset, band.seed), vpX, w);
    const nearColor = tintBandColor(band.color, 0.9, getBandX(0.9, band.offset, band.seed), vpX, w);
    grad.addColorStop(0, farColor);
    grad.addColorStop(0.4, midColor);
    grad.addColorStop(1, nearColor);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // 태양 빛 오버레이 — VP 직하 난색 강화
  const sunGlow = ctx.createRadialGradient(vpX, horizonY, 0, vpX, horizonY, h * 0.7);
  sunGlow.addColorStop(0, "rgba(210,155,70,0.16)");
  sunGlow.addColorStop(0.15, "rgba(190,130,55,0.10)");
  sunGlow.addColorStop(0.35, "rgba(160,100,40,0.05)");
  sunGlow.addColorStop(0.7, "rgba(120,80,30,0.015)");
  sunGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // VP 직하 세로 난색 스트립 — 청록 억제
  const warmStrip = ctx.createRadialGradient(vpX, horizonY, 0, vpX, h * 0.6, w * 0.15);
  warmStrip.addColorStop(0, "rgba(200,150,70,0.10)");
  warmStrip.addColorStop(0.5, "rgba(180,120,50,0.04)");
  warmStrip.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = warmStrip;
  ctx.fillRect(vpX - w * 0.15, horizonY, w * 0.3, h - horizonY);

  // 수면 반사
  ctx.globalCompositeOperation = "screen";
  drawSunReflection(ctx, w, h, time, vpX, horizonY);
  ctx.globalCompositeOperation = "source-over";

  // 파도 곡선
  const shorePoints = bandPaths.find((b) => b.offset === 0)!.pts;
  drawWaveRipples(horizonY, shorePoints);
};
