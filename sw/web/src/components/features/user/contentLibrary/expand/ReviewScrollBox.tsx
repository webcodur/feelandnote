/*
  파일명: /components/features/user/contentLibrary/expand/ReviewScrollBox.tsx
  기능: 감상배경·독백·안내 본문의 짧은 미리보기. 전문은 눌러 모달로 읽는다.
  책임: 화면 높이에 맞춰 일찍 자르고 내부 스크롤은 만들지 않는다.
        마지막으로 보이는 글줄을 흐린다. 감상 목록은 글이 잘릴 때만 흐릴 수 있다.
        빈 개행은 흐림의 기준에서 제외한다.
*/ // ------------------------------
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 미리보기 본문 문체 — 상한 안이라 통째로 싣는 자리(ExpandCard)도 같은 문체를 쓴다 */
export const REVIEW_PREVIEW_TEXT_CLASS =
  "whitespace-pre-line break-words font-sans text-[15px] leading-[1.85] text-text-secondary";

interface ReviewScrollBoxProps {
  children: ReactNode;
  /** 눌러 전문을 여는 조작. 모달이 다른 읽기 화면이라 길이와 무관하게 항상 눌리게 한다 */
  onOpen?: () => void;
  openLabel?: string;
  /** 짧은 글까지 흐리는 읽기 미리보기와 달리 감상 목록은 잘린 글에만 흐림을 쓴다 */
  fadeWhenFits?: boolean;
}

export default function ReviewScrollBox({ children, onOpen, openLabel, fadeWhenFits = true }: ReviewScrollBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [textMask, setTextMask] = useState<string>();
  const interactive = !!onOpen;

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      if (!bounds.height) return;
      if (!fadeWhenFits && element.scrollHeight <= element.clientHeight + 1) {
        setTextMask(undefined);
        return;
      }
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let lastLine: DOMRect | null = null;
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) {
          // 개행·빈 줄은 건너뛰고 실제 글자가 보이는 마지막 줄을 기준으로 삼는다.
          if (rect.width <= 0 || rect.height <= 0 || rect.top >= bounds.bottom || rect.bottom <= bounds.top) continue;
          if (!lastLine || rect.top >= lastLine.top) lastLine = rect;
        }
      }
      if (!lastLine) return;
      const end = Math.min(lastLine.bottom, bounds.bottom) - bounds.top;
      const lineHeight = Number.parseFloat(getComputedStyle(element.firstElementChild ?? element).lineHeight) || lastLine.height;
      const start = Math.max(0, end - lineHeight * 2);
      setTextMask(`linear-gradient(to bottom, black ${start}px, transparent ${end}px)`);
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [children, fadeWhenFits]);

  return (
    <div className="mx-auto min-w-0 w-full max-w-[var(--reading-preview-max-width,100%)]">
      <div
        ref={ref}
        className={`max-h-[var(--reading-preview-max-height,min(14rem,35svh))] min-w-0 w-full overflow-clip ${REVIEW_PREVIEW_TEXT_CLASS} ${fadeWhenFits || textMask ? "clip-fade-end" : ""} ${interactive ? "cursor-pointer hover:brightness-125 focus-visible:outline-none" : ""}`}
        style={textMask ? { maskImage: textMask } : undefined}
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
