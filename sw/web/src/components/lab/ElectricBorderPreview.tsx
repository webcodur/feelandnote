/*
  파일명: /components/lab/ElectricBorderPreview.tsx
  기능: Electric Border 효과 프리뷰 (Lab 전용)
  책임: ElectricBorder 컴포넌트의 인터랙티브 데모를 제공한다.
*/

"use client";

import { useState } from "react";
import ElectricBorder from "@/components/ui/ElectricBorder";

// ─── 프리셋 컬러 ─────────────────────────────────────────
const PRESETS = [
  { label: "Amber", color: "#dd8448" },
  { label: "Gold", color: "#d4af37" },
  { label: "Cyan", color: "#22d3ee" },
  { label: "Violet", color: "#a78bfa" },
  { label: "Emerald", color: "#34d399" },
  { label: "Rose", color: "#fb7185" },
] as const;

// ─── Glass Tag ───────────────────────────────────────────
function GlassTag({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-fit px-4 py-2 text-[14px] font-bold uppercase text-white/80"
      style={{
        borderRadius: 14,
        background:
          "radial-gradient(47.2% 50% at 50.39% 88.37%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%), rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          padding: 1,
          borderRadius: "inherit",
          background:
            "linear-gradient(150deg, rgba(255,255,255,0.48) 16.73%, rgba(255,255,255,0.08) 30.2%, rgba(255,255,255,0.08) 68.2%, rgba(255,255,255,0.6) 81.89%)",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />
      {children}
    </div>
  );
}

// ─── Range Slider ────────────────────────────────────────
function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-white/50 uppercase tracking-widest flex justify-between">
        {label}
        <span className="text-white/30 tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent h-1 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
      />
    </label>
  );
}

// ─── Preview ─────────────────────────────────────────────
export default function ElectricBorderPreview() {
  const [color, setColor] = useState("#dd8448");
  const [intensity, setIntensity] = useState(25);
  const [speed, setSpeed] = useState(0);
  const [glowLevel, setGlowLevel] = useState(15);
  const [borderRadius, setBorderRadius] = useState(24);

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start">
      {/* ── Left: Demo Card ── */}
      <div className="flex-1 flex items-center justify-center min-h-[600px]">
        <ElectricBorder
          color={color}
          intensity={intensity}
          speed={speed}
          glow={glowLevel}
          radius={borderRadius}
        >
          {/* content-top */}
          <div className="flex flex-col px-12 pt-12 pb-4 flex-1">
            <GlassTag>Dramatic</GlassTag>
            <p
              className="mt-auto text-4xl font-medium text-white"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              Electric Border
            </p>
          </div>

          {/* divider */}
          <hr
            className="border-none h-px"
            style={{
              background: "currentColor",
              opacity: 0.1,
              maskImage: "linear-gradient(to right, transparent, black, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black, transparent)",
            }}
          />

          {/* content-bottom */}
          <div className="px-12 py-8">
            <p className="text-sm text-white/50 leading-relaxed">
              In case you&apos;d like to emphasize something very dramatically.
            </p>
          </div>
        </ElectricBorder>
      </div>

      {/* ── Right: Controls ── */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6 p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
        {/* Color presets */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-white/50 uppercase tracking-widest">Color</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.color}
                onClick={() => setColor(p.color)}
                className="group relative w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: p.color,
                  borderColor: color === p.color ? "white" : `${p.color}60`,
                  transform: color === p.color ? "scale(1.15)" : "scale(1)",
                  boxShadow: color === p.color ? `0 0 12px ${p.color}80` : "none",
                }}
                title={p.label}
              />
            ))}
            <label
              className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors overflow-hidden relative"
              title="Custom color"
            >
              <span className="text-white/30 text-xs">+</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Hex input */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50 uppercase tracking-widest">Hex</span>
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 font-mono focus:outline-none focus:border-accent/50 transition-colors"
            maxLength={7}
          />
        </label>

        {/* Sliders */}
        <Slider label="Intensity" value={intensity} onChange={setIntensity} />
        <Slider label="Speed" value={speed} onChange={setSpeed} />
        <Slider label="Glow" value={glowLevel} onChange={setGlowLevel} />
        <Slider label="Radius" value={borderRadius} onChange={setBorderRadius} min={0} max={48} />

        {/* Usage snippet */}
        <div className="flex flex-col gap-1.5 mt-2">
          <span className="text-xs text-white/50 uppercase tracking-widest">Usage</span>
          <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] text-white/50 leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap">
{`<ElectricBorder
  color="${color}"
  intensity={${intensity}}
  speed={${speed}}
  glow={${glowLevel}}
  radius={${borderRadius}}
>
  {children}
</ElectricBorder>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
