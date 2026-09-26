/*
  파일명: /components/shared/AutoScrollReadingText.tsx
  기능: 낭독에 맞춰 스스로 내려가는 읽기 본문
  책임: 서재탐방 BookCardVisualLegacy.scrollPiecewise의 웹 이식 — 읽기 위치(문장 안쪽
        진행률까지 반영한 DOM 높이)가 뷰포트 하단 3줄에 닿는 순간 위쪽 2줄 자리가 보이도록
        부드럽게 민다. 문장이 바뀔 때가 아니라 재생 시각이 갱신될 때마다 검사해 밀리지 않는다.
        viewport="self"면 자체 스크롤 상자를 만들고, "parent"면 가장 가까운 스크롤 조상
        (모달 본문 스크롤 등)을 찾아 따라간다. 문장 눌러 그 시점부터 재생도 지원한다.
*/ // ------------------------------

"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import type { ReadingSegment } from "@/lib/reading-timing";
import { cn } from "@/lib/utils";

/* 서재탐방 스크롤 규칙 — 밀린 뒤 읽기 위치는 위에서 2줄, 아래 3줄에 닿으면 다시 민다 */
const TOP_LINES = 2;
const BTM_LINES = 3;
/* 사용자가 직접 스크롤한 뒤 이 시간만큼 자동 스크롤을 쉰다 — 읽던 자리를 빼앗지 않는다 */
const USER_SCROLL_HOLD_MS = 2200;

interface AutoScrollReadingTextProps {
  text: string;
  /** 문장 타이밍 — 재생 문장 강조·읽기 위치 계산·눌러 그 시점부터 재생에 쓴다 */
  segments?: ReadingSegment[] | null;
  /** 재생 중에는 문장을 따라가고, 일시정지 중에는 열기·위치 탐색 때만 맞춘다 */
  status: string;
  /** 재생 위치(초) — 문장 안쪽 진행률로 읽기 위치를 잇는다 */
  currentTime: number;
  onPlayFrom?: (seconds: number) => void;
  sentenceLabel?: string;
  highlightClassName?: string;
  highlightStyle?: CSSProperties;
  /** self: 자체 스크롤 상자를 만든다. parent: 가장 가까운 스크롤 조상(모달 본문 등)을 따라간다 */
  viewport?: "self" | "parent";
  className?: string;
}

/** 가장 가까운 스크롤 조상 — 모달 본문 스크롤 영역 같은 바깥 뷰포트를 찾는다 */
const findScroller = (el: HTMLElement): HTMLElement | null => {
  let node = el.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
};

export default function AutoScrollReadingText({
  text, segments, status, currentTime, onPlayFrom, sentenceLabel, highlightClassName, highlightStyle, viewport = "self", className,
}: AutoScrollReadingTextProps) {
  const selfRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [parentScroller, setParentScroller] = useState<HTMLElement | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const userHoldUntil = useRef(0);
  const lastPosition = useRef<{ scroller: HTMLElement; text: string; time: number; layout: number } | null>(null);

  /* parent 모드 — 마운트되면 모달 본문 같은 가장 가까운 스크롤 조상을 찾아 단다 */
  useLayoutEffect(() => {
    if (viewport !== "parent" || !contentRef.current) return;
    setParentScroller(findScroller(contentRef.current));
  }, [viewport, text]);

  const playing = status === "playing" || status === "loading";
  const active = status === "idle" || !segments?.length
    ? null
    : segments.find((s) => currentTime >= s.start && currentTime < s.end) ?? null;
  const mark = active ? { start: active.textStart, end: active.textEnd } : null;

  /* 재생 시각이 갱신될 때마다 읽기 위치를 검사한다.
     읽기 위치 = 강조 문장의 맨 위 + (문장 높이 × 문장 안 재생 진행률) — 서재탐방의 readPos.
     그 위치가 아래 3줄에 닿거나 위로 벗어나면 위쪽 2줄 자리로 부드럽게 민다. */
  useLayoutEffect(() => {
    if (!active) return;
    const scroller = viewport === "parent" ? parentScroller : selfRef.current;
    if (!scroller || !scroller.clientHeight) return;
    const previous = lastPosition.current;
    const changed = previous?.scroller !== scroller || previous.text !== text
      || previous.time !== currentTime || previous.layout !== layoutVersion;
    // 일시정지한 채 열거나 탐색해도 현재 문장으로 간다. 이후 손으로 읽는 위치는 건드리지 않는다.
    if (!playing && !changed) return;
    lastPosition.current = { scroller, text, time: currentTime, layout: layoutVersion };
    if (Date.now() < userHoldUntil.current) return;
    const marks = contentRef.current?.querySelectorAll<HTMLElement>('mark[aria-current="true"]');
    if (!marks?.length) return;
    const first = marks[0].getBoundingClientRect();
    const last = marks[marks.length - 1].getBoundingClientRect();
    const vRect = scroller.getBoundingClientRect();
    const lineH = parseFloat(getComputedStyle(marks[0]).lineHeight) || 24;
    const top = first.top - vRect.top + scroller.scrollTop;
    const bottom = last.bottom - vRect.top + scroller.scrollTop;
    const progress = active.end > active.start
      ? Math.min(1, Math.max(0, (currentTime - active.start) / (active.end - active.start)))
      : 0;
    const readPos = top + (bottom - top) * progress;
    const visibleTop = scroller.scrollTop;
    const visibleBottom = visibleTop + scroller.clientHeight;
    if (readPos < visibleTop || readPos > visibleBottom - lineH * BTM_LINES) {
      scroller.scrollTo({
        top: Math.max(0, Math.min(readPos - lineH * TOP_LINES, scroller.scrollHeight - scroller.clientHeight)),
        behavior: !previous || !playing ? "instant" : "smooth",
      });
    }
  }, [text, currentTime, playing, active, viewport, parentScroller, layoutVersion]);

  /* 사용자가 직접 스크롤하면 잠시 자동 스크롤을 쉰다 */
  useEffect(() => {
    const target = viewport === "parent" ? parentScroller : selfRef.current;
    if (!target) return;
    // 모달이 열리거나 글꼴·창 크기가 바뀌어 높이가 정해진 뒤에도 현재 위치를 맞춘다.
    const observer = new ResizeObserver(() => setLayoutVersion((version) => version + 1));
    observer.observe(target);
    if (contentRef.current) observer.observe(contentRef.current);
    const hold = () => { userHoldUntil.current = Date.now() + USER_SCROLL_HOLD_MS; };
    target.addEventListener("wheel", hold, { passive: true });
    target.addEventListener("touchmove", hold, { passive: true });
    return () => {
      observer.disconnect();
      target.removeEventListener("wheel", hold);
      target.removeEventListener("touchmove", hold);
    };
  }, [viewport, parentScroller]);

  const body = (
    <div
      ref={contentRef}
      className={viewport === "self"
        ? "break-keep pb-24 font-serif text-sm leading-[1.9] text-text-primary/90 md:text-[15px]"
        : undefined}
    >
      <ReadingHighlightText
        text={text}
        mark={mark}
        segments={segments ?? null}
        onPlayFrom={onPlayFrom}
        sentenceLabel={sentenceLabel}
        highlightClassName={highlightClassName}
        highlightStyle={highlightStyle}
      />
    </div>
  );

  if (viewport === "parent") return <div className={cn("min-w-0", className)}>{body}</div>;

  return (
    <div
      ref={selfRef}
      className={cn("relative min-w-0 overflow-y-auto", className)}
      style={{
        maxHeight: "min(420px, 52dvh)",
        maskImage: "linear-gradient(to bottom, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 90%, transparent 100%)",
      }}
    >
      {body}
    </div>
  );
}
