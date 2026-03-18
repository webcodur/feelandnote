"use client";

import React, { useEffect, useRef } from "react";
import type { Particle, Reed } from "./types";
import { drawSky } from "./sections/drawSky";
import { drawMountains } from "./sections/drawMountains";
// drawForegroundObjects is defined but not invoked in the render loop (preserved from original)
// import { drawForegroundObjects } from "./sections/drawForegroundObjects";

export default function WindsOfLiangshanGeminiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let time = 0;

    // Resizing
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Data Structures
    const particles: Particle[] = [];
    for (let i = 0; i < 100; i++) { // Slightly fewer embers
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speedX: Math.random() * 3 + 2,
        speedY: (Math.random() - 0.5) * 1,
        life: Math.random() * 100,
        maxLife: Math.random() * 100 + 50,
      });
    }

    const reeds: Reed[] = [];
    for (let i = 0; i < 450; i++) { // Increased density x3
      const isForeground = Math.random() > 0.6; // 40% foreground, 60% bg
      reeds.push({
        x: Math.random() * width,
        heightInfo: Math.random() * (isForeground ? 0.3 : 0.15) + (isForeground ? 0.15 : 0.05),
        thickness: Math.random() * (isForeground ? 4 : 1.5) + (isForeground ? 1.5 : 0.5),
        swayOffset: Math.random() * Math.PI * 2,
        isForeground,
        angle: (Math.random() - 0.5) * 0.4, // Random tilt angle
      });
    }

    // Drawing Utils
    const drawWater = () => {
      const waterTop = height * 0.78;

      // Base water: Dark red/brown at top to pitch black
      const grad = ctx.createLinearGradient(0, waterTop, 0, height);
      grad.addColorStop(0, "#1c0a0d"); // Dim reflection of sky
      grad.addColorStop(0.3, "#0d0305");
      grad.addColorStop(1, "#020101");
      ctx.fillStyle = grad;
      ctx.fillRect(0, waterTop, width, height - waterTop);

      // Moon Reflection (Organic strokes with sine waves)
      const moonX = width * 0.7;
      ctx.globalCompositeOperation = "lighter";
      const t = time * 0.025; // 5배 상향 (흐름을 눈에 띄게)

      // 고정된 Seed 기반 배치
      for (let baseY = waterTop; baseY < height; baseY += 2) {
        const depthRatio = (baseY - waterTop) / (height - waterTop);
        const baseWidth = 40 + depthRatio * 400;
        const numStrokes = Math.floor(4 - depthRatio * 2);

        for (let i = 0; i < numStrokes; i++) {
          const seed = baseY * 137 + i * 59;

          // 각 조각의 기준(Base) 샘플링 위치
          const posNoise = Math.sin(seed) * 0.4;
          const lenNoise = Math.sin(seed * 1.5) * 0.5 + 0.5;
          const baseX = moonX + posNoise * baseWidth;
          const strokeLength = (lenNoise * 0.3 + 0.05) * baseWidth;

          // 조각별 고유 위상(Phase Drift)
          const k = 0.008; // 파장 계수 상승
          const randomPhase = Math.sin(seed * 2.1) * Math.PI * 2;

          // 전체 샘플링 위치 흐름 속도 상승
          const localPhase = baseX * k + t + randomPhase + Math.sin(t * 0.5) * 0.8;

          // 실제 Y 좌표 위치 변동 (진폭 2~3배 상승)
          const yOffset =
            Math.sin(baseX * 0.006 + localPhase) * 2.5 +
            Math.sin(baseX * 0.002 - localPhase * 0.6) * 1.5;

          const finalY = baseY + yOffset;

          // 실제 X 좌표 위치 변동 (좌우로 뚜렷하게 미끄러짐)
          const xOffset = Math.sin(localPhase * 0.7) * 4.0;
          const finalX = baseX + xOffset;

          // Alpha값의 느린 맥박 (속도 상승)
          const baseAlpha = (1 - depthRatio) * 0.25 + 0.15;
          const alphaPulse = Math.sin(t * 1.5 + randomPhase) * 0.15;
          const alpha = Math.max(0.01, baseAlpha + alphaPulse);

          ctx.strokeStyle = `rgba(250, 180, 70, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(finalX - strokeLength/2, finalY);
          ctx.lineTo(finalX + strokeLength/2, finalY);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // Shore gradient
      const shoreGrad = ctx.createLinearGradient(0, height - 80, 0, height);
      shoreGrad.addColorStop(0, "rgba(0,0,0,0)");
      shoreGrad.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = shoreGrad;
      ctx.fillRect(0, height - 80, width, 80);
    };

    const drawReeds = () => {
      const globalWind = Math.sin(time * 0.005) * 0.5 + 0.5;
      const gustWind = Math.sin(time * 0.02) * Math.sin(time * 0.04) * 0.5;
      const windForce = Math.max(0.05, globalWind + gustWind);

      const drawLayer = (foreground: boolean) => {
        const items = reeds.filter(r => r.isForeground === foreground);

        ctx.strokeStyle = foreground ? "#050101" : "#110404"; // Almost black foreground, dark red-black bg
        ctx.lineCap = "round";

        items.forEach(reed => {
          ctx.lineWidth = reed.thickness;

          let startX = reed.x;
          // Spawn slightly off-screen vertically
          const startY = height + (foreground ? 40 : 10);
          const reedHeight = height * reed.heightInfo;

          const reedSway = Math.sin(time * 0.01 + reed.swayOffset);
          // Incorporate random angle
          const angleOffset = reedHeight * Math.sin(reed.angle);

          const bendX = startX + angleOffset + (reedHeight * 0.2) * windForce + (reedSway * 10);
          const endX = startX + angleOffset * 1.5 + (reedHeight * 0.4) * windForce + (reedSway * 15);
          const endY = startY - reedHeight;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(
            startX, startY - reedHeight * 0.3,
            bendX, startY - reedHeight * 0.6,
            endX, endY
          );
          ctx.stroke();

          // Fluffy Head
          if (foreground) {
            ctx.fillStyle = "#030101";

            const tipDx = endX - bendX;
            const tipDy = endY - (startY - reedHeight * 0.6);
            const angle = Math.atan2(tipDy, tipDx);

            ctx.save();
            ctx.translate(endX, endY);
            ctx.rotate(angle);

            for(let j=0; j<6; j++) {
                const spread = (j - 2.5) * 0.15;
                const size = 12 + Math.random()*5 - Math.abs(j - 2.5) * 2;

                ctx.rotate(spread);
                ctx.beginPath();
                ctx.ellipse(-size, 0, size, 1 + Math.random()*1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.rotate(-spread);
            }
            ctx.restore();
          } else {
             // Background head
             ctx.fillStyle = "#0a0202";
             ctx.beginPath();
             ctx.arc(endX, endY, reed.thickness * 1.5, 0, Math.PI * 2);
             ctx.fill();
          }
        });
      };

      drawLayer(false);
      drawLayer(true);
    };

    const drawParticles = () => {
      ctx.globalCompositeOperation = "screen";

      particles.forEach(p => {
        // Fireflies/Embers rising from the reeds at the bottom
        // Upward sway and wind drift
        p.speedX = (Math.sin(time * 0.01 + p.y * 0.1) * 0.5) + 0.5; // Gentle drift right
        p.speedY = -1 - (Math.sin(time * 0.05 + p.x * 0.05) * 0.5); // Rising up

        p.x += p.speedX;
        p.y += p.speedY; // Rising
        p.life++;

        // Reset if off-screen top/right or dead
        if (p.x > width + 50 || p.life > p.maxLife || p.y < -50) {
          p.x = Math.random() * width; // Spawn anywhere along the bottom horizontally
          p.y = height + Math.random() * 50; // Spawn from below the screen (inside reeds)
          p.life = 0;
          p.maxLife = 100 + Math.random() * 150; // Live longer
        }

        const lifeRatio = p.life / p.maxLife;
        // Fast fade in, slow fade out
        const opacity = lifeRatio < 0.2 ? lifeRatio * 5 : 1 - ((lifeRatio - 0.2) / 0.8);

        ctx.globalAlpha = opacity * 0.8;

        // Glow
        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        radGrad.addColorStop(0, "rgba(255, 255, 255, 1)"); // White hot core
        radGrad.addColorStop(0.3, "rgba(249, 215, 110, 0.8)"); // Gold mid
        radGrad.addColorStop(1, "rgba(212, 175, 55, 0)"); // Fading edge

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        // Embers form long streaks when moving fast
        const streakFactor = Math.abs(p.speedX) * 0.5;
        ctx.ellipse(p.x, p.y, p.size * (1 + streakFactor), p.size, Math.atan2(p.speedY, p.speedX), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "source-over";
    };

    const drawVignette = () => {
      // Cinematic black vignette around the edges
      const grad = ctx.createRadialGradient(width/2, height/2, height * 0.4, width/2, height/2, height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.8, "rgba(0,0,0,0.6)");
      grad.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Letterbox bars (cinematic 2.35:1 feel)
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height * 0.05);
      ctx.fillRect(0, height * 0.95, width, height * 0.05);
    };

    // Render Loop
    const render = () => {
      time++;

      // Update dimensions to perfectly match CSS layout size every frame
      const currentWidth = canvas.clientWidth;
      const currentHeight = canvas.clientHeight;
      if (width !== currentWidth || height !== currentHeight) {
        width = currentWidth;
        height = currentHeight;
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const dc = { ctx, width, height, time };
      drawSky(dc);
      drawMountains(dc);
      drawWater();
      drawReeds();
      drawParticles();
      drawVignette();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
      style={{ background: "#080404" }}
    />
  );
}
