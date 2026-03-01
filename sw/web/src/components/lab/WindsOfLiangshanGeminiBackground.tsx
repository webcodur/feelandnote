"use client";

import React, { useEffect, useRef } from "react";

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

    // Constants
    const COLORS = {
      skyTop: "#080404",
      skyBottom: "#2A0A0A", // Deep crimson twilight
      moonOutline: "rgba(212, 175, 55, 0.4)", // Gold
      moonCore: "#F9D76E",
      mountainFar: "#140808",
      mountainMid: "#0A0303",
      mountainNear: "#050101",
      waterTop: "#0A0303",
      waterBottom: "#020101",
      reedDark: "#000000",
      reedLight: "#1A0F0F",
      ember: "#D4AF37", // Gold embers
    };

    // Resizing
    // We synchronize the canvas resolution with its CSS display dimensions precisely in the render loop.
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Data Structures
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; life: number; maxLife: number }[] = [];
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

    const reeds: { x: number; heightInfo: number; thickness: number; swayOffset: number; isForeground: boolean; angle: number }[] = [];
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
    const drawSky = () => {
      // 1. Background base: Linear Gradient for Twilight horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.8);
      skyGrad.addColorStop(0, "#08040a"); // Dark purple/black top
      skyGrad.addColorStop(0.4, "#1a0815"); // Deep twilight purple
      skyGrad.addColorStop(0.7, "#3a1010"); // Dark crimson
      skyGrad.addColorStop(1, "#5a1a05"); // Warm orange/red near horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Add "canvas" noise texture to sky
      for(let i=0; i<400; i++) {
        ctx.fillStyle = `rgba(255, 200, 150, ${Math.random() * 0.02})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
      }

      // 2. The Blood Moon
      const moonX = width * 0.7;
      const moonY = height * 0.3;
      const moonRadius = Math.min(width, height) * 0.095; // Slightly reduced moon size

      ctx.globalCompositeOperation = "lighter";

      // Glow Layer 1 (Huge & extremely soft)
      const glow1 = ctx.createRadialGradient(moonX, moonY, moonRadius, moonX, moonY, moonRadius * 6);
      glow1.addColorStop(0, "rgba(220, 120, 60, 0.08)"); // Lowered intensity & saturation
      glow1.addColorStop(0.5, "rgba(180, 50, 20, 0.03)");
      glow1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      // Glow Layer 2 (Mid)
      const glow2 = ctx.createRadialGradient(moonX, moonY, moonRadius, moonX, moonY, moonRadius * 3);
      glow2.addColorStop(0, "rgba(230, 160, 90, 0.12)"); // Less yellow, more dusty orange
      glow2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);

      // Glow Layer 3 (Tight)
      const glow3 = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.8, moonX, moonY, moonRadius * 1.5);
      glow3.addColorStop(0, "rgba(255, 210, 130, 0.25)"); // Greatly reduced from 0.6 to 0.25
      glow3.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "source-over";

      // Sharp inner moon - Base color (Lower saturation, directional light)
      const moonGrad = ctx.createRadialGradient(
        moonX + moonRadius * 0.3, moonY - moonRadius * 0.3, 0, // Highlight strongly offset to top-right
        moonX, moonY, moonRadius
      );
      // Desaturated and darkened base colors
      moonGrad.addColorStop(0, "#e8d8b8"); // Pale, less saturated gold
      moonGrad.addColorStop(0.6, "#c8ae70"); // Dusty, muted yellow/brown
      moonGrad.addColorStop(1, "#8a6630"); // Dark shadow edge
      
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();

      // Moon craters / texture (Organic, blurred patches)
      ctx.save();
      ctx.clip(); // Ensure patterns don't bleed outside the moon

      ctx.globalCompositeOperation = "multiply";
      ctx.filter = "blur(4px)"; // Soft edges

      // Helper to draw an irregular blob
      const drawBlob = (cx: number, cy: number, size: number, alpha: number) => {
        ctx.fillStyle = `rgba(100, 20, 0, ${alpha})`;
        
        ctx.beginPath();
        // Generate an irregular, bumpy circle
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.5) {
          const r = size * (0.7 + Math.sin(angle * 3 + cx) * 0.15 + Math.cos(angle * 5 + cy) * 0.15);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (angle === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      };

      // Large Maria (Dark Seas) - Very low alpha to blend in
      drawBlob(moonX - moonRadius * 0.2, moonY - moonRadius * 0.05, moonRadius * 0.45, 0.18);
      drawBlob(moonX - moonRadius * 0.35, moonY + moonRadius * 0.2, moonRadius * 0.35, 0.22);
      drawBlob(moonX + moonRadius * 0.1, moonY - moonRadius * 0.3, moonRadius * 0.4, 0.14);
      
      // Medium Patches
      drawBlob(moonX + moonRadius * 0.3, moonY + moonRadius * 0.1, moonRadius * 0.3, 0.16);
      drawBlob(moonX + moonRadius * 0.15, moonY + moonRadius * 0.4, moonRadius * 0.25, 0.19);
      drawBlob(moonX - moonRadius * 0.1, moonY - moonRadius * 0.3, moonRadius * 0.2, 0.12);

      // Fine details
      for (let i = 0; i < 6; i++) {
        const seedAngle = (i * Math.PI) / 3;
        const dist = 0.3 * moonRadius + (i % 2) * 0.4 * moonRadius; // Distribute semi-randomly but deterministically
        drawBlob(
          moonX + Math.cos(seedAngle) * dist, 
          moonY + Math.sin(seedAngle) * dist, 
          moonRadius * (0.05 + (i * 0.02)), 
          0.1 + (i % 3) * 0.03
        );
      }

      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";

      // Self-Shadow (Spherical shading) - Darken bottom-left strongly
      ctx.globalCompositeOperation = "multiply";
      const shadowGrad = ctx.createRadialGradient(
        moonX - moonRadius * 0.4, moonY + moonRadius * 0.4, 0,
        moonX - moonRadius * 0.2, moonY + moonRadius * 0.2, moonRadius * 1.5
      );
      shadowGrad.addColorStop(0, "rgba(20, 5, 0, 0.6)"); // Very dark core of shadow
      shadowGrad.addColorStop(0.6, "rgba(40, 15, 5, 0.2)");
      shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)"); // Fades out towards top-right light
      
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(moonX - moonRadius, moonY - moonRadius, moonRadius * 2, moonRadius * 2);

      ctx.restore(); // remove clip


      // 3. Volumetric Fog / Clouds passing moon (MUCH SLOWER)
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 5; i++) {
        const cloudSpeed = time * 0.02 + i * 200; 
        const cx = moonX - moonRadius * 2 + (cloudSpeed % (moonRadius * 4));
        const cy = moonY - moonRadius + i * 30 + Math.sin(time * 0.005 + i) * 20; 
        
        const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, moonRadius * 1.5);
        cloudGrad.addColorStop(0, "rgba(255, 100, 50, 0.04)"); // Warm moonlight glow on clouds
        cloudGrad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, moonRadius * 2.5, moonRadius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over"; // reset
    };

    const drawMountains = () => {
      const moonX = width * 0.7;

      const drawLayer = (
        baseColor: string, 
        fogColor: string, 
        yBase: number, 
        detail: number, 
        heightMult: number, 
        blur: number,
        rimLight: boolean
      ) => {
        if (blur > 0) {
          ctx.filter = `blur(${blur}px)`;
        } else {
          ctx.filter = "none";
        }

        ctx.beginPath();
        ctx.moveTo(0, height);
        
        const ridge: {x: number, y: number}[] = [];

        for (let x = 0; x <= width + 20; x += 10) {
          let n = Math.sin(x * 0.001 * detail) * 1.0;
          n += Math.sin(x * 0.003 * detail) * 0.5;
          n += Math.sin(x * 0.012 * detail) * 0.2;
          n += Math.cos(x * 0.04 * detail) * 0.1; 
          n += Math.sin(x * 0.1 * detail) * 0.02; // Fine grit
          
          let y = height * yBase - (n * height * heightMult);
          y = Math.max(0, y);
          ctx.lineTo(x, y);
          ridge.push({x, y});
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        
        ctx.fillStyle = baseColor;
        ctx.fill();

        const fog = ctx.createLinearGradient(0, height * (yBase - heightMult), 0, height);
        fog.addColorStop(0, "rgba(0,0,0,0)");
        fog.addColorStop(1, fogColor);
        ctx.fillStyle = fog;
        ctx.fill();

        // Rim Light (Halo from moon) - broken and partial
        if (rimLight) {
          ctx.globalCompositeOperation = "lighter";
          ctx.lineWidth = 1.2;

          for (let i = 1; i < ridge.length; i++) {
            const p1 = ridge[i-1];
            const p2 = ridge[i];
            
            // 달 주변(e.g., 반경 250px 내)의 능선에만 빛 적용
            const distToMoon = Math.abs(p1.x - moonX);
            if (distToMoon > 250) continue;

            // Stable pseudo-random noise for breaks (정적 노이즈를 통해 선을 불규칙하게 끊기)
            const breakNoise = Math.sin(p1.x * 0.1) * Math.sin(p1.x * 0.03);
            if (breakNoise < 0.1) continue; // 노이즈 값이 작으면 안 그리고 끊음 (파단면 형성)

            const intensity = Math.max(0, 1 - distToMoon / 250);
            const alpha = intensity * 0.4 * breakNoise; // 빛의 세기를 크게 낮춤 (0.4 max)

            if (alpha > 0.01) {
              ctx.strokeStyle = `rgba(255, 200, 100, ${alpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
          ctx.globalCompositeOperation = "source-over";
        }
      };

      // 5 Layers of depth
      // 1. Farthest (desaturated purple/red, blurred)
      drawLayer("#1f0d14", "rgba(50, 15, 20, 0.8)", 0.55, 0.6, 0.18, 3, true); 
      // 2. Far-Mid
      drawLayer("#15060b", "rgba(30, 8, 12, 0.9)", 0.62, 0.9, 0.15, 1.5, true); 
      // 3. Mid
      drawLayer("#0c0305", "rgba(15, 4, 6, 0.95)", 0.68, 1.3, 0.12, 0.5, true); 
      // 4. Near-Mid
      drawLayer("#060102", "rgba(5, 1, 2, 1)", 0.75, 1.8, 0.09, 0, false); 
      // 5. Nearest (almost black)
      drawLayer("#020001", "rgba(0, 0, 0, 1)", 0.82, 2.5, 0.06, 0, false); 
      
      ctx.filter = "none";
    };

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

    const drawForegroundObjects = () => {
      // Draw an old, gnarled, dead plum/pine tree reaching in from the left
      // to anchor the scene with a highly organic, distinct silhouette
      
      const treeBaseX = 0;
      const treeBaseY = height;
      
      // Base bark gradient (deep browns and blacks)
      const trunkGrad = ctx.createLinearGradient(0, 0, width * 0.3, 0);
      trunkGrad.addColorStop(0, "#050101"); // Deepest dark left
      trunkGrad.addColorStop(0.5, "#140505"); // Slight red-brown mid
      trunkGrad.addColorStop(1, "#2a0a0a"); // Lighter edge catching moon
      
      ctx.fillStyle = trunkGrad; 
      ctx.strokeStyle = trunkGrad;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.beginPath();
      
      // Main thick trunk starting from bottom left and bending inwards
      ctx.moveTo(treeBaseX, treeBaseY);
      
      // Left edge of trunk
      ctx.lineTo(treeBaseX, height * 0.4); 
      
      // Top main branch reaching out rightwards
      ctx.bezierCurveTo(
        width * 0.1, height * 0.45,
        width * 0.2, height * 0.35,
        width * 0.3, height * 0.3 
      );
      
      // Tapering back along bottom edge of top branch
      ctx.bezierCurveTo(
        width * 0.2, height * 0.38,
        width * 0.12, height * 0.5,
        width * 0.08, height * 0.55
      );
      
      // Lower secondary gnarly branch reaching out
      ctx.bezierCurveTo(
        width * 0.15, height * 0.65,
        width * 0.22, height * 0.7,
        width * 0.25, height * 0.75 
      );
      
      // Tapering back along bottom edge of lower branch
      ctx.bezierCurveTo(
        width * 0.18, height * 0.75,
        width * 0.1, height * 0.7,
        width * 0.05, height * 0.8
      );
      
      // Right edge of main trunk down to ground
      ctx.lineTo(width * 0.1, treeBaseY);
      
      ctx.fill();
      
      // Inner Bark Texture (Noise lines)
      ctx.save();
      ctx.clip(); // Only draw inside the tree shape we just filled
      ctx.strokeStyle = "rgba(42, 10, 10, 0.4)"; // Deep red texture
      ctx.lineWidth = 1;
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * width * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, height * 0.4 + Math.random() * height * 0.6);
        ctx.bezierCurveTo(
          x + 20, height * 0.5,
          x - 10, height * 0.7,
          x + 30, height
        );
        ctx.stroke();
      }
      
      // Rim Light / Moon Highlight on the right edge
      ctx.strokeStyle = "rgba(212, 175, 55, 0.4)"; // Gold highlight
      ctx.lineWidth = 2;
      ctx.shadowColor = "#F9D76E";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      // Trace the right side of the main body for the highlight
      ctx.moveTo(width * 0.1, treeBaseY);
      ctx.bezierCurveTo(width * 0.05, height * 0.8, width * 0.1, height * 0.7, width * 0.18, height * 0.75); // Lower under
      ctx.bezierCurveTo(width * 0.22, height * 0.7, width * 0.15, height * 0.65, width * 0.08, height * 0.55); // Middle cleft
      ctx.bezierCurveTo(width * 0.12, height * 0.5, width * 0.2, height * 0.38, width * 0.3, height * 0.3); // Top under
      ctx.stroke();
      ctx.restore(); // Remove clip and shadow

      // Add small, twisted sub-branches (twigs) extending off the main shape
      const drawTwig = (sx: number, sy: number, ex: number, ey: number, cpX: number, cpY: number, width: number) => {
        // Twigs get slightly brighter towards the tips catching light
        const twigGrad = ctx.createLinearGradient(sx, sy, ex, ey);
        twigGrad.addColorStop(0, "#140505");
        twigGrad.addColorStop(1, "#3d0e0e");
        
        ctx.strokeStyle = twigGrad;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cpX, cpY, ex, ey);
        ctx.stroke();
      };

      // Twigs off top branch
      drawTwig(width * 0.2, height * 0.38, width * 0.25, height * 0.25, width * 0.22, height * 0.3, 3);
      drawTwig(width * 0.28, height * 0.32, width * 0.35, height * 0.28, width * 0.32, height * 0.3, 1.5);
      
      // Twigs off lower branch
      drawTwig(width * 0.15, height * 0.65, width * 0.18, height * 0.6, width * 0.16, height * 0.62, 2);
      drawTwig(width * 0.22, height * 0.72, width * 0.3, height * 0.8, width * 0.25, height * 0.75, 1);
      
      // Trunk roots spreading
      drawTwig(width * 0.08, height * 0.9, width * 0.15, height - 10, width * 0.12, height * 0.95, 5);
      drawTwig(width * 0.06, height * 0.85, width * 0.2, height - 20, width * 0.15, height * 0.88, 3);
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
      
      drawSky();
      drawMountains();
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
