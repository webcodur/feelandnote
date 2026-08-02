/*
  파일명: /components/shared/SectionHeader.tsx
  기능: 페이지 섹션 공통 헤더
  책임: 각 섹션의 타이틀과 설명문을 신전 테마에 맞게 보여준다.
*/

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;       // 한글 메인 타이틀 (예: 인기 작품)
  label?: string;         // 영문 서브 라벨 (예: POPULAR) - 선택사항
  description: ReactNode; // 설명 문구 (줄바꿈 가능)
  className?: string;
  descriptionClassName?: string;
  as?: "h1" | "h2" | "h3"; // 제목 태그 (기본: h2)
}

export default function SectionHeader({
  title,
  label,
  description,
  className = "",
  descriptionClassName,
  as: Tag = "h2",
}: Props) {
  return (
    <div className={`text-center py-6 sm:py-8 mb-6 ${className}`}>
      {/* 상단 장식 라인 (기둥 모티브) */}
      <div className="flex items-center justify-center gap-4 mb-3 opacity-60">
        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-accent" />
        <div className="w-1.5 h-1.5 rotate-45 border border-accent" />
        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-accent" />
      </div>

      {/* 영문 라벨 */}
      {label && (typeof title !== "string" || label.toLowerCase() !== title.toLowerCase()) && (
        <span className="block text-xs sm:text-sm font-cinzel font-bold text-accent tracking-[0.2em] uppercase mb-1">
          {label}
        </span>
      )}

      {/* 메인 타이틀 */}
      <Tag className="text-2xl sm:text-3xl font-serif font-black text-text-primary mb-5 md:mb-6 whitespace-pre-line leading-[1.4]">
        {title}
      </Tag>

      {/* 설명 문구 */}
      <div
        className={cn(
          "text-sm sm:text-base text-text-secondary/80 font-medium leading-relaxed max-w-xl mx-auto whitespace-pre-line break-keep",
          descriptionClassName,
        )}
      >
        {description}
      </div>

      {/* 하단 페이드 장식 */}
      <div className="mt-6 w-24 h-[1px] mx-auto bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
