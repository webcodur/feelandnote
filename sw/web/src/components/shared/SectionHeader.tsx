/*
  파일명: /components/shared/SectionHeader.tsx
  기능: 페이지 섹션 공통 헤더
  책임: 각 섹션의 타이틀과 설명문을 신전 테마에 맞게 보여준다.
*/

"use client";

import { ReactNode } from "react";

interface Props {
  title: string;          // 한글 메인 타이틀 (예: 공통 서가)
  label?: string;         // 영문 서브 라벨 (예: CHOSEN ONES) - 선택사항
  description: ReactNode; // 설명 문구 (줄바꿈 가능)
  className?: string;
}

export default function SectionHeader({ title, label, description, className = "" }: Props) {
  return (
    <div className={`text-center py-6 sm:py-8 mb-6 ${className}`}>
      {/* 상단 장식 라인 (기둥 모티브) */}
      <div className="flex items-center justify-center gap-4 mb-3 opacity-60">
        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-accent" />
        <div className="w-1.5 h-1.5 rotate-45 border border-accent" />
        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-accent" />
      </div>

      {/* 영문 라벨 */}
      {label && (
        <span className="block text-[10px] sm:text-xs font-cinzel font-bold text-accent tracking-[0.2em] uppercase mb-1">
          {label}
        </span>
      )}

      {/* 메인 타이틀 */}
      <h2 className="text-2xl sm:text-3xl font-serif font-black text-text-primary mb-3">
        {title}
      </h2>

      {/* 설명 문구 */}
      <div className="text-sm sm:text-base text-text-secondary/80 font-medium leading-relaxed max-w-xl mx-auto whitespace-pre-line break-keep">
        {description}
      </div>

      {/* 하단 페이드 장식 */}
      <div className="mt-6 w-24 h-[1px] mx-auto bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
