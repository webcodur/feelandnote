/*
  파일명: /components/features/user/contentLibrary/expand/ReviewScrollBox.tsx
  기능: 감상배경 본문 상자. 긴 글만 이 안에서 굴린다.
  책임: 상자를 16줄로 넉넉히 잡아 열에 아홉은 스크롤이 아예 생기지 않게 한다.
        예전에 6줄로 좁혀 거의 모든 글이 상자에 갇혔고, 그걸 휠 가로채기로 풀려다 실패했다.
        overscroll을 막지 않아 상자 끝에 닿으면 브라우저가 휠을 페이지로 넘긴다.
        5px 스크롤 막대만으로는 글이 더 있는지 모르므로, 남은 글이 있을 때만 끝을 흐린다(useClippedText).
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";

import { useClippedText } from "@/hooks/useClippedText";

export default function ReviewScrollBox({ children }: { children: ReactNode }) {
  const { ref, isClipped } = useClippedText<HTMLDivElement>(null);

  return (
    <div className="min-w-0 w-full rounded-lg border border-white/10 bg-white/[0.02]">
      <div
        ref={ref}
        className={`custom-scrollbar max-h-[29.6em] min-w-0 w-full overflow-y-auto overscroll-y-auto whitespace-pre-line break-words px-4 py-3 font-sans text-[15px] leading-[1.85] text-text-secondary ${
          isClipped ? "clip-fade-end" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
