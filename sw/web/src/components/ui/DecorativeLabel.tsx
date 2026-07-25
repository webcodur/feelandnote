"use client";

import type { LucideIcon } from "lucide-react";

interface DecorativeLabelProps {
  label: string;
  className?: string;
  icon?: LucideIcon;
  showLines?: boolean;
}

/**
 * Neo-Pantheon 스타일의 장식용 라벨 컴포넌트
 * 글자 사이 공백 및 양옆 구분선을 포함합니다.
 */
export default function DecorativeLabel({
  label,
  className = "",
  icon: Icon,
  showLines = true,
}: DecorativeLabelProps) {
  // 단어별로 분리, 각 단어 내 글자 사이 공백 추가
  const words = label.split(" ").map((word) => word.split("").join(" "));

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      {showLines && (
        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-accent opacity-60 sm:w-12" />
      )}
      <span className="flex items-center gap-4 font-sans text-accent text-xs sm:text-sm tracking-widest font-black whitespace-nowrap">
        {Icon && <Icon size={17} strokeWidth={1.8} aria-hidden />}
        {words.map((word, i) => (
          <span key={i}>{word}</span>
        ))}
      </span>
      {showLines && (
        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-accent opacity-60 sm:w-12" />
      )}
    </div>
  );
}
