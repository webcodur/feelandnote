/*
  파일명: /components/features/user/contentLibrary/expand/ReviewScrollBox.tsx
  기능: 감상배경·독백·안내 본문의 짧은 미리보기. 전문은 눌러 모달로 읽는다.
  책임: 화면 높이에 맞춰 일찍 자르고 내부 스크롤은 만들지 않는다.
        PC·모바일 모두 실제로 잘린 글의 끝만 흐린다(useClippedText).
*/ // ------------------------------
"use client";

import type { ReactNode } from "react";

import { useClippedText } from "@/hooks/useClippedText";

interface ReviewScrollBoxProps {
  children: ReactNode;
  /** 눌러 전문을 여는 조작. 모달이 다른 읽기 화면이라 길이와 무관하게 항상 눌리게 한다 */
  onOpen?: () => void;
  openLabel?: string;
}

export default function ReviewScrollBox({ children, onOpen, openLabel }: ReviewScrollBoxProps) {
  const { ref, isClipped } = useClippedText<HTMLDivElement>(null);
  const interactive = !!onOpen;

  return (
    <div className="min-w-0 w-full">
      <div
        ref={ref}
        className={`max-h-[min(14rem,35svh)] min-w-0 w-full overflow-clip whitespace-pre-line break-words font-sans text-[15px] leading-[1.85] text-text-secondary ${
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
