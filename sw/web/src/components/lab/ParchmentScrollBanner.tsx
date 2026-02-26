"use client";

import { useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";

interface Props {
  children?: React.ReactNode;
  variant?: "horizontal" | "vertical";
  /** 캔버스 높이 (데모 모드). 기본 700 */
  height?: number;
  /** 데모용 라벨·배경·텍스트 표시. false면 스크롤만 렌더 */
  showLabels?: boolean;
  /** compact 모드 양피지 너비 */
  paperWidth?: number;
  /** compact 모드 양피지 높이 */
  paperHeight?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function ParchmentScrollBanner({
  children,
  variant = "horizontal",
  height: propHeight = 700,
  showLabels = true,
  paperWidth: propPaperW,
  paperHeight: propPaperH,
  className = "",
  onClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureRef = useRef<HTMLImageElement | null>(null);
  const childrenRef = useRef<HTMLDivElement>(null);

  const compact = !showLabels;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let frame = 0;
    let progress = 0;

    const isVertical = variant === "vertical";
    const HANDLE_MARGIN = 48; // 손잡이 돌출 여분

    // compact 모드 양피지 크기
    const cPaperW = propPaperW ?? (isVertical ? 280 : 300);
    const cPaperH = propPaperH ?? (isVertical ? 350 : 280);

    // 텍스처 이미지 로드
    const img = new Image();
    img.src = "/images/textures/parchment.jpg";
    img.onload = () => { textureRef.current = img; };

    const lines = isVertical
      ? ["天", "命", "所", "歸", "萬", "世", "不", "易"]
      : [
          "In the beginning, there was void.",
          "From the void, came the spark of thought.",
          "Thoughts wove together into the tapestry of wisdom.",
          "And thus, the Chronicles were written.",
          "Preserving knowledge for eternity.",
        ];

    const init = () => {
      if (compact) {
        // compact: 캔버스 = 스크롤 영역 + 손잡이 여분
        width = cPaperW + HANDLE_MARGIN * 2;
        height = cPaperH + HANDLE_MARGIN * 2;
      } else {
        width = canvas.parentElement?.clientWidth || window.innerWidth;
        height = propHeight;
      }
      canvas.width = width;
      canvas.height = height;
    };

    const drawPaperTexture = (x: number, y: number, w: number, h: number) => {
      ctx.save();
      if (textureRef.current) {
        ctx.drawImage(textureRef.current, x, y, w, h);
      } else {
        ctx.fillStyle = "#f0e6d2";
        ctx.fillRect(x, y, w, h);
      }

      // 가장자리 음영
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, "rgba(0,0,0,0.12)");
      grad.addColorStop(0.08, "rgba(0,0,0,0)");
      grad.addColorStop(0.92, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    };

    const drawShadows = (x: number, y: number, w: number, h: number) => {
      if (isVertical) {
        const topGrad = ctx.createLinearGradient(x, y, x, y + 30);
        topGrad.addColorStop(0, "rgba(0,0,0,0.4)");
        topGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = topGrad;
        ctx.fillRect(x, y, w, 30);

        const botGrad = ctx.createLinearGradient(x, y + h, x, y + h - 30);
        botGrad.addColorStop(0, "rgba(0,0,0,0.4)");
        botGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = botGrad;
        ctx.fillRect(x, y + h - 30, w, 30);
      } else {
        const leftGrad = ctx.createLinearGradient(x, y, x + 30, y);
        leftGrad.addColorStop(0, "rgba(0,0,0,0.4)");
        leftGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = leftGrad;
        ctx.fillRect(x, y, 30, h);

        const rightGrad = ctx.createLinearGradient(x + w, y, x + w - 30, y);
        rightGrad.addColorStop(0, "rgba(0,0,0,0.4)");
        rightGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rightGrad;
        ctx.fillRect(x + w - 30, y, 30, h);
      }
    };

    // 봉 그리기 (양피지 텍스처 + 원통형 음영 + 나선 감김)
    const drawRoll = (x: number, y: number, length: number, r: number, orientation: "h" | "v", side: "start" | "end") => {
      ctx.save();
      const tex = textureRef.current;

      if (orientation === "h") {
        // ── 가로 두루마리: 세로 롤 ──

        // 1) 양피지 텍스처 베이스
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - r, y, r * 2, length);
        ctx.clip();
        if (tex) {
          ctx.drawImage(tex, x - r, y, r * 2, length);
        } else {
          ctx.fillStyle = "#f0e6d2";
          ctx.fillRect(x - r, y, r * 2, length);
        }
        ctx.restore();

        // 2) 원통형 음영
        const cylGrad = ctx.createLinearGradient(x - r, y, x + r, y);
        const darkSide = side === "start" ? 0 : 1;
        const lightSide = side === "start" ? 1 : 0;
        cylGrad.addColorStop(0, darkSide === 0 ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.15)");
        cylGrad.addColorStop(0.3, "rgba(0,0,0,0.05)");
        cylGrad.addColorStop(0.5, "rgba(255,255,255,0.08)");
        cylGrad.addColorStop(0.7, "rgba(0,0,0,0.05)");
        cylGrad.addColorStop(1, lightSide === 1 ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.15)");
        ctx.fillStyle = cylGrad;
        ctx.fillRect(x - r, y, r * 2, length);

        // 3) 나선 감김선
        ctx.strokeStyle = "rgba(80,50,20,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < length; i += 6) {
          ctx.moveTo(x - r, y + i);
          ctx.bezierCurveTo(x - r * 0.3, y + i + 3, x + r * 0.3, y + i + 3, x + r, y + i);
        }
        ctx.stroke();

        // 4) 종이 가장자리 두께
        const edgeX = side === "start" ? x + r : x - r;
        ctx.strokeStyle = "rgba(240,230,210,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(edgeX, y);
        ctx.lineTo(edgeX, y + length);
        ctx.stroke();

        // 5) 금속 링
        const ringH = 6;
        const drawRing = (ry: number) => {
          const rg = ctx.createLinearGradient(x - r - 2, ry, x + r + 2, ry);
          rg.addColorStop(0, "#8a6d3b"); rg.addColorStop(0.2, "#fecf6a");
          rg.addColorStop(0.5, "#8a6d3b"); rg.addColorStop(0.8, "#fecf6a");
          rg.addColorStop(1, "#8a6d3b");
          ctx.fillStyle = rg;
          ctx.fillRect(x - r - 1, ry, (r * 2) + 2, ringH);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillRect(x - r + 4, ry, 2, ringH);
        };
        drawRing(y);
        drawRing(y + length - ringH);

        // 6) 손잡이
        const drawHandle = (baseY: number, dir: -1 | 1) => {
          const coreR = Math.max(r * 0.35, 4);
          const segments = [
            { offset: 0, h: 10, w: coreR },
            { offset: 10, h: 15, w: coreR * 1.5 },
            { offset: 25, h: 5, w: coreR * 0.75 },
            { offset: 30, h: 8, w: coreR * 1.2 },
          ];
          for (const seg of segments) {
            const sy = baseY + seg.offset * dir;
            const g = ctx.createLinearGradient(x - seg.w, sy, x + seg.w, sy);
            g.addColorStop(0, "#3e2b22"); g.addColorStop(0.5, "#5c4033"); g.addColorStop(1, "#3e2b22");
            ctx.fillStyle = g;
            if (dir === -1) ctx.fillRect(x - seg.w, sy - seg.h, seg.w * 2, seg.h);
            else ctx.fillRect(x - seg.w, sy, seg.w * 2, seg.h);
          }
          const tipY = baseY + 38 * dir;
          const tipR = coreR;
          const gg = ctx.createRadialGradient(x - tipR * 0.3, tipY - tipR * 0.3, 0, x, tipY, tipR);
          gg.addColorStop(0, "#fff5d9"); gg.addColorStop(0.3, "#d4af37"); gg.addColorStop(1, "#8a6d3b");
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(x, tipY, tipR, 0, Math.PI * 2);
          ctx.fill();
        };
        drawHandle(y, -1);
        drawHandle(y + length, 1);

      } else {
        // ── 세로 두루마리: 가로 롤 ──

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y - r, length, r * 2);
        ctx.clip();
        if (tex) {
          ctx.drawImage(tex, x, y - r, length, r * 2);
        } else {
          ctx.fillStyle = "#f0e6d2";
          ctx.fillRect(x, y - r, length, r * 2);
        }
        ctx.restore();

        const cylGrad = ctx.createLinearGradient(x, y - r, x, y + r);
        const darkSide = side === "start" ? 0 : 1;
        const lightSide = side === "start" ? 1 : 0;
        cylGrad.addColorStop(0, darkSide === 0 ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.15)");
        cylGrad.addColorStop(0.3, "rgba(0,0,0,0.05)");
        cylGrad.addColorStop(0.5, "rgba(255,255,255,0.08)");
        cylGrad.addColorStop(0.7, "rgba(0,0,0,0.05)");
        cylGrad.addColorStop(1, lightSide === 1 ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.15)");
        ctx.fillStyle = cylGrad;
        ctx.fillRect(x, y - r, length, r * 2);

        ctx.strokeStyle = "rgba(80,50,20,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < length; i += 6) {
          ctx.moveTo(x + i, y - r);
          ctx.bezierCurveTo(x + i + 3, y - r * 0.3, x + i + 3, y + r * 0.3, x + i, y + r);
        }
        ctx.stroke();

        const edgeY = side === "start" ? y + r : y - r;
        ctx.strokeStyle = "rgba(240,230,210,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, edgeY);
        ctx.lineTo(x + length, edgeY);
        ctx.stroke();

        const ringW = 6;
        const drawRing = (rx: number) => {
          const rg = ctx.createLinearGradient(rx, y - r - 2, rx, y + r + 2);
          rg.addColorStop(0, "#8a6d3b"); rg.addColorStop(0.2, "#fecf6a");
          rg.addColorStop(0.5, "#8a6d3b"); rg.addColorStop(0.8, "#fecf6a");
          rg.addColorStop(1, "#8a6d3b");
          ctx.fillStyle = rg;
          ctx.fillRect(rx, y - r - 1, ringW, (r * 2) + 2);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillRect(rx, y - r + 4, ringW, 2);
        };
        drawRing(x);
        drawRing(x + length - ringW);

        const drawHandle = (baseX: number, dir: -1 | 1) => {
          const coreR = Math.max(r * 0.35, 4);
          const segments = [
            { offset: 0, len: 10, w: coreR },
            { offset: 10, len: 15, w: coreR * 1.5 },
            { offset: 25, len: 5, w: coreR * 0.75 },
            { offset: 30, len: 8, w: coreR * 1.2 },
          ];
          for (const seg of segments) {
            const sx = baseX + seg.offset * dir;
            const g = ctx.createLinearGradient(sx, y - seg.w, sx, y + seg.w);
            g.addColorStop(0, "#3e2b22"); g.addColorStop(0.5, "#5c4033"); g.addColorStop(1, "#3e2b22");
            ctx.fillStyle = g;
            if (dir === -1) ctx.fillRect(sx - seg.len, y - seg.w, seg.len, seg.w * 2);
            else ctx.fillRect(sx, y - seg.w, seg.len, seg.w * 2);
          }
          const tipX = baseX + 38 * dir;
          const tipR = coreR;
          const gg = ctx.createRadialGradient(tipX - tipR * 0.3, y - tipR * 0.3, 0, tipX, y, tipR);
          gg.addColorStop(0, "#fff5d9"); gg.addColorStop(0.3, "#d4af37"); gg.addColorStop(1, "#8a6d3b");
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(tipX, y, tipR, 0, Math.PI * 2);
          ctx.fill();
        };
        drawHandle(x, -1);
        drawHandle(x + length, 1);
      }

      ctx.restore();
    };

    const animate = () => {
      frame++;

      // 배경
      if (compact) {
        ctx.clearRect(0, 0, width, height);
      } else {
        const gradBG = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        gradBG.addColorStop(0, "#1a1a1a");
        gradBG.addColorStop(1, "#050505");
        ctx.fillStyle = gradBG;
        ctx.fillRect(0, 0, width, height);
      }

      // 애니메이션 진행
      progress += (1 - progress) * 0.08;

      const centerX = width / 2;
      const centerY = height / 2;
      // 봉 반지름: 펼쳐질수록 감김이 줄어 얇아짐 (25 → 10)
      const rollRadius = 10 + 15 * (1 - progress);

      if (isVertical) {
        const maxPaperH = compact ? cPaperH : Math.min(height * 0.7, 500);
        const currentH = maxPaperH * progress;
        const paperW = compact ? cPaperW : 280;

        const finalTopY = centerY - maxPaperH / 2;
        const leftX = centerX - paperW / 2;
        const topY = centerY - currentH / 2;
        const bottomY = centerY + currentH / 2;

        if (!compact) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.filter = "blur(20px)";
          ctx.fillRect(leftX + 10, topY, paperW, currentH);
          ctx.filter = "none";
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(leftX, topY, paperW, currentH);
        ctx.clip();
        drawPaperTexture(leftX, finalTopY, paperW, maxPaperH);
        drawShadows(leftX, topY, paperW, currentH);

        // 텍스트 (데모 모드만)
        if (!compact) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.font = "bold 28px 'Cinzel', serif";
          const colSpacing = 40;
          const startCol = centerX + colSpacing;
          lines.forEach((char, i) => {
            const col = Math.floor(i / 4);
            const row = i % 4;
            const tx = startCol - col * colSpacing;
            const ty = topY + 60 + row * 50;
            if (ty < bottomY - 20) ctx.fillText(char, tx, ty);
          });
        }

        ctx.restore();

        drawRoll(leftX, topY, paperW, rollRadius, "v", "start");
        drawRoll(leftX, bottomY, paperW, rollRadius, "v", "end");

        // children clip 동기화
        if (childrenRef.current) {
          const t = topY, b = height - bottomY, l = leftX, r = width - (leftX + paperW);
          childrenRef.current.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px)`;
        }
      } else {
        const maxPaperW = compact ? cPaperW : Math.min(width * 0.8, 1000);
        const currentW = maxPaperW * progress;
        const paperH = compact ? cPaperH : 400;

        const finalLeftX = centerX - maxPaperW / 2;
        const topY = centerY - paperH / 2;
        const leftX = centerX - currentW / 2;
        const rightX = centerX + currentW / 2;

        if (!compact) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.filter = "blur(20px)";
          ctx.fillRect(leftX, topY + 20, currentW, paperH);
          ctx.filter = "none";
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(leftX, topY, currentW, paperH);
        ctx.clip();
        drawPaperTexture(finalLeftX, topY, maxPaperW, paperH);
        drawShadows(leftX, topY, currentW, paperH);

        // 텍스트 + 장식 (데모 모드만)
        if (!compact) {
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.font = "italic 24px 'Cinzel'";
          lines.forEach((line, i) => {
            const ty = topY + 100 + i * 50;
            ctx.fillText(line, centerX, ty);
          });

          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();

        drawRoll(leftX, topY, paperH, rollRadius, "h", "start");
        drawRoll(rightX, topY, paperH, rollRadius, "h", "end");

        // children clip 동기화
        if (childrenRef.current) {
          const t = topY, b = height - (topY + paperH), l = leftX, r = width - rightX;
          childrenRef.current.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px)`;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    if (!compact) window.addEventListener("resize", init);
    animate();

    return () => {
      if (!compact) window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant, propHeight, compact, propPaperW, propPaperH]);

  return (
    <div
      className={`relative ${compact ? "" : "w-full overflow-hidden bg-[#050505] border-y border-[#d4af37]/20"} ${className}`}
      style={compact ? undefined : { height: propHeight }}
      onClick={onClick}
    >
      <canvas ref={canvasRef} className="block" />

      {showLabels && (
        <div className="absolute top-10 w-full text-center pointer-events-none">
          <div className="inline-block p-1 border border-[#d4af37]/30 rounded-full bg-black/50 backdrop-blur-sm">
            <div className="px-4 py-1 text-[10px] text-[#d4af37] tracking-[0.2em] uppercase font-cinzel">
              {variant === "vertical" ? "Imperial Edict" : "Ancient Chronicles"}
            </div>
          </div>
        </div>
      )}

      {children && (
        <div
          ref={childrenRef}
          className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ clipPath: "inset(50% 50% 50% 50%)" }}
        >
          {children}
        </div>
      )}

      {showLabels && (
        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
          <div className="inline-flex items-center gap-2 text-[#d4af37]/50 text-xs tracking-[0.3em] uppercase">
            <ScrollText size={14} />
            <span>{variant === "vertical" ? "Descending Wisdom" : "Unrolling History"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
