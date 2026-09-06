"use client";

import {
  useCallback,
  useEffect,
  useId,
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
  traditionId?: string;
  layout?: "rail" | "sidebar";
}

interface RailDragState {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  dragging: boolean;
}

export default function MythPersonPicker({ people, selectedId, onSelect, traditionId, layout = "sidebar" }: Props) {
  const t = useTranslations("explore.hub.myth");
  /* 조회가 넘긴 차례를 그대로 쓴다. 전에는 연결 작품 수로 다시 줄을 세워서
     전승마다 잡아 둔 계보·이야기 순서가 화면에서 통째로 뒤집혔다 */
  const visible = people;
  const isRail = layout === "rail";
  const railId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<RailDragState | null>(null);
  const suppressClickRef = useRef(false);
  const releaseClickTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const rail = scrollRef.current;
    if (!rail || !isRail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollBack(rail.scrollLeft > 4);
    setCanScrollForward(rail.scrollLeft < maxScroll - 4);
  }, [isRail]);

  useEffect(() => {
    const rail = scrollRef.current;
    if (!rail || !isRail) return;
    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [isRail, updateScrollState, visible.length]);

  useEffect(() => () => {
    if (releaseClickTimerRef.current !== null) window.clearTimeout(releaseClickTimerRef.current);
  }, []);

  const moveRail = (direction: -1 | 1) => {
    const rail = scrollRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(224, rail.clientWidth * 0.72), behavior: "smooth" });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    if (!isRail || !rail || !event.isPrimary || event.button !== 0) return;
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
    <aside className={isRail
      ? mythLayout.rail
      : "order-1 min-w-0 border-b border-white/[0.06] bg-black/[0.12] p-5 lg:order-none lg:border-b-0 lg:border-e lg:p-6"}
    >
      <div className={`flex items-center justify-between gap-3 ${isRail ? "mb-3 px-1" : "mb-4"}`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <Sparkles size={16} className="text-accent" />
          {t("memberList")}
        </h3>
        <div className="flex items-center gap-2">
          {isRail && (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveRail(-1)}
                disabled={!canScrollBack}
                aria-controls={railId}
                aria-label={t("previousMembers")}
                className="grid size-8 place-items-center rounded-full border border-white/[0.09] bg-black/20 text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/[0.09] disabled:hover:bg-black/20 disabled:hover:text-text-secondary"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => moveRail(1)}
                disabled={!canScrollForward}
                aria-controls={railId}
                aria-label={t("nextMembers")}
                className="grid size-8 place-items-center rounded-full border border-white/[0.09] bg-black/20 text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/[0.09] disabled:hover:bg-black/20 disabled:hover:text-text-secondary"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </span>
          )}
        </div>
      </div>

      <div
        ref={isRail ? scrollRef : undefined}
        id={isRail ? railId : undefined}
        onPointerDown={isRail ? handlePointerDown : undefined}
        onPointerMove={isRail ? handlePointerMove : undefined}
        onPointerUp={isRail ? finishPointerDrag : undefined}
        onPointerCancel={isRail ? finishPointerDrag : undefined}
        className={isRail
        ? `scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-3 select-none touch-pan-y md:gap-3 ${isDragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x"}`
        : "scrollbar-hide -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:max-h-[560px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-0"}
      >
        {visible.map((person) => {
          const selected = selectedId === person.id;
          const appearance = traditionId
            ? person.appearances.find((item) => item.traditionId === traditionId)?.summary
            : null;
          const context = appearance ?? person.headline ?? person.summary;
          const className = `group relative flex shrink-0 snap-start overflow-hidden rounded-[16px] border text-start ${isRail ? mythLayout.railCardSize : "h-[104px] w-[230px] lg:h-14 lg:w-full"} ${selected ? "border-accent bg-accent/10 shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : "border-white/[0.07] bg-bg-card hover:border-accent/60 hover:bg-white/[0.035]"}`;

          return (
            <button key={person.id} type="button" aria-pressed={selected} onClick={(event) => handlePersonClick(event, person.id)} className={className}>
              <span className={`relative h-full w-[76px] shrink-0 overflow-hidden bg-bg-card md:w-[86px] ${!isRail ? "lg:w-14" : ""}`}>
                {person.avatarUrl ? (
                  <Image src={person.avatarUrl} alt="" fill unoptimized draggable={false} sizes="(max-width: 1023px) 76px, 86px" className="object-cover" style={{ filter: "none" }} />
                ) : (
                  <span className="flex h-full items-center justify-center text-lg font-black text-accent">{person.name.slice(0, 1)}</span>
                )}
              </span>
              <span className={`min-w-0 flex-1 p-3 ${!isRail ? "lg:flex lg:h-full lg:flex-col lg:justify-center lg:px-3 lg:py-0" : ""}`}>
                <span className={`block truncate text-sm font-bold ${selected ? "text-accent" : "text-text-primary"}`}>{person.name}</span>
                {person.title && <span className="mt-0.5 block truncate text-xs font-semibold text-text-tertiary">{person.title}</span>}
                {context && <span className="mt-2 block line-clamp-2 break-keep text-xs leading-5 text-text-secondary">{context}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
