/*
  파일명: /components/ui/SwipeControls.tsx
  기능: 옆으로 넘기는 줄의 조작대
  책임: 바로 앞 형제인 가로 스냅 줄을 붙잡아 세 가지를 맡는다.
        지금 몇 번째 쪽인지 점으로 보이고, 좌우 단추로 옮기고, 마우스로 끌어 밀게 한다.
        가로 스크롤은 손가락과 트랙패드만 받으므로, 작은 창을 마우스로 보는 사람은
        끌어도 아무 일이 없다 — 그 자리를 이 부품이 메운다.
*/ // ------------------------------

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** 이 거리를 넘겨 끌면 누른 것이 아니라 민 것으로 본다(px) */
const DRAG_SLOP = 6;

export default function SwipeControls({
  count,
  className,
}: {
  /** 쪽 수. 1 이하면 그리지 않는다 */
  count: number;
  className?: string;
}) {
  const t = useTranslations("shared.ui.swipe");
  const anchorRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    // 넘기는 줄은 바로 앞 형제다. 구획마다 컨테이너가 ul·div로 달라 선택자로 찾지 않는다.
    const deck = anchorRef.current?.previousElementSibling as HTMLElement | null;
    deckRef.current = deck;
    if (!deck) return;

    const sync = () => {
      const page = deck.clientWidth;
      if (page <= 0) return;
      setActive(Math.max(0, Math.min(count - 1, Math.round(deck.scrollLeft / page))));
    };
    sync();
    deck.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    /* ── 마우스로 끌어 밀기 ──
       손가락은 브라우저가 알아서 굴리므로 마우스만 받는다. 끌던 중에는 스냅을 꺼야
       손을 따라오고, 놓을 때 다시 켜면 가장 가까운 쪽에 붙는다. */
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let moved = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (deck.scrollWidth <= deck.clientWidth) return;
      dragging = true;
      moved = 0;
      startX = event.clientX;
      startLeft = deck.scrollLeft;
      deck.style.scrollSnapType = "none";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      moved = Math.max(moved, Math.abs(delta));
      if (moved > DRAG_SLOP) {
        // 글자가 파랗게 잡히는 것을 막는다 — 끌기 중에는 선택이 방해다
        event.preventDefault();
        deck.scrollLeft = startLeft - delta;
      }
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      deck.style.scrollSnapType = "";
      const page = deck.clientWidth;
      if (page > 0) {
        deck.scrollTo({ left: Math.round(deck.scrollLeft / page) * page, behavior: "smooth" });
      }
    };

    // 끌어서 밀고 손을 뗀 자리가 링크 위였다고 그 링크로 가면 안 된다
    const onClickCapture = (event: MouseEvent) => {
      if (moved > DRAG_SLOP) {
        event.preventDefault();
        event.stopPropagation();
        moved = 0;
      }
    };

    deck.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    deck.addEventListener("click", onClickCapture, true);
    deck.style.cursor = "grab";

    return () => {
      deck.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      deck.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      deck.removeEventListener("click", onClickCapture, true);
      deck.style.cursor = "";
      deck.style.scrollSnapType = "";
    };
  }, [count]);

  const goTo = useCallback((index: number) => {
    const deck = deckRef.current;
    if (!deck) return;
    const bounded = Math.max(0, Math.min(count - 1, index));
    deck.scrollTo({ left: bounded * deck.clientWidth, behavior: "smooth" });
    setActive(bounded);
  }, [count]);

  if (count <= 1) return null;

  return (
    <div
      ref={anchorRef}
      // 넓은 화면에서는 줄이 격자로 풀리므로 이 조작대도 함께 사라진다
      className={cn("mt-2 flex items-center justify-center gap-1 md:hidden", className)}
    >
      <button
        type="button"
        onClick={() => goTo(active - 1)}
        disabled={active === 0}
        aria-label={t("previous")}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-accent-dim hover:bg-accent/10 hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>

      <div className="flex items-center gap-1.5 px-1">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            aria-label={t("dot", { index: index + 1, count })}
            aria-current={index === active}
            className={cn(
              "h-1.5 rounded-full",
              index === active ? "w-4 bg-accent" : "w-1.5 bg-accent-dim/45 hover:bg-accent-dim",
            )}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(active + 1)}
        disabled={active === count - 1}
        aria-label={t("next")}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-accent-dim hover:bg-accent/10 hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
