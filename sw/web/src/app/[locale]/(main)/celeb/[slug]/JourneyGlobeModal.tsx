"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  open: boolean;
  globe: ReactNode;
  event: CelebTimelineEvent | undefined;
  yearLabel: string | null;
  markerOrder?: number;
  current: number;
  total: number;
  pageLabel: string;
  title: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/** 전체화면 지구본과 현재 행적을 한 장면으로 묶는 포털 모달. */
export default function JourneyGlobeModal({
  open,
  globe,
  event,
  yearLabel,
  markerOrder,
  current,
  total,
  pageLabel,
  title,
  closeLabel,
  previousLabel,
  nextLabel,
  onClose,
  onPrevious,
  onNext,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        onClose();
        return;
      }
      if (keyboardEvent.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault();
        last.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 bg-[#020405]/96"
      style={{ zIndex: Z_INDEX.modal }}
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-2 overflow-hidden rounded border border-accent-dim/30 bg-[#05080a] md:inset-3">
        {globe}
      </div>

      {/* 가장자리만 눌러 지도가 화면 바깥으로 흩어져 보이지 않게 한다. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-24">
        <span className="truncate rounded border border-white/10 bg-black/60 px-4 py-2 font-serif text-base font-semibold tracking-wide text-text-primary backdrop-blur-md md:text-lg">
          {title}
        </span>
      </div>

      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-14 top-3 z-40 flex h-9 w-9 items-center justify-center rounded border border-accent-dim/45 bg-black/75 text-text-secondary backdrop-blur-md hover:border-accent hover:text-accent cursor-pointer md:right-[4.5rem]"
        aria-label={closeLabel}
      >
        <X size={18} aria-hidden />
      </button>

      <aside
        aria-live="polite"
        className="absolute inset-x-3 bottom-3 z-30 overflow-hidden rounded border border-accent/35 bg-[#080b0d]/94 shadow-2xl shadow-black/70 backdrop-blur-xl md:bottom-5 md:left-5 md:right-auto md:w-[440px]"
      >
        <div className="flex items-center gap-2 border-b border-accent-dim/20 px-2.5 py-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={current <= 0}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/5 hover:text-accent disabled:pointer-events-none disabled:opacity-20 cursor-pointer"
            aria-label={previousLabel}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>

          <span className="min-w-0 flex-1 truncate text-center font-mono text-[11px] tracking-wide text-text-secondary/75">
            {pageLabel}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={current >= total - 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/5 hover:text-accent disabled:pointer-events-none disabled:opacity-20 cursor-pointer"
            aria-label={nextLabel}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>

        {event && (
          <div className="max-h-[36vh] overflow-y-auto px-4 py-4 custom-scrollbar md:max-h-[46vh] md:px-5">
            <div className="flex items-baseline gap-2">
              {yearLabel && (
                <span className="shrink-0 font-mono text-base text-accent">
                  {yearLabel}
                </span>
              )}
              <h3 className="min-w-0 font-serif text-lg font-bold leading-snug text-text-primary md:text-xl">
                {event.title}
              </h3>
            </div>

            {event.placeName && (
              <p className="mt-2.5 flex items-center gap-1.5 text-sm text-text-secondary">
                <MapPin size={14} className="shrink-0 text-accent/75" aria-hidden />
                <span>{event.placeName}</span>
                {markerOrder != null && (
                  <span className="font-mono text-[11px] text-accent/65">
                    #{markerOrder}
                  </span>
                )}
              </p>
            )}

            {event.description && (
              <p className="mt-2.5 text-[15px] leading-[1.75] text-text-secondary break-keep">
                {event.description}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
