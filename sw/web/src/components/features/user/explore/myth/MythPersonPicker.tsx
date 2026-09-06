"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythAtlasTypes";
import { MYTH_LAYOUT as mythLayout } from "./mythLayout";

interface Props {
  people: MythPerson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface RailDragState {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  dragging: boolean;
}

/* 구성원 목록 — 사진 타일 + 아래 이름. 카드 안 텍스트(직함·소개)는 두지 않는다.
   이름은 타일 밖 아래 칸에 박는다 */
export default function MythPersonPicker({ people, selectedId, onSelect }: Props) {
  const t = useTranslations("explore.hub.myth");
  /* 조회 차례를 그대로 쓴다. 다시 줄을 세우면 전승 계보 순서가 뒤집힌다 */
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<RailDragState | null>(null);
  const suppressClickRef = useRef(false);
  const releaseClickTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const rail = scrollRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollBack(rail.scrollLeft > 4);
    setCanScrollForward(rail.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const rail = scrollRef.current;
    if (!rail) return;
    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      if (releaseClickTimerRef.current !== null) window.clearTimeout(releaseClickTimerRef.current);
    };
  }, [updateScrollState, people.length]);

  const moveRail = (direction: -1 | 1) => {
    const rail = scrollRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(224, rail.clientWidth * 0.72), behavior: "smooth" });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    if (!rail || !event.isPrimary || event.button !== 0) return;
    if (releaseClickTimerRef.current !== null) window.clearTimeout(releaseClickTimerRef.current);
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: rail.scrollLeft,
      dragging: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    const drag = dragRef.current;
    if (!rail || !drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      drag.dragging = true;
      suppressClickRef.current = true;
      setIsDragging(true);
      rail.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    rail.scrollLeft = drag.startScrollLeft - deltaX;
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = drag.dragging;
    dragRef.current = null;
    setIsDragging(false);
    if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);

    if (!wasDragging) {
      suppressClickRef.current = false;
      return;
    }

    suppressClickRef.current = true;
    releaseClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      releaseClickTimerRef.current = null;
    }, 0);
  };

  const handlePersonClick = (event: ReactMouseEvent<HTMLButtonElement>, personId: string) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onSelect(personId);
  };

  return (
    <aside className={mythLayout.rail}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <Sparkles size={16} className="text-accent" />
          {t("memberList")}
        </h3>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveRail(-1)}
            disabled={!canScrollBack}
            aria-label={t("previousMembers")}
            className="grid size-8 place-items-center rounded-full border border-white/[0.09] bg-black/20 text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/[0.09] disabled:hover:bg-black/20 disabled:hover:text-text-secondary"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => moveRail(1)}
            disabled={!canScrollForward}
            aria-label={t("nextMembers")}
            className="grid size-8 place-items-center rounded-full border border-white/[0.09] bg-black/20 text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/[0.09] disabled:hover:bg-black/20 disabled:hover:text-text-secondary"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </span>
      </div>

      <div
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        className={`scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-1 select-none touch-pan-y md:gap-3 ${isDragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x"}`}
      >
        {people.map((person) => {
          const selected = selectedId === person.id;
          /* 목록은 아바타를 쓴다. 차별은 인물을 눌렀을 때 뜨는 상세에서만 둔다 */
          const thumbUrl = person.avatarUrl ?? person.portraitUrl ?? person.imageUrl;
          return (
            <button
              key={person.id}
              type="button"
              aria-pressed={selected}
              onClick={(event) => handlePersonClick(event, person.id)}
              className={`group flex shrink-0 snap-start flex-col text-center ${mythLayout.railCardSize}`}
            >
              <span className={`relative aspect-square w-full overflow-hidden rounded-[14px] border ${selected ? "border-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : "border-white/[0.07] bg-bg-card hover:border-accent/60"}`}>
                {thumbUrl ? (
                  <Image src={thumbUrl} alt="" fill unoptimized draggable={false} sizes="(max-width: 767px) 96px, 108px" className="object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: "none" }} />
                ) : (
                  <span aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-accent">{person.name.slice(0, 1)}</span>
                )}
              </span>
              <span className="mt-2 block min-h-10 px-0.5">
                <span className={`block break-keep text-[13px] font-bold leading-5 line-clamp-2 ${selected ? "text-accent" : "text-text-primary group-hover:text-accent"}`}>{person.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
