/*
  표지 이미지가 없을 때 제목 기반 결정적 랜덤 디자인 커버를 생성한다.
  동일 제목은 항상 동일한 배경 디자인을 보여준다.
  안내 문구(label)가 있으면 아이콘과 함께 깔끔하게 표시한다.
*/

import type { LucideIcon } from "lucide-react";

interface ContentCoverFallbackProps {
  /** 시드용 제목 (UI에 표시하지 않음) */
  title: string;
  /** 없으면 아이콘 상자를 그리지 않는다(판본 미확인 띠가 같은 자리를 쓸 때) */
  ContentIcon?: LucideIcon;
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

/* ── 팔레트 (배경 그라디언트 from → to) ──
   오래된 천 장정처럼 채도를 낮춘 짙은 색만 쓴다. 형광 보라·분홍 그라데이션은 어두운 화면에서
   진짜 표지보다 먼저 눈에 띄어, 표지가 없는 작품이 가장 튀는 역전이 생겼다. */
const PALETTES: [string, string][] = [
  ["#4a3a2c", "#1f1812"], // 청동 갈색
  ["#34423b", "#161c19"], // 녹청
  ["#43354a", "#1b161d"], // 먹자주
  ["#323b4a", "#15191f"], // 먹청
  ["#4d4028", "#201a10"], // 황토
  ["#4a3030", "#1d1414"], // 적갈
  ["#2b3e44", "#11191c"], // 청록 먹
  ["#403d34", "#1a1916"], // 돌빛
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

export default function ContentCoverFallback({
  title,
  ContentIcon,
  iconSize = 24,
  label,
}: ContentCoverFallbackProps) {
  const seed = hashStr(title);
  const rng = seededRng(seed);

  const palette = PALETTES[seed % PALETTES.length];
  const [from, to] = palette;

  const patternIdx = Math.floor(rng() * PATTERNS.length);
  const angle = Math.round(rng() * 180);

  // 무늬는 흰색 또는 서비스 금색(accent 토큰과 같은 값)만 쓴다
  const accent = rng() > 0.5 ? "#ffffff" : "#d4af37";

  return (
    <div
      className="w-full h-full overflow-hidden relative"
      style={{
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
      }}
    >
      {/* 장식 패턴 */}
      {PATTERNS[patternIdx](rng, accent)}

      {/* 등 쪽 그림자 — 장정한 책처럼 왼쪽 가장자리를 살짝 눌러 둔다 */}
      <div className="absolute inset-y-0 start-0 w-[8%] bg-gradient-to-r from-black/35 to-transparent" />

      {/* 아이콘 + 안내 문구. 둘 다 없으면 상자도 그리지 않는다 */}
      {(ContentIcon || label) && (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="flex max-w-full flex-col items-center gap-1.5 rounded-control bg-black/40 px-3 py-2.5">
            {ContentIcon && <ContentIcon size={iconSize} strokeWidth={1.5} className="text-text-secondary" />}
            {label && (
              <p className="text-[11px] font-medium text-text-primary text-center leading-snug">
                {label}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
