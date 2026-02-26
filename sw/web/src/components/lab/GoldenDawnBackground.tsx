/*
  파일명: /components/lab/GoldenDawnBackground.tsx
  기능: Canvas 기반 황금빛 여명 해변 배경 컴포넌트
  책임: 해변을 따라 여명을 향해 걸어가는 1인칭 시점의 시네마틱 전진 연출.
        소실점의 태양, 원근 투영 지면(바다+해안선+모래), god ray, 금빛 입자를 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

export default function GoldenDawnBackground({
  fullScreen,
}: { fullScreen?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let w = 0;
    let h = 0;
    let time = 0;

    const HORIZON = 0.38;
    const SCROLL_SPEED = 0.8;

    const SKY_STOPS = [
      [0, "#070b1e"],
      [0.2, "#121035"],
      [0.4, "#2d1540"],
      [0.6, "#6b2a38"],
      [0.78, "#b8622a"],
      [0.92, "#d4962a"],
      [1, "#ffe066"],
    ] as const;

    // --- 1D value noise + fbm ---
    const hashNoise = (x: number): number => {
      const xi = Math.floor(x);
      const frac = x - xi;
      const smooth = frac * frac * (3 - 2 * frac);
      const a = Math.sin(xi * 127.1 + xi * 311.7) * 43758.5453;
      const b = Math.sin((xi + 1) * 127.1 + (xi + 1) * 311.7) * 43758.5453;
      const va = a - Math.floor(a);
      const vb = b - Math.floor(b);
      return (va + (vb - va) * smooth) * 2 - 1;
    };

    const fbm = (x: number, octaves: number, lac: number, gain: number): number => {
      let sum = 0, amp = 1, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        sum += hashNoise(x * freq) * amp;
        max += amp;
        amp *= gain;
        freq *= lac;
      }
      return sum / max;
    };

    // --- 2D noise (밴드별 독립 곡선용) ---
    const hash2D = (x: number, seed: number): number => {
      const xi = Math.floor(x);
      const frac = x - xi;
      const smooth = frac * frac * (3 - 2 * frac);
      const a = Math.sin(xi * 127.1 + seed * 311.7) * 43758.5453;
      const b = Math.sin((xi + 1) * 127.1 + seed * 311.7) * 43758.5453;
      const va = a - Math.floor(a);
      const vb = b - Math.floor(b);
      return (va + (vb - va) * smooth) * 2 - 1;
    };

    const fbm2D = (x: number, seed: number, octaves: number, lac: number, gain: number): number => {
      let sum = 0, amp = 1, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        sum += hash2D(x * freq, seed + i * 73.1) * amp;
        max += amp;
        amp *= gain;
        freq *= lac;
      }
      return sum / max;
    };

    const wave = (x: number, t: number, amp: number): number =>
      Math.sin(x + t) * amp +
      Math.sin(x * 1.7 + t * 0.8) * amp * 0.5 +
      Math.sin(x * 0.4 + t * 1.3) * amp * 0.3;

    // --- God Ray ---
    class GodRay {
      angle: number; width: number; length: number;
      opacity: number; phase: number; speed: number;
      constructor() {
        this.angle = (Math.random() - 0.5) * 1.2;
        this.width = Math.random() * 0.04 + 0.01;
        this.length = Math.random() * 0.6 + 0.4;
        this.opacity = Math.random() * 0.07 + 0.02;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.004 + 0.001;
      }
      update() { this.phase += this.speed; }
      draw(vpX: number, vpY: number) {
        if (!ctx) return;
        const flicker = Math.sin(this.phase) * 0.5 + 0.5;
        const alpha = this.opacity * flicker;
        if (alpha < 0.003) return;
        const reach = Math.max(w, h) * this.length;
        const dx = Math.sin(this.angle), dy = Math.cos(this.angle);
        const endX = vpX + dx * reach, endY = vpY + dy * reach;
        const halfW = this.width * reach;
        const grad = ctx.createLinearGradient(vpX, vpY, endX, endY);
        grad.addColorStop(0, `rgba(255,220,100,${alpha * 2})`);
        grad.addColorStop(0.3, `rgba(255,190,80,${alpha})`);
        grad.addColorStop(0.7, `rgba(255,160,60,${alpha * 0.4})`);
        grad.addColorStop(1, "rgba(255,140,40,0)");
        ctx.beginPath();
        ctx.moveTo(vpX - dx * 5, vpY - dy * 5);
        ctx.lineTo(endX - dy * halfW, endY + dx * halfW);
        ctx.lineTo(endX + dy * halfW, endY - dx * halfW);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // --- Sparkle ---
    class Sparkle {
      worldX: number; worldZ: number; phase: number;
      speed: number; size: number; brightness: number;
      constructor() {
        this.worldX = -Math.random() * 0.8 - 0.1;
        this.worldZ = Math.random();
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.06 + 0.02;
        this.size = Math.random() * 2 + 0.5;
        this.brightness = Math.random() * 0.7 + 0.2;
      }
      update(so: number) {
        this.phase += this.speed;
        this.worldZ += so * 0.0004;
        if (this.worldZ > 1.1) {
          this.worldZ -= 1.2;
          this.worldX = -Math.random() * 0.8 - 0.1;
          this.brightness = Math.random() * 0.7 + 0.2;
        }
      }
      draw(vpX: number, _vpY: number, horizonY: number) {
        if (!ctx || this.worldZ < 0) return;
        const t = this.worldZ;
        const screenY = horizonY + t * (h - horizonY);
        const screenX = vpX + this.worldX * t * w * 0.9;
        if (screenX < 0 || screenX > w || screenY < horizonY) return;
        const twinkle = Math.pow(Math.sin(this.phase) * 0.5 + 0.5, 3);
        const alpha = this.brightness * twinkle * Math.min(t * 3, 1);
        if (alpha < 0.02) return;
        const ds = this.size * (0.3 + t * 1.5);
        ctx.beginPath();
        ctx.arc(screenX, screenY, ds, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,230,140,${alpha})`;
        ctx.fill();
        if (ds > 1.5 && alpha > 0.25) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, ds * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,215,80,${alpha * 0.12})`;
          ctx.fill();
        }
      }
    }

    // --- Foam ---
    class FoamParticle {
      worldZ: number; offset: number; size: number; opacity: number;
      constructor() {
        this.worldZ = Math.random();
        this.offset = (Math.random() - 0.5) * 0.06;
        this.size = Math.random() * 1.5 + 0.3;
        this.opacity = Math.random() * 0.4 + 0.1;
      }
      update(so: number) {
        this.worldZ += so * 0.0004;
        if (this.worldZ > 1.1) {
          this.worldZ -= 1.2;
          this.offset = (Math.random() - 0.5) * 0.06;
          this.opacity = Math.random() * 0.4 + 0.1;
        }
      }
      draw(vpX: number, horizonY: number, getShoreX: (t: number) => number) {
        if (!ctx || this.worldZ < 0.02) return;
        const t = this.worldZ;
        const screenY = horizonY + t * (h - horizonY);
        const screenX = getShoreX(t) + this.offset * t * w * 0.9;
        if (screenX < 0 || screenX > w) return;
        const ds = this.size * (0.2 + t * 1.2);
        const alpha = this.opacity * Math.min(t * 4, 1);
        ctx.beginPath();
        ctx.arc(screenX, screenY, ds, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,245,220,${alpha})`;
        ctx.fill();
      }
    }

    // --- State ---
    let rays: GodRay[] = [];
    let sparkles: Sparkle[] = [];
    let foamParticles: FoamParticle[] = [];
    let scrollOffset = 0;
    let stars: { x: number; y: number; s: number; b: number }[] = [];

    const init = () => {
      w = canvas.parentElement?.clientWidth || canvas.offsetWidth;
      h = canvas.parentElement?.clientHeight || canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      rays = Array.from({ length: 10 }, () => new GodRay());
      sparkles = Array.from({ length: 100 }, () => new Sparkle());
      foamParticles = Array.from({ length: 80 }, () => new FoamParticle());

      // [5] 별: 상단 밀집, 수평선 근처 제거, 크기 분산
      stars = [];
      const hLim = h * HORIZON * 0.85;
      for (let i = 0; i < 80; i++) {
        const y = Math.pow(Math.random(), 1.8) * hLim; // 상단 편향 분포
        const heightRatio = 1 - y / hLim;
        if (heightRatio < 0.08) continue; // 수평선 근처 제거
        stars.push({
          x: Math.random() * w,
          y,
          s: 0.2 + Math.pow(Math.random(), 3) * 1.8, // 대부분 작고 가끔 큼
          b: (Math.random() * 0.25 + 0.03) * heightRatio,
        });
      }
    };

    const getVP = () => ({ x: w * 0.42, y: h * HORIZON });

    // [2] 해안선 — fbm 노이즈 기반, 원경일수록 디테일 감소
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

    // [2] 밴드별 독립 노이즈 — 동일 곡선 복사 제거
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

    // --- Draw Sky ---
    const drawSky = (horizonY: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, horizonY + 30);
      for (const [stop, color] of SKY_STOPS) grad.addColorStop(stop, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, horizonY + 30);
    };

    // --- Draw Stars ---
    const drawStars = () => {
      const fade = 0.5 + Math.sin(time * 0.004) * 0.1;
      for (const st of stars) {
        const twinkle = Math.sin(time * 0.015 + st.x * 0.1) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,250,230,${st.b * twinkle * fade})`;
        ctx.fill();
      }
    };

    // --- Draw Sun ---
    const drawSun = (vpX: number, vpY: number) => {
      // 최외곽 대기 산란
      const scatterR = Math.max(w, h) * 0.85;
      const scatter = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, scatterR);
      scatter.addColorStop(0, "rgba(255,200,80,0.15)");
      scatter.addColorStop(0.1, "rgba(255,180,60,0.08)");
      scatter.addColorStop(0.25, "rgba(200,120,40,0.04)");
      scatter.addColorStop(0.5, "rgba(150,70,30,0.015)");
      scatter.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = scatter;
      ctx.fillRect(0, 0, w, h);

      // 중간 글로우
      const outerR = Math.max(w, h) * 0.5;
      const outer = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, outerR);
      outer.addColorStop(0, "rgba(255,220,100,0.35)");
      outer.addColorStop(0.12, "rgba(255,195,75,0.18)");
      outer.addColorStop(0.3, "rgba(255,160,50,0.06)");
      outer.addColorStop(0.6, "rgba(200,100,40,0.02)");
      outer.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = outer;
      ctx.fillRect(0, 0, w, h);

      // 코어
      const coreR = w * 0.10;
      const core = ctx.createRadialGradient(vpX, vpY + 2, 0, vpX, vpY + 2, coreR);
      core.addColorStop(0, "rgba(255,255,240,0.95)");
      core.addColorStop(0.15, "rgba(255,240,180,0.7)");
      core.addColorStop(0.4, "rgba(255,210,100,0.25)");
      core.addColorStop(0.7, "rgba(255,190,70,0.08)");
      core.addColorStop(1, "rgba(255,180,60,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      // 디스크
      ctx.beginPath();
      ctx.arc(vpX, vpY + 3, w * 0.022, Math.PI, 0);
      ctx.closePath();
      const disc = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, w * 0.022);
      disc.addColorStop(0, "rgba(255,255,250,1)");
      disc.addColorStop(0.5, "rgba(255,245,200,0.95)");
      disc.addColorStop(1, "rgba(255,220,120,0.6)");
      ctx.fillStyle = disc;
      ctx.fill();
    };

    // --- [3] 대기 원근 + [4] 광원 방향 색 논리 ---
    const tintBandColor = (hex: string, t: number, bandX: number, vpX: number): string => {
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
    const BANDS: { offset: number; color: string; seed: number }[] = [
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

    const buildBandPath = (offset: number, seed: number, steps: number, horizonY: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = horizonY + t * (h - horizonY);
        pts.push({ x: getBandX(t, offset, seed), y });
      }
      return pts;
    };

    // --- [1] 수면 반사: "부서진 빛의 집합" ---
    const drawSunReflection = (vpX: number, horizonY: number) => {
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
    const drawGround = (vpX: number, horizonY: number) => {
      const steps = 60;

      const bandPaths = BANDS.map((b) => ({
        ...b,
        pts: buildBandPath(b.offset, b.seed, steps, horizonY),
      }));

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
        // 원경 색 (t=0)
        const farColor = tintBandColor(band.color, 0.05, getBandX(0.05, band.offset, band.seed), vpX);
        // 중경 색 (t=0.5)
        const midColor = tintBandColor(band.color, 0.5, getBandX(0.5, band.offset, band.seed), vpX);
        // 전경 색 (t=0.9)
        const nearColor = tintBandColor(band.color, 0.9, getBandX(0.9, band.offset, band.seed), vpX);
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
        const farColor = tintBandColor(band.color, 0.05, getBandX(0.05, band.offset, band.seed), vpX);
        const midColor = tintBandColor(band.color, 0.5, getBandX(0.5, band.offset, band.seed), vpX);
        const nearColor = tintBandColor(band.color, 0.9, getBandX(0.9, band.offset, band.seed), vpX);
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
      drawSunReflection(vpX, horizonY);
      ctx.globalCompositeOperation = "source-over";

      // 파도 곡선
      const shorePoints = bandPaths.find((b) => b.offset === 0)!.pts;
      drawWaveRipples(horizonY, shorePoints);
    };

    // --- Wave ripple curves ---
    const drawWaveRipples = (
      horizonY: number,
      shorePoints: { x: number; y: number }[]
    ) => {
      const t0 = time * 0.02;
      const waveCount = 14;

      for (let r = 0; r < waveCount; r++) {
        const cycle = ((r / waveCount + scrollOffset * 0.00025) % 1.0);
        const dist = 1 - cycle;
        if (dist < 0.03) continue;

        const alpha = (1 - dist * 0.6) * 0.1 * Math.min(cycle * 5, 1);
        if (alpha < 0.005) continue;

        ctx.beginPath();
        let started = false;

        for (let i = 0; i < shorePoints.length; i++) {
          const pt = shorePoints[i];
          const t = i / (shorePoints.length - 1);
          const perspScale = Math.max(t, 0.05);
          const offsetDist = dist * 120 * perspScale;

          const nextPt = shorePoints[Math.min(i + 1, shorePoints.length - 1)];
          const dx = nextPt.x - pt.x, dy = nextPt.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len, ny = dx / len;

          const undulate = wave(t * 12 + r * 3.7, t0 * 0.8 + r * 0.5, 3 * perspScale);
          const wx = pt.x + nx * offsetDist + ny * undulate;
          const wy = pt.y + ny * offsetDist - nx * undulate;

          if (wx > pt.x + 5 || wx < -20) continue;

          if (!started) { ctx.moveTo(wx, wy); started = true; }
          else ctx.lineTo(wx, wy);
        }

        if (started) {
          ctx.strokeStyle = `rgba(180,210,235,${alpha})`;
          ctx.lineWidth = 0.4 + (1 - dist) * 1.2;
          ctx.stroke();
        }
      }
    };

    // --- Horizon haze: 공기층 삽입 ---
    const drawHaze = (vpX: number, horizonY: number) => {
      // 전체 수평선 대역
      const hBand = ctx.createLinearGradient(0, horizonY - 50, 0, horizonY + 80);
      hBand.addColorStop(0, "rgba(160,120,70,0)");
      hBand.addColorStop(0.25, "rgba(170,130,80,0.15)");
      hBand.addColorStop(0.5, "rgba(165,125,75,0.12)");
      hBand.addColorStop(0.75, "rgba(150,110,65,0.06)");
      hBand.addColorStop(1, "rgba(140,100,60,0)");
      ctx.fillStyle = hBand;
      ctx.fillRect(0, horizonY - 50, w, 130);

      // VP 중심 해무 — 중앙 가장 밝고 좌우 감쇠
      const hazeR = w * 0.45;
      const haze = ctx.createRadialGradient(vpX, horizonY, 0, vpX, horizonY, hazeR);
      haze.addColorStop(0, "rgba(220,180,110,0.18)");
      haze.addColorStop(0.2, "rgba(200,160,90,0.12)");
      haze.addColorStop(0.5, "rgba(180,140,80,0.06)");
      haze.addColorStop(0.8, "rgba(150,110,65,0.02)");
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(vpX - hazeR, horizonY - hazeR * 0.4, hazeR * 2, hazeR * 0.8);

      // 수평선 양측 어둡게 (중앙↔측면 밝기 차이)
      const sideGrad = ctx.createLinearGradient(0, 0, w, 0);
      sideGrad.addColorStop(0, "rgba(20,15,10,0.08)");
      sideGrad.addColorStop(0.3, "rgba(20,15,10,0)");
      sideGrad.addColorStop(0.7, "rgba(20,15,10,0)");
      sideGrad.addColorStop(1, "rgba(20,15,10,0.06)");
      ctx.fillStyle = sideGrad;
      ctx.fillRect(0, horizonY - 30, w, 80);

      // 지면 원경부 안개층
      const groundFog = ctx.createLinearGradient(0, horizonY, 0, horizonY + h * 0.18);
      groundFog.addColorStop(0, "rgba(160,125,80,0.12)");
      groundFog.addColorStop(0.4, "rgba(150,115,75,0.05)");
      groundFog.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = groundFog;
      ctx.fillRect(0, horizonY, w, h * 0.18);
    };

    // --- Vignette ---
    const drawVignette = (vpX: number, vpY: number) => {
      const vig = ctx.createRadialGradient(vpX, vpY, h * 0.25, w * 0.5, h * 0.5, h * 0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    };

    // --- Main loop ---
    const animate = () => {
      if (!ctx) return;
      time++;
      scrollOffset += SCROLL_SPEED;
      const vp = getVP();

      ctx.clearRect(0, 0, w, h);
      drawSky(vp.y);
      drawStars();
      drawSun(vp.x, vp.y);

      ctx.globalCompositeOperation = "screen";
      for (const ray of rays) { ray.update(); ray.draw(vp.x, vp.y); }
      ctx.globalCompositeOperation = "source-over";

      drawGround(vp.x, vp.y);

      for (const fp of foamParticles) { fp.update(SCROLL_SPEED); fp.draw(vp.x, vp.y, getShoreX); }

      ctx.globalCompositeOperation = "screen";
      for (const sp of sparkles) { sp.update(SCROLL_SPEED); sp.draw(vp.x, vp.y, vp.y); }
      ctx.globalCompositeOperation = "source-over";

      drawHaze(vp.x, vp.y);
      drawVignette(vp.x, vp.y);

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={
        fullScreen
          ? "relative w-full h-full overflow-hidden bg-[#070b1e]"
          : "relative w-full h-[600px] overflow-hidden rounded-xl border border-amber-900/30 shadow-2xl bg-[#070b1e]"
      }
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
