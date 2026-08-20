/*
  파일명: /components/ui/SnapCarousel.tsx
  기능: 옆으로 넘겨보는 묶음
  책임: 좁은 자리에 여러 장을 세로로 쌓지 않고 옆으로 넘겨 보게 한다.
        Carousel 하나로 낱장 배치·겹쳐 놓은 넘김 단추·현재 위치 점·키보드 조작을 함께 제공한다.
        useSnapCarousel은 바깥에서 위치를 직접 쥐어야 할 때만 쓴다.
*/ // ------------------------------

"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** 가로 스냅 스크롤 묶음의 현재 위치를 추적하고 특정 장으로 보낸다 */
export function useSnapCarousel(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  /**
   * 단추로 옮기는 동안에는 위치 추적을 멈춘다.
   * 부드럽게 미끄러지는 중간 위치로 다시 계산하면 번호가 앞뒤로 오락가락한다.
   */
  const movingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollTo = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(count - 1, nextIndex));
    const container = ref.current;
    const target = container?.children[boundedIndex] as HTMLElement | undefined;
    if (!container || !target) return;

    movingRef.current = true;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      movingRef.current = false;
    }, 500);

    container.scrollTo({
      left:
        target.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft,
      behavior: "smooth",
    });
    setActiveIndex(boundedIndex);
  };

  const syncIndex = () => {
    const container = ref.current;
    if (!container || movingRef.current) return;

    const containerLeft = container.getBoundingClientRect().left;
    const cards = Array.from(container.children) as HTMLElement[];
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(
        card.getBoundingClientRect().left - containerLeft,
      );
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    // 끝까지 밀었는데 마지막 장이 다 안 들어오는 경우 — 번호는 마지막으로 둔다
    if (
      container.scrollLeft + container.clientWidth >=
      container.scrollWidth - 2
    ) {
      closestIndex = cards.length - 1;
    }

    setActiveIndex((current) =>
      current === closestIndex ? current : closestIndex,
    );
  };

  return { ref, activeIndex, scrollTo, syncIndex };
}

/** 넘겨보는 묶음의 이름표 줄. 이름을 누르면 그 장으로 간다 */
export function CarouselTabs({
  activeIndex,
  labels,
  onSelect,
  className,
}: {
  activeIndex: number;
  labels: string[];
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-stretch gap-1", className)}>
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(index)}
          aria-current={index === activeIndex}
          className={cn(
            "min-w-0 flex-1 truncate rounded-md px-1 py-2 font-serif text-base",
            index === activeIndex
              ? "bg-accent/[0.1] font-bold text-accent"
              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** 지금 몇 번째 장인지 알리는 점 줄. 점을 누르면 그 장으로 간다 */
export function CarouselDots({
  activeIndex,
  count,
  onSelect,
  label,
  className,
}: {
  activeIndex: number;
  count: number;
  onSelect: (index: number) => void;
  /** 점 하나하나의 읽어주기 이름 — (순번, 전체)를 받는다 */
  label: (index: number, count: number) => string;
  className?: string;
}) {
  if (count <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={label(index + 1, count)}
          aria-current={index === activeIndex}
          className={cn(
            "h-2 rounded-full border",
            index === activeIndex
              ? "w-6 border-accent bg-accent"
              : "w-2 border-white/25 bg-white/15 hover:border-white/50 hover:bg-white/40",
          )}
        />
      ))}
    </div>
  );
}

interface CarouselProps {
  /** 낱장들. 각 장은 이 컴포넌트가 같은 폭으로 감싸 배치한다 */
  children: ReactNode[];
  labels: {
    previous: string;
    next: string;
    /** 점 하나의 읽어주기 이름 */
    dot: (index: number, count: number) => string;
  };
  /**
   * 낱장 하나의 폭. 기본은 한 장씩 꽉 채워 넘기기.
   * 여러 장을 늘어놓고 넘기려면 `w-[148px]`처럼 고정 폭을 준다.
   */
  itemWidthClassName?: string;
  gapClassName?: string;
  /** 한 장만 보이는 캐러셀에서 화면 밖 슬라이드의 포커스와 접근성을 막는다. */
  isolateInactiveSlides?: boolean;
  /** 현재 위치 점 줄. 이름표 줄(tabLabels)을 쓰면 자동으로 꺼진다 */
  showDots?: boolean;
  /** 장마다 이름이 있을 때. 점 대신 이름표 줄이 위에 붙는다 */
  tabLabels?: string[];
  /**
   * 넘김 단추를 놓는 자리.
   * `center`는 낱장 한가운데 좌우에 겹쳐 놓고, `top`은 낱장 제목 줄 높이의 좌우 끝에 놓는다.
   * 낱장이 제 제목을 품고 있어 바깥 제목 줄(header)을 쓸 수 없을 때 `top`을 쓴다.
   */
  arrowsAlign?: "center" | "top";
  /**
   * 제목 줄. 주면 넘김 단추가 낱장 위가 아니라 이 줄 오른쪽 끝에 붙는다.
   * 낱장 좌우에 단추 자리를 비워 둘 필요가 없어진다.
   */
  header?: ReactNode;
  headerClassName?: string;
  className?: string;
  trackClassName?: string;
  tabsClassName?: string;
}

export function Carousel({
  children,
  labels,
  itemWidthClassName = "w-full",
  gapClassName = "gap-2",
  isolateInactiveSlides = false,
  showDots = true,
  tabLabels,
  arrowsAlign = "center",
  header,
  headerClassName,
  className,
  trackClassName,
  tabsClassName,
}: CarouselProps) {
  const count = children.length;
  const { ref, activeIndex, scrollTo, syncIndex } = useSnapCarousel(count);
  const atStart = activeIndex === 0;
  const atEnd = activeIndex >= count - 1;
  const arrowsInHeader = Boolean(header);

  const arrowButton = (direction: "previous" | "next") => {
    const disabled = direction === "previous" ? atStart : atEnd;
    return (
      <button
        type="button"
        onClick={() => scrollTo(activeIndex + (direction === "next" ? 1 : -1))}
        disabled={disabled}
        aria-label={labels[direction]}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-text-primary hover:border-accent hover:bg-accent/15 hover:text-accent disabled:cursor-default disabled:opacity-25"
      >
        {direction === "previous" ? (
          <ChevronLeft size={16} aria-hidden />
        ) : (
          <ChevronRight size={16} aria-hidden />
        )}
      </button>
    );
  };

  return (
    <div className={cn("min-w-0", className)}>
      {header ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">{header}</div>
          {count > 1 ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {arrowButton("previous")}
              {arrowButton("next")}
            </div>
          ) : null}
        </div>
      ) : null}
      {tabLabels && tabLabels.length > 1 ? (
        <CarouselTabs
          activeIndex={activeIndex}
          labels={tabLabels}
          onSelect={scrollTo}
          className={cn("mb-3", tabsClassName)}
        />
      ) : null}

      <div className="relative">
        <div
          ref={ref}
          onScroll={syncIndex}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollTo(activeIndex + 1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollTo(activeIndex - 1);
            }
          }}
          tabIndex={count > 1 ? 0 : -1}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide focus-visible:outline-none",
            gapClassName,
            trackClassName,
          )}
        >
          {children.map((child, index) => {
            const isolated = isolateInactiveSlides && index !== activeIndex;
            return (
              <div
                key={index}
                aria-hidden={isolated || undefined}
                inert={isolated}
                className={cn("shrink-0 snap-start", itemWidthClassName)}
              >
                {child}
              </div>
            );
          })}
        </div>

        {/* 제목 줄에 단추를 올린 경우에는 낱장 위에 겹치지 않는다 */}
        {count > 1 && !arrowsInHeader && arrowsAlign === "top" ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-between px-2 md:top-4 md:px-3">
            <span className="pointer-events-auto">
              {arrowButton("previous")}
            </span>
            <span className="pointer-events-auto">{arrowButton("next")}</span>
          </div>
        ) : null}

        {count > 1 && !arrowsInHeader && arrowsAlign === "center" ? (
          <>
            <button
              type="button"
              onClick={() => scrollTo(activeIndex - 1)}
              aria-label={labels.previous}
              aria-hidden={atStart}
              tabIndex={atStart ? -1 : 0}
              className={cn(
                "absolute start-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-bg-main/95 text-text-primary shadow-[0_2px_14px_rgba(0,0,0,0.55)] backdrop-blur-sm hover:border-accent hover:bg-accent/20 hover:text-accent",
                atStart && "pointer-events-none opacity-0",
              )}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(activeIndex + 1)}
              aria-label={labels.next}
              aria-hidden={atEnd}
              tabIndex={atEnd ? -1 : 0}
              className={cn(
                "absolute end-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-bg-main/95 text-text-primary shadow-[0_2px_14px_rgba(0,0,0,0.55)] backdrop-blur-sm hover:border-accent hover:bg-accent/20 hover:text-accent",
                atEnd && "pointer-events-none opacity-0",
              )}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {showDots && !tabLabels ? (
        <CarouselDots
          activeIndex={activeIndex}
          count={count}
          onSelect={scrollTo}
          label={labels.dot}
          className="mt-3"
        />
      ) : null}
    </div>
  );
}
