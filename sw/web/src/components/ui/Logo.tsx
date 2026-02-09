/*
  파일명: /components/ui/Logo.tsx
  기능: 로고 컴포넌트 (고서/활판인쇄 스타일)
  책임: Feel&Note 브랜드 로고를 표시한다.
*/ // ------------------------------

"use client";

import Link from "next/link";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "default" | "hero";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  onClick?: () => void;
  asLink?: boolean;
  subtitle?: string;
}

// #region 사이즈 설정
const sizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

const heroSizeClasses = {
  sm: "text-[clamp(1rem,8vw,4rem)] md:text-6xl",
  md: "text-[clamp(1.1rem,10vw,5rem)] md:text-7xl",
  lg: "text-[clamp(1.15rem,12vw,6rem)] md:text-8xl",
  xl: "text-[clamp(2.5rem,13vw,5.5rem)] md:text-7xl lg:text-8xl",
};
// #endregion

export default function Logo({
  size = "md",
  variant = "default",
  className = "",
  onClick,
  asLink = true,
  subtitle,
}: LogoProps) {
  const isHero = variant === "hero";
  const textSizeClass = isHero ? heroSizeClasses[size] : sizeClasses[size];
  const creamClass = isHero ? "logo-text-cream-hero" : "logo-text-cream";
  const sepiaClass = isHero ? "logo-text-sepia-hero" : "logo-text-sepia";

  // #region 로고 텍스트 렌더링
  const logoContent = (
    <span
      className={`font-cormorant font-semibold tracking-wide ${textSizeClass} flex items-center justify-center`}
    >
      {isHero ? (
        // 히어로: 항상 FEEL & NOTE
        <>
          <span className={creamClass}>FEEL</span>
          <span className={`${sepiaClass} mx-1 md:mx-3`}>&</span>
          <span className={creamClass}>NOTE</span>
        </>
      ) : (
        // 일반: 모바일 F&N, PC FEEL&NOTE
        <>
          {/* Mobile: F&N - 정사각형 느낌으로 붙여서 */}
          <span className="md:hidden tracking-tight">
            <span className={creamClass}>F</span>
            <span className={sepiaClass}>&</span>
            <span className={creamClass}>N</span>
          </span>
          {/* PC: FEEL&NOTE */}
          <span className="hidden md:inline">
            <span className={creamClass}>FEEL</span>
            <span className={`${sepiaClass} mx-1`}>&</span>
            <span className={creamClass}>NOTE</span>
          </span>
        </>
      )}
    </span>
  );
  // #endregion

  // #region 컨테이너 래퍼
  const containerContent = (
    <div
      className={`flex flex-col items-center select-none group ${className}`}
    >
      {logoContent}
      {subtitle && (
        <span
          className={`
            font-cormorant tracking-[0.1em] sm:tracking-[0.3em] md:tracking-[0.5em] mt-2 md:mt-4
            text-text-secondary/60 text-center
            ${isHero ? "text-[10px] sm:text-base md:text-2xl" : "text-[10px] md:text-xs"}
          `}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
  // #endregion

  return asLink ? (
    <Link href="/" onClick={onClick}>
      {containerContent}
    </Link>
  ) : (
    <div onClick={onClick}>{containerContent}</div>
  );
}

// #region LogoIcon (deprecated, 호환성 유지)
export function LogoIcon({ size = "md", className = "", asLink = true }: any) {
  const icon = (
    <div
      className={`flex items-center justify-center p-1.5 rounded-lg bg-bg-card border border-accent/30 ${className}`}
    >
      <span className="font-cormorant text-sm logo-text-sepia">F&N</span>
    </div>
  );

  return asLink ? <Link href="/">{icon}</Link> : icon;
}
// #endregion
