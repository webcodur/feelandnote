/*
  파일명: /components/ui/Logo.tsx
  기능: 로고 컴포넌트
  책임: Feel&Note 브랜드 로고를 표시한다. 클릭 시 랜딩 페이지로 이동.
*/ // ------------------------------

"use client";

import Link from "next/link";

// #region 타입 정의
type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoIconSize = "xs" | "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

interface LogoIconProps {
  size?: LogoIconSize;
  className?: string;
  asLink?: boolean;
}
// #endregion

// #region 스타일 상수
const LOGO_FONT = "font-['Oswald']";

const sizeClasses: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-6xl md:text-7xl",
};

const iconSizeClasses: Record<LogoIconSize, { container: string; text: string }> = {
  xs: { container: "w-6 h-6", text: "text-xs" },
  sm: { container: "w-8 h-8", text: "text-sm" },
  md: { container: "w-10 h-10", text: "text-base" },
  lg: { container: "w-12 h-12", text: "text-lg" },
};
// #endregion

// #region Logo 컴포넌트 (전체 텍스트)
export default function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <Link href="/" className="cursor-pointer">
      <span
        className={`
          ${LOGO_FONT} font-bold text-text-primary
          tracking-tight ${sizeClasses[size]} ${className}
        `}
      >
        Feel
        <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
          &
        </span>
        Note
      </span>
    </Link>
  );
}
// #endregion

// #region LogoIcon 컴포넌트 (정사각형 F&N)
export function LogoIcon({ size = "md", className = "", asLink = true }: LogoIconProps) {
  const { container, text } = iconSizeClasses[size];

  const iconContent = (
    <span
      className={`
        ${container} ${LOGO_FONT}
        inline-flex items-center justify-center
        bg-gradient-to-br from-accent to-purple-500
        rounded-lg font-semibold text-white
        tracking-tight ${text} ${className}
      `}
    >
      F&N
    </span>
  );

  return asLink ? (
    <Link href="/" className="cursor-pointer">
      {iconContent}
    </Link>
  ) : (
    iconContent
  );
}
// #endregion
