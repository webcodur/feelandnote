/*
  파일명: /app/reading/[contentId]/components/PageSlider.tsx
  기능: 페이지 슬라이더 컴포넌트
  책임: 현재 읽고 있는 페이지 위치를 조절한다.
*/ // ------------------------------

"use client";

import { FileText } from "lucide-react";

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function PageSlider({ currentPage, totalPages, onChange }: Props) {
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  // 총 페이지 정보가 없는 경우
  if (totalPages === 0) {
    return (
      <div className="flex items-center gap-3">
        <FileText className="size-4 text-text-secondary" />
        <input
          type="number"
          value={currentPage || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder="현재 페이지"
          className="w-24 rounded-lg bg-white/5 px-3 py-2 text-sm placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-sm text-text-secondary">페이지</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">현재 페이지</span>
        <span className="font-medium">
          {currentPage} / {totalPages}p
          <span className="ms-2 text-text-secondary">({Math.round(progress)}%)</span>
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={totalPages}
        value={currentPage}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
      />
    </div>
  );
}
