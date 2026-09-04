/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 원전 소개글(펼침 모달)
 * - 목차 위치: sourceWorks
 * - 데이터: description/label/sourceTitle props
 * - 함께 보기: FigureBookFeature.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import FormattedText from "@/components/ui/FormattedText";
import { Z_INDEX } from "@/constants/zIndex";

interface FigureBookIntroductionProps {
  description: string;
  label: string;
  sourceTitle: string;
}

export default function FigureBookIntroduction({
  description,
  label,
  sourceTitle,
}: FigureBookIntroductionProps) {
  const t = useTranslations("celebPage");
  const previewRef = useRef<HTMLParagraphElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  /* ── 1. 넘침 측정 ── */
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const measure = () => {
      setIsOverflowing(preview.scrollHeight > preview.clientHeight + 1);
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(preview);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [description]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <div className="engraved-plate mt-5 border-s-2 border-accent px-4 py-3">
      <p className="text-sm font-black tracking-[0.16em] text-accent">{label}</p>
      <p
        ref={previewRef}
        className="mt-2 max-h-28 overflow-hidden whitespace-pre-line text-base leading-7 text-text-secondary"
      >
        <FormattedText text={description} />
      </p>
      {isOverflowing ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
          className="mt-2 min-h-10 border-b border-accent-dim pb-1 text-sm font-black text-accent hover:border-accent-hover hover:text-accent-hover active:text-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("sourceWorkIntroductionOpen")}
        </button>
      ) : null}

      {isOpen ? (
        <IntroductionModal
          description={description}
          label={label}
          sourceTitle={sourceTitle}
          closeLabel={t("sourceWorkIntroductionClose")}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
}

/* ── 2. 전체 보기 모달 ── */
function IntroductionModal({
  description,
  label,
  sourceTitle,
  closeLabel,
  onClose,
}: {
  description: string;
  label: string;
  sourceTitle: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      event.preventDefault();
      closeRef.current?.focus();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm animate-modal-overlay"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden border border-accent-dim/60 bg-bg-card shadow-2xl animate-modal-content"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grid shrink-0 grid-cols-[1fr_auto] items-start gap-4 border-b border-stone-light bg-bg-secondary bg-texture-marble px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="text-sm font-black tracking-[0.16em] text-accent">{label}</p>
            <h2 id={titleId} className="mt-1 text-xl font-black text-text-primary sm:text-2xl">
              {sourceTitle}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex size-10 items-center justify-center border border-stone-light bg-bg-card text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-texture-noise px-5 py-6 [overflow-anchor:none] sm:px-8 sm:py-8">
          <p className="whitespace-pre-wrap break-words text-base leading-8 text-text-primary">
            <FormattedText text={description} />
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
