/*
  표지 이미지가 없을 때 제목 기반 결정적 랜덤 디자인 커버를 생성한다.
  동일 제목은 항상 동일한 배경 디자인을 보여준다.
  안내 문구(label)가 있으면 아이콘과 함께 깔끔하게 표시한다.
*/

import type { LucideIcon } from "lucide-react";

interface GenerativeBookCoverProps {
  /** 시드용 제목 (UI에 표시하지 않음) */
  title: string;
  ContentIcon: LucideIcon;
  /** 아이콘 크기 (기본 24) */
  iconSize?: number;
  /** 안내 문구 (예: "국문 표지 없음") */
  label?: string;
}

/* ── 해시 함수: 문자열 → 안정적인 정수 ── */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── 해시 기반 의사 난수 생성기 ── */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/* ── 팔레트 (배경 그라디언트 from → to) ── */
const PALETTES: [string, string][] = [
  ["#6366f1", "#a855f7"], // indigo → purple
  ["#ec4899", "#f97316"], // pink → orange
  ["#14b8a6", "#3b82f6"], // teal → blue
  ["#f59e0b", "#ef4444"], // amber → red
  ["#8b5cf6", "#ec4899"], // violet → pink
  ["#10b981", "#6366f1"], // emerald → indigo
  ["#f43f5e", "#a855f7"], // rose → purple
  ["#0ea5e9", "#22d3ee"], // sky → cyan
  ["#d946ef", "#f97316"], // fuchsia → orange
  ["#84cc16", "#14b8a6"], // lime → teal
  ["#e11d48", "#7c3aed"], // rose-dark → violet
  ["#2563eb", "#06b6d4"], // blue → cyan
];

/* ── 장식 패턴 ── */
const PATTERNS = [
  // 0: 사선 스트라이프
  (rng: () => number, accent: string) => (
    <div
      className="absolute inset-0 opacity-[0.12]"
      style={{
        backgroundImage: `repeating-linear-gradient(${Math.round(rng() * 60 + 30)}deg, ${accent}, ${accent} 2px, transparent 2px, transparent ${Math.round(rng() * 12 + 8)}px)`,
      }}
    />
  ),
  // 1: 도트 그리드
  (_rng: () => number, accent: string) => (
    <div
      className="absolute inset-0 opacity-[0.15]"
      style={{
        backgroundImage: `radial-gradient(circle, ${accent} 1.5px, transparent 1.5px)`,
        backgroundSize: "16px 16px",
      }}
    />
  ),
  // 2: 큰 원 장식
  (rng: () => number, accent: string) => {
    const size = Math.round(rng() * 60 + 80);
    const x = Math.round(rng() * 100);
    const y = Math.round(rng() * 100);
    return (
      <div
        className="absolute rounded-full opacity-[0.15]"
        style={{
          width: size,
          height: size,
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-50%, -50%)",
          background: accent,
        }}
      />
    );
  },
  // 3: 대각선 밴드
  (rng: () => number, accent: string) => {
    const angle = Math.round(rng() * 30 + 15);
    return (
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage: `repeating-linear-gradient(${angle}deg, transparent, transparent 20px, ${accent} 20px, ${accent} 40px)`,
        }}
      />
    );
  },
  // 4: 크로스해치
  (rng: () => number, accent: string) => {
    const gap = Math.round(rng() * 10 + 14);
    return (
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, ${accent}, ${accent} 1px, transparent 1px, transparent ${gap}px),
            repeating-linear-gradient(90deg, ${accent}, ${accent} 1px, transparent 1px, transparent ${gap}px)
          `,
        }}
      />
    );
  },
  // 5: 다이아몬드
  (_rng: () => number, accent: string) => (
    <div
      className="absolute inset-0 opacity-[0.1]"
      style={{
        backgroundImage: `
          linear-gradient(45deg, ${accent} 25%, transparent 25%),
          linear-gradient(-45deg, ${accent} 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${accent} 75%),
          linear-gradient(-45deg, transparent 75%, ${accent} 75%)
        `,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      }}
    />
  ),
];

export default function GenerativeBookCover({
  title,
  ContentIcon,
  iconSize = 24,
  label,
}: GenerativeBookCoverProps) {
  const seed = hashStr(title);
  const rng = seededRng(seed);

  const palette = PALETTES[seed % PALETTES.length];
  const [from, to] = palette;

  const patternIdx = Math.floor(rng() * PATTERNS.length);
  const angle = Math.round(rng() * 180);

  const accent = rng() > 0.5 ? "#ffffff" : from;

  return (
    <div
      className="w-full h-full overflow-hidden relative"
      style={{
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
      }}
    >
      {/* 장식 패턴 */}
      {PATTERNS[patternIdx](rng, accent)}

      {/* 글로우 효과 */}
      <div
        className="absolute rounded-full opacity-20 blur-2xl"
        style={{
          width: "60%",
          height: "60%",
          left: `${Math.round(rng() * 40 + 30)}%`,
          top: `${Math.round(rng() * 40 + 30)}%`,
          transform: "translate(-50%, -50%)",
          background: "white",
        }}
      />

      {/* 아이콘 + 안내 문구 — 반투명 오버레이로 가독성 확보 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10 shadow-lg">
          <ContentIcon size={iconSize} className="text-white/80" />
          {label && (
            <p className="text-[10px] font-medium text-white/90 text-center leading-snug">
              {label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
