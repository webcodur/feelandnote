/*
  파일명: /components/ui/Logo.tsx
  기능: 로고 컴포넌트
  책임: Feel&Note 브랜드 로고를 표시한다.
*/ // ------------------------------

"use client";

import Link from "next/link";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  href?: string;
  className?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-6xl md:text-7xl",
};

export default function Logo({ size = "md", href, className = "" }: LogoProps) {
  const content = (
    <span className={`font-black text-text-primary ${sizeClasses[size]} ${className}`}>
      Feel
      <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
        &
      </span>
      Note
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="cursor-pointer">
        {content}
      </Link>
    );
  }

  return <div className="cursor-pointer">{content}</div>;
}
