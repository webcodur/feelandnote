/*
  재질 기반 액자 프레임
  - materials.ts 단일 원천
  - FramePreview의 Frame 컴포넌트 기반
  - 셀럽 카드, 프로필 액자 등에서 재사용
*/
"use client";

import { type ReactNode, type CSSProperties } from "react";
import { MATERIALS, type MaterialKey, type MaterialConfig } from "@/constants/materials";

// #region Types
interface MaterialFrameProps {
  /** 재질 키 또는 MaterialConfig 직접 전달 */
  material: MaterialKey | MaterialConfig;
  children: ReactNode;
  className?: string;
  /** 프레임 두께 */
  frameSize?: "sm" | "md" | "lg";
  /** 내부 영역 스타일 */
  innerClassName?: string;
  innerStyle?: CSSProperties;
}

const FRAME_SIZES = {
  sm: { padding: "p-1 md:p-1.5", bevel: 3 },
  md: { padding: "p-2 md:p-3", bevel: 5 },
  lg: { padding: "p-3 md:p-4", bevel: 7 },
};
// #endregion

// #region Legacy 랭크 → 재질 매핑 (기존 S/A/B/C/D 호환)
type LegacyRank = "S" | "A" | "B" | "C" | "D";

const LEGACY_RANK_TO_MATERIAL: Record<LegacyRank, MaterialKey> = {
  S: "gold",
  A: "gold",
  B: "silver",
  C: "bronze",
  D: "stone",
};

/**
 * 기존 S/A/B/C/D 랭크를 MaterialKey로 변환 (Legacy 호환)
 * 새 시스템에서는 CelebLevel을 직접 사용 권장
 */
export const getMaterialFromRank = (rank: string | undefined): MaterialKey => {
  const r = (rank?.toUpperCase() || "D") as LegacyRank;
  return LEGACY_RANK_TO_MATERIAL[r] || "wood";
};
// #endregion

export default function MaterialFrame({
  material,
  children,
  className = "",
  frameSize = "md",
  innerClassName = "",
  innerStyle,
}: MaterialFrameProps) {
  const mat = typeof material === "string" ? MATERIALS[material] : material;
  const size = FRAME_SIZES[frameSize];

  const isHolo = mat.key === "holographic";
  const animationClass = isHolo ? "animate-holo-gradient" : "";

  // 배경 스타일 (텍스처 포함)
  const backgroundStyle = mat.textureUrl
    ? {
        background: mat.gradient.simple,
        backgroundImage: `${mat.gradient.simple}, url("${mat.textureUrl}")`,
        backgroundBlendMode: "overlay" as const,
        boxShadow: `${mat.shadow.base}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      }
    : isHolo
    ? {
        backgroundImage: mat.gradient.simple,
        boxShadow: `${mat.shadow.base}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      }
    : {
        background: mat.gradient.simple,
        boxShadow: `${mat.shadow.base}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      };

  return (
    <div
      className={`group relative overflow-hidden ${size.padding} ${className} ${animationClass}`}
      style={backgroundStyle}
    >
      {/* LP 애니메이션 (금/은/동) */}
      {mat.lp && (
        <div
          className="absolute pointer-events-none [animation-play-state:paused] group-hover:[animation-play-state:running]"
          style={{
            top: "-100%",
            left: "-100%",
            width: "300%",
            height: "300%",
            background: mat.lp.gradient,
            animation: `rotateSpin ${mat.lp.duration || "8s"} linear infinite`,
            mixBlendMode: (mat.lp.blendMode || "overlay") as any,
            zIndex: 0,
          }}
        />
      )}

      {/* 실버 쉬머 */}
      {mat.key === "silver" && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px),
              repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,220,255,0.08) 4px, rgba(200,220,255,0.08) 5px)
            `,
          }}
        />
      )}

      {/* 베벨 효과 */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          boxShadow: `inset ${size.bevel}px ${size.bevel}px ${size.bevel}px rgba(255,255,255,0.25), inset -2px -2px 4px rgba(0,0,0,0.3)`,
        }}
      />

      {/* 외곽 테두리 */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          border: `1px solid ${mat.colors.border}`,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      />

      {/* 내용 영역 */}
      <div
        className={`relative w-full h-full bg-neutral-900 overflow-hidden z-[3] ${innerClassName}`}
        style={{
          boxShadow: "inset 0 0 12px 4px rgba(0,0,0,0.7), inset 0 0 4px 1px rgba(0,0,0,0.5)",
          ...innerStyle,
        }}
      >
        {children}
        {/* 안쪽 vignette 효과 */}
        <div
          className="absolute inset-0 pointer-events-none z-[10]"
          style={{
            boxShadow: "inset 0 0 15px 3px rgba(0,0,0,0.4)",
          }}
        />
      </div>
    </div>
  );
}

export type { MaterialFrameProps };
