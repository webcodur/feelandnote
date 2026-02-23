/*
  파일명: /components/ui/ElectricBorder.tsx
  기능: Electric Border 래퍼 컴포넌트
  책임: SVG feTurbulence 기반 전기 테두리 효과를 children에 적용한다.
        children이 크기를 결정하고, 전기 테두리가 자동으로 맞춰진다.
*/

"use client";

import { useId, useRef, useState, useEffect } from "react";

export interface ElectricBorderProps {
  color?: string;
  intensity?: number; // 0~100 → displacement scale
  speed?: number; // 0~100 → animation dur
  glow?: number; // 0~100 → blur radius
  radius?: number; // border-radius px
  /** @deprecated 하위 호환용. 생략하면 children 크기에 자동 맞춤 */
  width?: number;
  /** @deprecated 하위 호환용. 생략하면 children 크기에 자동 맞춤 */
  height?: number;
  children?: React.ReactNode;
  className?: string;
}

export default function ElectricBorder({
  color = "#dd8448",
  intensity = 25,
  speed = 0,
  glow = 15,
  radius,
  width: fixedWidth,
  height: fixedHeight,
  children,
  className = "",
}: ElectricBorderProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `electric-${uid}`;
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: fixedWidth ?? 0, h: fixedHeight ?? 0 });

  const isAuto = fixedWidth == null || fixedHeight == null;

  useEffect(() => {
    if (!isAuto || !contentRef.current) return;
    const el = contentRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ w: Math.round(w), h: Math.round(h) });
    });
    ro.observe(el);
    // 초기값
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, [isAuto]);

  const w = fixedWidth ?? size.w;
  const h = fixedHeight ?? size.h;

  // intensity → displacement scale: 0~100 → 5~50
  const scale = 5 + (intensity / 100) * 45;
  // speed → animation duration: 0~100 → 10s~2s (inverted)
  const dur = `${(10 - (speed / 100) * 8).toFixed(1)}s`;
  // glow → blur radius: 0~100 → 1~12
  const blurPx = 1 + (glow / 100) * 11;
  // feOffset 거리 (크기 비례, 최소 50)
  const dyRange = Math.max(50, h * 1.5);
  const dxRange = Math.max(50, w * 1.5);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* SVG Filter */}
      <svg className="absolute" style={{ width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={2} result="noise1" seed={1} />
            <feOffset in="noise1" dx={0} dy={0} result="offsetNoise1">
              <animate attributeName="dy" values={`${dyRange}; 0`} dur={dur} repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={2} result="noise2" seed={1} />
            <feOffset in="noise2" dx={0} dy={0} result="offsetNoise2">
              <animate attributeName="dy" values={`0; -${dyRange}`} dur={dur} repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={2} result="noise3" seed={2} />
            <feOffset in="noise3" dx={0} dy={0} result="offsetNoise3">
              <animate attributeName="dx" values={`${dxRange}; 0`} dur={dur} repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={2} result="noise4" seed={2} />
            <feOffset in="noise4" dx={0} dy={0} result="offsetNoise4">
              <animate attributeName="dx" values={`0; -${dxRange}`} dur={dur} repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />

            <feDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale={scale}
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>

      {/* 컨테이너: children이 flow 크기를 결정 */}
      <div
        className="relative p-[2px]"
        style={{
          borderRadius: radius,
          background: `linear-gradient(-30deg, ${color}66, transparent, ${color}66), linear-gradient(to bottom, #1a1a1a, #1a1a1a)`,
        }}
      >
        {/* electric border 레이어 (absolute, children 크기에 맞춤) */}
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: radius }}>
          {/* 전기 효과 border */}
          <div
            className="absolute inset-0"
            style={{
              borderRadius: radius,
              border: `2px solid ${color}`,
              filter: `url(#${filterId})`,
            }}
          />

          {/* glow-layer-1: tight */}
          <div
            className="absolute inset-0"
            style={{
              border: `2px solid ${color}99`,
              borderRadius: radius,
              filter: "blur(1px)",
            }}
          />

          {/* glow-layer-2: soft */}
          <div
            className="absolute inset-0"
            style={{
              border: `2px solid ${color}`,
              borderRadius: radius,
              filter: `blur(${blurPx}px)`,
            }}
          />

          {/* overlay */}
          <div
            className="absolute inset-0 mix-blend-overlay"
            style={{
              borderRadius: radius,
              transform: "scale(1.05)",
              filter: "blur(12px)",
              opacity: 0.8,
              background: "linear-gradient(-30deg, white, transparent 30%, transparent 70%, white)",
            }}
          />

          {/* background-glow */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              borderRadius: radius,
              filter: "blur(24px)",
              transform: "scale(1.05)",
              opacity: 0.3,
              background: `linear-gradient(-30deg, ${color}, transparent, ${color})`,
            }}
          />
        </div>

        {/* children: 실제 콘텐츠 (flow 유지, 필터 영향 없음) */}
        <div ref={contentRef} className="relative" style={{ borderRadius: radius }}>
          {children}
        </div>
      </div>
    </div>
  );
}
