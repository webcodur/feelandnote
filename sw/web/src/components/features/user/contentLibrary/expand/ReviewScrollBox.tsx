/*
  파일명: /components/features/user/contentLibrary/expand/ReviewScrollBox.tsx
  기능: 감상배경·독백·안내 본문 영역. 테두리 없이 글만 띄우고, 긴 글만 이 안에서 굴린다.
  책임: 높이를 16줄로 넉넉히 잡아 열에 아홉은 스크롤이 아예 생기지 않게 한다.
        예전에 6줄로 좁혀 거의 모든 글이 갇혔고, 그걸 휠 가로채기로 풀려다 실패했다.
        overscroll을 막지 않아 끝에 닿으면 브라우저가 휠을 페이지로 넘긴다.
        5px 스크롤 막대만으로는 글이 더 있는지 모르므로, 남은 글이 있을 때만 끝을 흐린다(useClippedText).
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";

import { useClippedText } from "@/hooks/useClippedText";

interface ReviewScrollBoxProps {
  children: ReactNode;
  /** 눌러 전문을 여는 조작. 모달이 다른 읽기 화면이라 길이와 무관하게 항상 눌리게 한다 */
  onOpen?: () => void;
  openLabel?: string;
  /** 높이 제한을 좁은 화면에만 둔다. 넓은 화면은 글을 펼쳐 두되 눌러 여는 조작은 남는다 */
  mobileOnly?: boolean;
}

export default function ReviewScrollBox({ children, onOpen, openLabel, mobileOnly = false }: ReviewScrollBoxProps) {
  const { ref, isClipped } = useClippedText<HTMLDivElement>(null);
  const interactive = !!onOpen;

  return (
    <div className="min-w-0 w-full">
      <div
        ref={ref}
        className={`custom-scrollbar max-h-[29.6em] min-w-0 w-full overflow-y-auto overscroll-y-auto whitespace-pre-line break-words font-sans text-[15px] leading-[1.85] text-text-secondary ${
          mobileOnly ? "md:max-h-none md:overflow-y-visible" : ""
        } ${
          isClipped ? "clip-fade-end" : ""
        } ${interactive ? "cursor-pointer hover:brightness-125 focus-visible:outline-none" : ""}`}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-haspopup={interactive ? "dialog" : undefined}
        aria-label={interactive ? openLabel : undefined}
        title={interactive ? openLabel : undefined}
        onClick={
          interactive
            ? () => {
                // 글을 긁으려던 클릭(드래그 선택)은 모달을 열지 않는다
                if (!window.getSelection()?.toString()) onOpen?.();
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen?.();
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
