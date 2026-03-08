import {
  type Reed,
  type ReedCluster,
  type SceneContext,
  LIGHT_X_RATIO,
  WARM_SUN,
  clamp,
  scrollWrap,
} from "./types";

// ─── 갈대 클러스터 생성 ───

export function generateReedClusters(W: number): ReedCluster[] {
  const clusters: ReedCluster[] = [];
  let x = -W * 0.1;
  while (x < W * 1.1) {
    const isGap = Math.random() < 0.2;
    if (isGap) {
      x += W * (0.02 + Math.random() * 0.05);
      continue;
    }
    const width = W * (0.08 + Math.random() * 0.16);
    clusters.push({
      centerX: x + width / 2,
      width,
      density: 0.6 + Math.random() * 0.4,
    });
    x += width + W * (0.005 + Math.random() * 0.02);
  }
  return clusters;
}

// ─── 갈대 인스턴스 생성 ───

export function generateReeds(W: number, H: number, isMobile = false): Reed[] {
  const reeds: Reed[] = [];
  const clusters = generateReedClusters(W);
  const lightX = W * LIGHT_X_RATIO;

  for (const cluster of clusters) {
    const divisor = isMobile ? 5 : 2.5;
    const count = Math.floor(cluster.density * cluster.width / divisor);

    // 덩어리 (하단 벽)
    for (let i = 0; i < count; i++) {
      const x = cluster.centerX - cluster.width / 2 + Math.random() * cluster.width;
      reeds.push({
        x,
        y: H * 0.86 + Math.random() * H * 0.16,
        height: 15 + Math.random() * 35,
        segments: 3,
        swayOffset: Math.random() * Math.PI * 2,
        isMass: true,
        highlight: false,
      });
    }

    // 가닥 (높이 다양화 확대: 40~120)
    const thinCount = Math.floor(count * 0.5);
    for (let i = 0; i < thinCount; i++) {
      const x = cluster.centerX - cluster.width / 2 + Math.random() * cluster.width;
      const distToLight = Math.abs(x - lightX);
      const isHighlighted = distToLight < W * 0.35 && Math.random() < 0.35;
      reeds.push({
        x,
        y: H * 0.80 + Math.random() * H * 0.16,
        height: 40 + Math.random() * 80,
        segments: 5 + Math.floor(Math.random() * 3),
        swayOffset: Math.random() * Math.PI * 2,
        isMass: false,
        highlight: isHighlighted,
      });
    }
  }

  // 전경 오버사이즈 갈대
  const fgPositions = [
    { x: -W * 0.02 }, { x: W * 0.03 }, { x: W * 0.07 },
    { x: W * 0.12 }, { x: W * 0.88 }, { x: W * 0.93 },
    { x: W * 0.97 }, { x: W * 1.02 },
  ];
  for (const pos of fgPositions) {
    const near = Math.abs(pos.x - lightX) < W * 0.3;
    reeds.push({
      x: pos.x,
      y: H * 0.90 + Math.random() * H * 0.12,
      height: 130 + Math.random() * 100,
      segments: 8,
      swayOffset: Math.random() * Math.PI * 2,
      isMass: false,
      highlight: near,
    });
  }

  reeds.sort((a, b) => a.y - b.y);
  return reeds;
}

// ─── 갈대 렌더링 ───

export function drawReeds(
  c: CanvasRenderingContext2D,
  t: number,
  reeds: Reed[],
  s: SceneContext,
  isMobile = false,
) {
  const baseWind = -0.1;
  c.lineCap = "round";
  c.lineJoin = "round";

  // 하단 덩어리 벽 (거의 검은 먹빛 — 질량감 강화)
  const massGrad = c.createLinearGradient(0, s.H * 0.84, 0, s.H);
  massGrad.addColorStop(0, "rgba(8, 18, 12, 0.15)");
  massGrad.addColorStop(0.15, "rgba(6, 15, 10, 0.55)");
  massGrad.addColorStop(0.35, "rgba(4, 12, 8, 0.8)");
  massGrad.addColorStop(0.6, "rgba(3, 10, 6, 0.92)");
  massGrad.addColorStop(1, "rgba(2, 8, 5, 0.97)");
  c.fillStyle = massGrad;
  c.fillRect(0, s.H * 0.84, s.W, s.H * 0.16);

  const reedDark = "rgba(4, 12, 8, 0.95)";
  const reedMid = "rgba(12, 28, 18, 0.88)";
  const reedHighlight = "rgba(40, 65, 35, 0.82)";

  // 전경 스크롤 (산보다 빠르게)
  const fgScroll = s.scroll * 1.5;

  // 피사계심도: 전경(height≥100) / 중·후경 분리
  const FG_THRESHOLD = 100;
  const midReeds = reeds.filter(r => r.height < FG_THRESHOLD);
  const fgReeds = reeds.filter(r => r.height >= FG_THRESHOLD);

  // 갈대 1가닥 렌더
  const strokeReed = (g: Reed) => {
    const sx = scrollWrap(g.x, fgScroll, s.W, 0.15);
    const sway = Math.sin(t * 1.2 + g.swayOffset) * (g.isMass ? 0.04 : 0.15);
    const totalAngle = -Math.PI / 2 + baseWind + sway;
    const segLen = g.height / g.segments;
    const depth = clamp((g.y - s.H * 0.80) / (s.H * 0.20), 0, 1);

    const isFg = g.height >= FG_THRESHOLD;

    if (g.isMass) {
      c.globalAlpha = 0.8 + depth * 0.18;
      c.strokeStyle = reedDark;
      c.lineWidth = 3 + depth * 5;
    } else if (isFg) {
      // 전경 오버사이즈: 굵고 거의 검은 톤
      c.globalAlpha = 0.9;
      c.strokeStyle = g.highlight ? "rgba(30, 50, 28, 0.9)" : "rgba(5, 14, 8, 0.95)";
      c.lineWidth = 3 + depth * 4;
    } else if (g.highlight) {
      c.globalAlpha = 0.75 + depth * 0.15;
      c.strokeStyle = reedHighlight;
      c.lineWidth = 1.5 + depth * 1.5;
    } else {
      c.globalAlpha = 0.7 + depth * 0.15;
      c.strokeStyle = reedMid;
      c.lineWidth = 1.2 + depth * 2;
    }

    let cx = sx;
    let cy = g.y;
    c.beginPath();
    c.moveTo(cx, cy);

    for (let i = 1; i <= g.segments; i++) {
      const effect = (totalAngle - (-Math.PI / 2)) * (i / g.segments);
      const currentAngle = -Math.PI / 2 + effect;
      cx += Math.cos(currentAngle) * segLen;
      cy += Math.sin(currentAngle) * segLen;
      c.lineTo(cx, cy);
    }
    c.stroke();

    // 갈대 이삭
    if (!g.isMass && g.height > 50) {
      c.globalAlpha = g.highlight ? 0.65 : 0.5;
      c.fillStyle = g.highlight ? "rgba(80, 100, 50, 0.7)" : "rgba(30, 50, 25, 0.7)";
      c.beginPath();
      c.ellipse(cx, cy - 3, 1.8, 6, totalAngle + Math.PI / 2, 0, Math.PI * 2);
      c.fill();
    }
  };

  // PASS 1: 중·후경 갈대 (선명)
  midReeds.forEach(strokeReed);

  // PASS 2: 전경 오버사이즈 갈대 (블러 — 카메라 DoF, 모바일에서 비활성)
  if (!isMobile) {
    c.save();
    c.filter = "blur(1.5px)";
    fgReeds.forEach(strokeReed);
    c.restore();
  } else {
    fgReeds.forEach(strokeReed);
  }

  // 하이라이트 갈대 태양 림라이트
  c.save();
  c.globalCompositeOperation = "screen";
  reeds.filter(r => r.highlight && !r.isMass).forEach((g) => {
    const sway = Math.sin(t * 1.2 + g.swayOffset) * 0.15;
    const totalAngle = -Math.PI / 2 + baseWind + sway;
    const segLen = g.height / g.segments;

    c.globalAlpha = 0.2;
    c.strokeStyle = `${WARM_SUN} 0.5)`;
    c.lineWidth = 1;

    let cx = scrollWrap(g.x, fgScroll, s.W, 0.15) + 1;
    let cy = g.y;
    c.beginPath();
    c.moveTo(cx, cy);

    for (let i = 1; i <= g.segments; i++) {
      const effect = (totalAngle - (-Math.PI / 2)) * (i / g.segments);
      const currentAngle = -Math.PI / 2 + effect;
      cx += Math.cos(currentAngle) * segLen;
      cy += Math.sin(currentAngle) * segLen;
      c.lineTo(cx, cy);
    }
    c.stroke();
  });
  c.restore();

  c.globalAlpha = 1;
}
