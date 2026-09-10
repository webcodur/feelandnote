"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import { Z_INDEX } from "@/constants/zIndex";
import JourneyEventExpandedList from "./JourneyEventExpandedList";

interface Props {
  open: boolean;
  events: CelebTimelineEvent[];
  title: string;
  closeLabel: string;
  onClose: () => void;
}

export default function JourneyTimelineModal({
  open,
  events,
  title,
  closeLabel,
  onClose,
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
    const hadBodyOverflowClass = document.body.classList.contains("overflow-hidden");
    document.body.style.overflow = "hidden";
    document.body.classList.add("overflow-hidden");
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!hadBodyOverflowClass) document.body.classList.remove("overflow-hidden");
      document.documentElement.style.overflow = previousRootOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-modal-title"
      data-timeline-modal
      className="fixed inset-0 bg-black/80 p-2 md:p-4"
      style={{ zIndex: Z_INDEX.modal }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-xl border border-accent-dim/30 bg-bg-main shadow-2xl shadow-black/70"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="relative flex h-12 shrink-0 items-center justify-center border-b border-white/10 bg-bg-main/95 px-12 backdrop-blur-md">
          <h2
            id="timeline-modal-title"
            className="truncate text-base font-bold text-text-primary sm:text-lg"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="absolute right-3 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/15 text-text-secondary hover:border-accent hover:text-accent"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 py-4 md:px-6 md:py-6">
          <JourneyEventExpandedList events={events} fullPage />
        </div>
      </div>
    </div>,
    document.body,
  );
}
