"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ParticleWarpBackgroundProps {
  className?: string;
  particleCount?: number;
  baseSpeed?: number;
  particleColor?: string; // e.g. "rgba(255, 215, 0, "
}

interface WarpParticleContext {
  width: number;
  height: number;
  cx: number;
  cy: number;
  particleColor: string;
}

class WarpParticle {
  x: number;
  y: number;
  z: number;
  pastZ: number;
  isObject: boolean;
  objectType: number;
  sizeMult: number;
  colorOffset: number;
  rot: number;
  rotSpeed: number;

  constructor(private readonly context: WarpParticleContext, objForces = false) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.pastZ = 0;
    this.isObject = objForces || Math.random() < 0.05;
    this.objectType = 0;
    this.sizeMult = 1;
    this.colorOffset = 0;
    this.rot = 0;
    this.rotSpeed = 0;
    this.init(objForces);
  }

  init(objForces: boolean) {
    const { width, height } = this.context;
    this.isObject = objForces || Math.random() < 0.05;
    let rx = (Math.random() - 0.5) * width * 3;
    let ry = (Math.random() - 0.5) * height * 3;

    if (this.isObject) {
      const dist = Math.sqrt(rx * rx + ry * ry);
      const minDist = width * 0.7;
      if (dist < minDist) {
        const pushRatio = minDist / Math.max(dist, 1);
        rx *= pushRatio;
        ry *= pushRatio;
      }
    }

    this.x = rx;
    this.y = ry;
    this.z = Math.random() * width * 1.5;
    this.pastZ = this.z;

    this.sizeMult = this.isObject ? Math.random() * 70 + 30 : 1;
    const hues = [220, 240, 260];
    this.colorOffset = hues[Math.floor(Math.random() * hues.length)];
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.01;
  }

  update(speed: number) {
    const { width, height } = this.context;
    this.pastZ = this.z;
    this.z -= speed * (this.isObject ? 0.6 : 1);

    if (this.z < 1) {
      this.z = width * 1.5;
      this.pastZ = this.z;

      let rx = (Math.random() - 0.5) * width * 3;
      let ry = (Math.random() - 0.5) * height * 3;
      if (this.isObject) {
        const dist = Math.sqrt(rx * rx + ry * ry);
        const minDist = width * 0.7;
        if (dist < minDist) {
          const pushRatio = minDist / Math.max(dist, 1);
          rx *= pushRatio;
          ry *= pushRatio;
        }
        this.sizeMult = Math.random() * 70 + 30;
        const hues = [220, 240, 260];
        this.colorOffset = hues[Math.floor(Math.random() * hues.length)];
      }
      this.x = rx;
      this.y = ry;
    }

    if (this.isObject) this.rot += this.rotSpeed;
  }

  draw(ctx: CanvasRenderingContext2D, focalLength: number) {
    const { width, cx, cy, particleColor } = this.context;
    const sx = (this.x / this.z) * focalLength + cx;
    const sy = (this.y / this.z) * focalLength + cy;
    const px = (this.x / this.pastZ) * focalLength + cx;
    const py = (this.y / this.pastZ) * focalLength + cy;

    let alpha = 1;
    if (this.z > width) alpha = Math.max(0, 1 - (this.z - width) / (width * 0.5));

    if (!this.isObject) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = `${particleColor}${alpha})`;
      ctx.lineWidth = Math.max(0.1, 1.0 * (1 - this.z / width));
      ctx.lineCap = "round";
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.rot);
      const scale = (width / Math.max(this.z, 10)) * 0.5;
      ctx.scale(scale, scale);

      for (let j = 0; j < 2; j++) {
        const layerScale = 1 + (j * 0.3);
        const nebGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.sizeMult * layerScale);
        nebGrad.addColorStop(0, `hsla(${this.colorOffset}, 15%, 80%, ${alpha * (0.08 - j * 0.02)})`);
        nebGrad.addColorStop(0.5, `hsla(${this.colorOffset}, 20%, 40%, ${alpha * (0.04 - j * 0.01)})`);
        nebGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.save();
        ctx.rotate(j * Math.PI / 4);
        ctx.scale(1.5, 0.7);
        ctx.beginPath();
        ctx.arc(0, 0, this.sizeMult * layerScale, 0, Math.PI * 2);
        ctx.fillStyle = nebGrad;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}

export default function ParticleWarpBackground({
  className,
  particleCount = 2000,
  baseSpeed = 1.8,
  particleColor = "rgba(255, 255, 255, ", // 기본 화이트/블랙톤
}: ParticleWarpBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    const particleContext: WarpParticleContext = { width: 0, height: 0, cx: 0, cy: 0, particleColor };

    const resize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      cx = width / 2;
      cy = height / 2;
      particleContext.width = width;
      particleContext.height = height;
      particleContext.cx = cx;
      particleContext.cy = cy;
    };

    window.addEventListener("resize", resize);
    resize();

    const particles: WarpParticle[] = [];
    const objCount = Math.floor(particleCount * 0.05); // 안개/먼지 구름 덩어리의 비중 (5%)
    
    for (let i = 0; i < particleCount; i++) {
       const isObjForce = i < objCount;
       particles.push(new WarpParticle(particleContext, isObjForce));
    }

    const focalLength = width; // 시야각 결정

    const render = () => {
      // 투명도를 더 높여 잔상이 길게 꼬리를 물게 함으로써 속도감 있는 화면 연출
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 순수 블랙 배경
      ctx.fillRect(0, 0, width, height);

      // 워프 중 맥박 치는 듯한 가속/감속 효과
      const speed = baseSpeed + (Math.sin(Date.now() * 0.001) * 1.5); 

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(speed);
        particles[i].draw(ctx, focalLength);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, baseSpeed, particleColor]);

  return (
    <div className={cn("absolute inset-0 w-full h-full bg-black overflow-hidden", className)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* 화면 가장자리를 어둡게 눌러주고, 중앙의 터널감을 살려주는 비네팅 효과 (블랙) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000_120%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none opacity-80" />
    </div>
  );
}
