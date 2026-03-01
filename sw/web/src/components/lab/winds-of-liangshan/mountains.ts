import type { MountainLayer, SceneContext } from "./types";
import { HAZE_MIST } from "./types";

// 최후경 — 가장 먼 산 (밝은 실루엣, 안개에 녹아드는 수준)
export const FAR_MOUNTAINS: MountainLayer[] = [
  { speed: 0.008, color: "rgba(120, 140, 148, 0.25)", heightMult: 0.16, freq: 0.0005, amp: 280, offset: -800 },
];

// 후경 — 명도 차이 벌림 (FAR보다 확연히 어둡게)
export const BG_MOUNTAINS: MountainLayer[] = [
  { speed: 0.02, color: "rgba(70, 90, 100, 0.45)", heightMult: 0.2, freq: 0.0008, amp: 240, offset: 0 },
  { speed: 0.04, color: "rgba(45, 65, 75, 0.6)", heightMult: 0.28, freq: 0.0012, amp: 190, offset: 1200 },
];

// 중경 — 진한 먹빛, 날카로운 절벽
export const MID_MOUNTAINS: MountainLayer[] = [
  { speed: 0.08, color: "rgba(22, 40, 44, 0.8)", heightMult: 0.36, freq: 0.0018, amp: 140, offset: 2500 },
  { speed: 0.12, color: "rgba(12, 25, 28, 0.95)", heightMult: 0.44, freq: 0.003, amp: 90, offset: 3500 },
];

/**
 * PASS 2-3: 산세 — 중경 봉우리 날카롭게, 절벽면 톤 변화
 */
export function drawMountains(
  c: CanvasRenderingContext2D,
  s: SceneContext,
  t: number,
  layers: MountainLayer[],
) {
  const { W, H } = s;

  layers.forEach((layer) => {
    c.beginPath();
    c.moveTo(0, H);

    // 능선 y좌표를 먼저 계산하여 저장 (절벽 톤 변화에 재사용)
    const points: { x: number; y: number }[] = [];
    for (let x = 0; x <= W; x += 6) {
      const rx = x + t * layer.speed * 60 + layer.offset;
      let y = H * layer.heightMult;
      // 주 파형
      y += Math.sin(rx * layer.freq) * layer.amp;
      // 급경사 절벽면 (고주파 톱니)
      y += Math.sin(rx * layer.freq * 2.8) * (layer.amp * 0.35);
      // 뾰족한 봉우리 (중경에서 더 강하게)
      const peakStr = layer.speed >= 0.08 ? 0.3 : 0.2;
      y -= Math.abs(Math.sin(rx * layer.freq * 1.5 + 0.5)) * (layer.amp * peakStr);
      // 미세 디테일
      y += Math.cos(rx * layer.freq * 6) * (layer.amp * 0.1);
      // 간헐적 봉우리 돌출 (중경에서 더 뾰족)
      const spikeStr = layer.speed >= 0.08 ? 0.4 : 0.3;
      y += Math.max(0, Math.sin(rx * layer.freq * 0.3)) * layer.amp * spikeStr;
      // 드라마틱 봉우리 — 특정 지점에서 급격히 솟구침
      const dramaticPeak = Math.pow(Math.max(0, Math.sin(rx * layer.freq * 0.15 + 1.2)), 8);
      y -= dramaticPeak * layer.amp * (layer.speed >= 0.08 ? 1.2 : 0.7);
      // 중경 전용: 수직에 가까운 급절벽 추가
      if (layer.speed >= 0.08) {
        const cliff = Math.max(0, Math.sin(rx * layer.freq * 0.7 + 2.0));
        y -= cliff * cliff * layer.amp * 0.2;
      }
      points.push({ x, y });
    }

    // 산체 채우기
    c.fillStyle = layer.color;
    for (const p of points) c.lineTo(p.x, p.y);
    c.lineTo(W, H);
    c.closePath();
    c.fill();

    // 절벽면 미세 톤 변화 (경사가 급한 구간만 — 최소한의 질감)
    if (layer.speed >= 0.04) {
      c.save();
      c.globalAlpha = 0.08;
      for (let i = 1; i < points.length; i++) {
        const dy = points[i].y - points[i - 1].y;
        const dx = points[i].x - points[i - 1].x;
        const slope = Math.abs(dy / dx);
        // 경사도 1.5 이상인 급절벽에만 적용
        if (slope > 1.5) {
          const darker = dy > 0; // 내려가는 면 = 그늘
          c.fillStyle = darker
            ? "rgba(0, 15, 10, 1)"
            : "rgba(120, 140, 150, 1)";
          c.fillRect(points[i - 1].x, points[i - 1].y, dx, Math.abs(dy));
        }
      }
      c.restore();
    }
  });
}

/**
 * 산 허리 안개 — 레이어 분리 효과 강화
 */
export function drawMountainHaze(
  c: CanvasRenderingContext2D,
  s: SceneContext,
  t: number,
) {
  const { W, H } = s;

  // 산 허리 안개 밴드 (산 하단뿐 아니라 중간 높이에도 배치)
  const hazeBands = [
    { y: 0.22, h: 0.045, a: 0.10, speed: 0.04 },  // 최후경~후경 사이
    { y: 0.30, h: 0.04, a: 0.16, speed: 0.05 },   // 후경~중경 사이
    { y: 0.40, h: 0.035, a: 0.20, speed: 0.07 },   // 중경 허리
  ];

  for (const band of hazeBands) {
    const by = H * band.y + Math.sin(t * band.speed + band.y * 10) * 4;
    const bh = H * band.h;
    const grad = c.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, `${HAZE_MIST} 0)`);
    grad.addColorStop(0.35, `${HAZE_MIST} ${band.a})`);
    grad.addColorStop(0.65, `${HAZE_MIST} ${band.a * 0.5})`);
    grad.addColorStop(1, `${HAZE_MIST} 0)`);
    c.fillStyle = grad;
    c.fillRect(0, by, W, bh);
  }
}
